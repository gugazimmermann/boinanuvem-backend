import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/common/services/prisma.service';
import { EmailService } from '../src/email/email.service';
import {
  createTestCompany,
  cleanupTestData,
  createTestPayment,
} from './test-utils';

describe('Payments Management Flow (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let testCompany: any;
  let testUser: any;
  let regularUser: any;
  let mainUserToken: string;
  let regularUserToken: string;
  let subscription: any;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(EmailService)
      .useValue({
        sendEmailVerification: jest.fn().mockResolvedValue(undefined),
        sendPasswordReset: jest.fn().mockResolvedValue(undefined),
        sendWelcomeEmail: jest.fn().mockResolvedValue(undefined),
        sendTeamMemberInvitation: jest.fn().mockResolvedValue(undefined),
        sendEmail: jest.fn().mockResolvedValue(undefined),
      })
      .compile();

    app = moduleFixture.createNestApplication();
    prisma = moduleFixture.get<PrismaService>(PrismaService);

    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    await app.init();
  });

  beforeEach(async () => {
    await cleanupTestData(prisma);

    // Create test company with main user
    const testData = await createTestCompany(prisma, {
      companyName: 'Payments Test Company',
      email: 'payments@testcompany.com',
      cnpj: '11.222.333/0001-55',
      planName: 'Avançado',
      isTrial: true,
    });

    testCompany = testData.company;
    testUser = testData.user;
    subscription = testData.subscription;

    // Activate the user for testing
    await prisma.user.update({
      where: { id: testUser.id },
      data: {
        status: 'active',
        emailVerifiedAt: new Date(),
      },
    });

    // Login to get auth token
    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: testUser.email,
        password: 'password123',
      })
      .expect(200);

    mainUserToken = loginResponse.body.access_token;

    // Create a regular user (non-main user)
    const hashedPassword = await require('bcrypt').hash('password123', 10);
    regularUser = await prisma.user.create({
      data: {
        name: 'Regular User',
        email: 'regular@testcompany.com',
        phone: '(47) 88888-8888',
        password: hashedPassword,
        companyId: testCompany.id,
        mainUser: false,
        status: 'active',
        emailVerifiedAt: new Date(),
      },
    });

    const regularLoginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: regularUser.email,
        password: 'password123',
      })
      .expect(200);

    regularUserToken = regularLoginResponse.body.access_token;
  });

  afterAll(async () => {
    await cleanupTestData(prisma);
    await app.close();
  });

  describe('GET /payments/company/:companyId', () => {
    beforeEach(async () => {
      // Create test payments
      await createTestPayment(prisma, testCompany.id, subscription.id, {
        amount: 99.0,
        status: 'pending',
      });
      await createTestPayment(prisma, testCompany.id, subscription.id, {
        amount: 149.9,
        status: 'paid',
      });
    });

    it('should return company payments for main user', async () => {
      const response = await request(app.getHttpServer())
        .get(`/payments/company/${testCompany.id}`)
        .set('Authorization', `Bearer ${mainUserToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(2);
      expect(response.body[0]).toHaveProperty('id');
      expect(response.body[0]).toHaveProperty('amount');
      expect(response.body[0]).toHaveProperty('status');
    });

    it('should return company payments for non-main user', async () => {
      // Non-main users can view company payments
      const response = await request(app.getHttpServer())
        .get(`/payments/company/${testCompany.id}`)
        .set('Authorization', `Bearer ${regularUserToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should fail for different company', async () => {
      // Create another company
      const otherTestData = await createTestCompany(prisma, {
        companyName: 'Other Test Company',
        email: 'other@testcompany.com',
        cnpj: '22.333.444/0001-66',
        planName: 'Avançado',
        isTrial: true,
      });

      await prisma.user.update({
        where: { id: otherTestData.user.id },
        data: {
          status: 'active',
          emailVerifiedAt: new Date(),
        },
      });

      const otherLoginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: otherTestData.user.email,
          password: 'password123',
        })
        .expect(200);

      const otherToken = otherLoginResponse.body.access_token;

      await request(app.getHttpServer())
        .get(`/payments/company/${testCompany.id}`)
        .set('Authorization', `Bearer ${otherToken}`)
        .expect(403);
    });
  });

  describe('GET /payments/:id', () => {
    let paymentId: string;

    beforeEach(async () => {
      const payment = await createTestPayment(
        prisma,
        testCompany.id,
        subscription.id,
        {
          amount: 99.0,
          status: 'pending',
        },
      );
      paymentId = payment.id;
    });

    it('should return payment details for authorized user', async () => {
      const response = await request(app.getHttpServer())
        .get(`/payments/${paymentId}`)
        .set('Authorization', `Bearer ${mainUserToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        id: paymentId,
        companyId: testCompany.id,
        status: 'pending',
      });
      // Amount is returned as string (Decimal type)
      expect(response.body.amount).toBe('99');
    });

    it('should return 403 for different company payment', async () => {
      // Create another company with payment
      const otherTestData = await createTestCompany(prisma, {
        companyName: 'Other Test Company',
        email: 'other@testcompany.com',
        cnpj: '22.333.444/0001-66',
        planName: 'Avançado',
        isTrial: true,
      });

      await prisma.user.update({
        where: { id: otherTestData.user.id },
        data: {
          status: 'active',
          emailVerifiedAt: new Date(),
        },
      });

      const otherLoginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: otherTestData.user.email,
          password: 'password123',
        })
        .expect(200);

      const otherToken = otherLoginResponse.body.access_token;

      await request(app.getHttpServer())
        .get(`/payments/${paymentId}`)
        .set('Authorization', `Bearer ${otherToken}`)
        .expect(403);
    });

    it('should return 404 for non-existent payment', async () => {
      await request(app.getHttpServer())
        .get('/payments/non-existent-id')
        .set('Authorization', `Bearer ${mainUserToken}`)
        .expect(404);
    });
  });

  describe('POST /payments', () => {
    const createPaymentDto = {
      companyId: '', // Will be set in each test
      subscriptionId: '', // Will be set in each test
      amount: 99.0,
      currency: 'BRL',
      paymentMethod: 'credit_card',
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      description: 'Monthly subscription payment',
    };

    it('should create a payment successfully (main user)', async () => {
      const dto = {
        ...createPaymentDto,
        companyId: testCompany.id,
        subscriptionId: subscription.id,
      };

      const response = await request(app.getHttpServer())
        .post('/payments')
        .set('Authorization', `Bearer ${mainUserToken}`)
        .send(dto)
        .expect(201);

      expect(response.body).toMatchObject({
        companyId: testCompany.id,
        currency: dto.currency,
        status: 'pending',
      });
      // Amount is returned as string (Decimal type)
      expect(response.body.amount).toBe('99');
      expect(response.body.id).toBeDefined();
      expect(response.body.createdAt).toBeDefined();
    });

    it('should fail for non-main user', async () => {
      const dto = {
        ...createPaymentDto,
        companyId: testCompany.id,
        subscriptionId: subscription.id,
      };

      await request(app.getHttpServer())
        .post('/payments')
        .set('Authorization', `Bearer ${regularUserToken}`)
        .send(dto)
        .expect(403);
    });

    it('should validate required fields', async () => {
      await request(app.getHttpServer())
        .post('/payments')
        .set('Authorization', `Bearer ${mainUserToken}`)
        .send({ amount: 99.0 }) // Missing required fields
        .expect(400);
    });

    it('should validate amount is positive', async () => {
      const dto = {
        ...createPaymentDto,
        companyId: testCompany.id,
        subscriptionId: subscription.id,
        amount: -10,
      };

      await request(app.getHttpServer())
        .post('/payments')
        .set('Authorization', `Bearer ${mainUserToken}`)
        .send(dto)
        .expect(400);
    });
  });

  describe('PUT /payments/:id', () => {
    let paymentId: string;

    beforeEach(async () => {
      const payment = await createTestPayment(
        prisma,
        testCompany.id,
        subscription.id,
        {
          amount: 99.0,
          status: 'pending',
        },
      );
      paymentId = payment.id;
    });

    it('should update payment status (main user)', async () => {
      const updateDto = {
        status: 'paid',
      };

      const response = await request(app.getHttpServer())
        .put(`/payments/${paymentId}`)
        .set('Authorization', `Bearer ${mainUserToken}`)
        .send(updateDto)
        .expect(200);

      expect(response.body).toMatchObject({
        id: paymentId,
        status: 'paid',
      });
    });

    it('should fail for non-main user', async () => {
      const updateDto = {
        status: 'paid',
      };

      await request(app.getHttpServer())
        .put(`/payments/${paymentId}`)
        .set('Authorization', `Bearer ${regularUserToken}`)
        .send(updateDto)
        .expect(403);
    });

    it('should return 404 for non-existent payment', async () => {
      await request(app.getHttpServer())
        .put('/payments/non-existent-id')
        .set('Authorization', `Bearer ${mainUserToken}`)
        .send({ status: 'paid' })
        .expect(404);
    });

    it('should return 403 for different company payment', async () => {
      // Create another company
      const otherTestData = await createTestCompany(prisma, {
        companyName: 'Other Test Company',
        email: 'other@testcompany.com',
        cnpj: '22.333.444/0001-66',
        planName: 'Avançado',
        isTrial: true,
      });

      await prisma.user.update({
        where: { id: otherTestData.user.id },
        data: {
          status: 'active',
          emailVerifiedAt: new Date(),
        },
      });

      const otherLoginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: otherTestData.user.email,
          password: 'password123',
        })
        .expect(200);

      const otherToken = otherLoginResponse.body.access_token;

      await request(app.getHttpServer())
        .put(`/payments/${paymentId}`)
        .set('Authorization', `Bearer ${otherToken}`)
        .send({ status: 'paid' })
        .expect(403);
    });
  });
});
