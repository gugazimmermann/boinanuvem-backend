import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/common/services/prisma.service';
import * as bcrypt from 'bcrypt';
import {
  createTestCompany,
  cleanupTestData,
  createTestPayment,
} from './test-utils';

describe('Authentication with Subscription Model (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let testCompany: any;
  let testUser: any;
  let testSubscription: any;
  let testPlan: any;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    prisma = moduleFixture.get<PrismaService>(PrismaService);

    await app.init();
  });

  beforeEach(async () => {
    await cleanupTestData(prisma);

    // Create test company with subscription
    const testData = await createTestCompany(prisma, {
      companyName: 'E2E Test Company',
      email: 'e2e@testcompany.com',
      cnpj: '98.765.432/0001-10',
      planName: 'Avançado',
      isTrial: true,
    });

    testCompany = testData.company;
    testUser = testData.user;
    testSubscription = testData.subscription;
    testPlan = testData.plan;
  });

  afterAll(async () => {
    await cleanupTestData(prisma);
    await prisma.$disconnect();
    await app.close();
  });

  describe('POST /auth/login', () => {
    it('should login and return enhanced company data with subscription info', async () => {
      // Login should now work since we fixed password hashing in createTestCompany
      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: testUser.email,
          password: 'password123',
        })
        .expect(200);

      expect(loginResponse.body).toHaveProperty('access_token');
      expect(loginResponse.body).toHaveProperty('refresh_token');
      expect(loginResponse.body).toHaveProperty('user');

      const { user } = loginResponse.body;
      expect(user).toHaveProperty('id', testUser.id);
      expect(user).toHaveProperty('email', testUser.email);
      expect(user).toHaveProperty('companyId', testCompany.id);
      expect(user).toHaveProperty('permissions');
      expect(user).toHaveProperty('company');

      // Check company has enhanced data
      const { company } = user;
      expect(company).toHaveProperty('id', testCompany.id);
      expect(company).toHaveProperty('trial');
      expect(company).toHaveProperty('currentPlan');
      expect(company).toHaveProperty('currentSubscription');

      // Check trial information
      const { trial } = company;
      expect(trial).toHaveProperty('isOnTrial', true);
      expect(trial).toHaveProperty('isTrialExpired', false);
      expect(trial).toHaveProperty('trialDaysRemaining');
      expect(trial).toHaveProperty('trialStatus', 'active');
      expect(trial.trialDaysRemaining).toBeGreaterThan(0);

      // Check current plan (should be Avançado for trial)
      const { currentPlan } = company;
      expect(currentPlan).toHaveProperty('id', testPlan.id);
      expect(currentPlan).toHaveProperty('name', 'Avançado');

      // Check current subscription
      const { currentSubscription } = company;
      expect(currentSubscription).toHaveProperty('id', testSubscription.id);
      expect(currentSubscription).toHaveProperty('status', 'trial');
      expect(currentSubscription).toHaveProperty('isTrial', true);
      expect(currentSubscription).toHaveProperty('isActive', true);
    });
  });

  describe('POST /auth/refresh', () => {
    it('should refresh token and return enhanced company data', async () => {
      // First login to get tokens
      const hashedPassword = await bcrypt.hash('password123', 12);

      await prisma.user.update({
        where: { id: testUser.id },
        data: { password: hashedPassword },
      });

      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: testUser.email,
          password: 'password123',
        })
        .expect(200);

      const { refresh_token } = loginResponse.body;

      // Test refresh token
      const refreshResponse = await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({
          refresh_token,
        })
        .expect(200);

      expect(refreshResponse.body).toHaveProperty('access_token');
      expect(refreshResponse.body).toHaveProperty('refresh_token');
      expect(refreshResponse.body).toHaveProperty('user');

      const { user } = refreshResponse.body;
      expect(user.company).toHaveProperty('trial');
      expect(user.company).toHaveProperty('currentPlan');
      expect(user.company).toHaveProperty('currentSubscription');
    });
  });

  describe('GET /users/me', () => {
    let accessToken: string;

    beforeEach(async () => {
      const hashedPassword = await bcrypt.hash('password123', 12);

      await prisma.user.update({
        where: { id: testUser.id },
        data: { password: hashedPassword },
      });

      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: testUser.email,
          password: 'password123',
        })
        .expect(200);

      accessToken = loginResponse.body.access_token;
    });

    it('should return current user with enhanced company data', async () => {
      const response = await request(app.getHttpServer())
        .get('/users/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('id', testUser.id);
      expect(response.body).toHaveProperty('company');

      const { company } = response.body;
      expect(company).toHaveProperty('trial');
      expect(company).toHaveProperty('currentPlan');
      expect(company).toHaveProperty('currentSubscription');

      // Verify trial information is correct
      expect(company.trial.isOnTrial).toBe(true);
      expect(company.trial.trialStatus).toBe('active');
      expect(company.currentPlan.name).toBe('Avançado');
      expect(company.currentSubscription.isTrial).toBe(true);
    });
  });

  describe('GET /companies/:id', () => {
    let accessToken: string;

    beforeEach(async () => {
      const hashedPassword = await bcrypt.hash('password123', 12);

      await prisma.user.update({
        where: { id: testUser.id },
        data: { password: hashedPassword },
      });

      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: testUser.email,
          password: 'password123',
        })
        .expect(200);

      accessToken = loginResponse.body.access_token;
    });

    it('should return company with subscriptions and payments', async () => {
      // Create a test payment
      await createTestPayment(prisma, testCompany.id, testSubscription.id);

      const response = await request(app.getHttpServer())
        .get(`/companies/${testCompany.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('id', testCompany.id);
      expect(response.body).toHaveProperty('subscriptions');
      expect(response.body).toHaveProperty('payments');
      expect(response.body).toHaveProperty('trial');
      expect(response.body).toHaveProperty('currentPlan');
      expect(response.body).toHaveProperty('currentSubscription');

      // Check subscriptions array
      expect(response.body.subscriptions).toHaveLength(1);
      expect(response.body.subscriptions[0]).toHaveProperty(
        'id',
        testSubscription.id,
      );
      expect(response.body.subscriptions[0]).toHaveProperty('plan');
      expect(response.body.subscriptions[0].plan.name).toBe('Avançado');

      // Check payments array
      expect(response.body.payments).toHaveLength(1);
      expect(response.body.payments[0]).toHaveProperty(
        'companyId',
        testCompany.id,
      );
      expect(response.body.payments[0]).toHaveProperty(
        'subscriptionId',
        testSubscription.id,
      );
    });
  });

  describe('Subscription Management', () => {
    let accessToken: string;

    beforeEach(async () => {
      const hashedPassword = await bcrypt.hash('password123', 12);

      await prisma.user.update({
        where: { id: testUser.id },
        data: { password: hashedPassword },
      });

      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: testUser.email,
          password: 'password123',
        })
        .expect(200);

      accessToken = loginResponse.body.access_token;
    });

    it('should handle trial expiration correctly', async () => {
      // Manually expire the trial
      await prisma.company.update({
        where: { id: testCompany.id },
        data: {
          trialEndDate: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
        },
      });

      await prisma.companySubscription.update({
        where: { id: testSubscription.id },
        data: {
          trialEndDate: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
        },
      });

      // Get user profile to trigger trial status update
      const response = await request(app.getHttpServer())
        .get('/users/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      const { company } = response.body;
      expect(company.trial.isTrialExpired).toBe(true);
      expect(company.trial.trialDaysRemaining).toBe(0);
    });

    it('should show correct plan limits and features', async () => {
      const response = await request(app.getHttpServer())
        .get(`/companies/${testCompany.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      const { currentPlan } = response.body;
      expect(currentPlan).toHaveProperty('limits');
      expect(currentPlan).toHaveProperty('features');
      expect(currentPlan.limits).toHaveProperty('properties');
      expect(currentPlan.limits).toHaveProperty('locations');
      expect(currentPlan.limits).toHaveProperty('animals');
      expect(currentPlan.limits).toHaveProperty('members');
    });
  });
});
