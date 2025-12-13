import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestCompany, cleanupTestData } from './test-utils';
import { createTestApp, authenticatedRequest } from './e2e-test-helpers';

describe('Company Management Flow (e2e)', () => {
  let app: INestApplication;
  let prisma: any;

  beforeAll(async () => {
    const testApp = await createTestApp();
    app = testApp.app;
    prisma = testApp.prisma;
  });

  beforeEach(async () => {
    await cleanupTestData(prisma);
  });

  afterAll(async () => {
    await cleanupTestData(prisma);
    await app.close();
  });

  describe('Company Registration', () => {
    it('should register a new company successfully', async () => {
      const registrationData = {
        cnpj: '12.345.678/0001-90',
        companyName: 'Test Company Registration',
        email: 'company@registration.com',
        phone: '(11) 99999-9999',
        street: 'Test Street',
        number: '123',
        complement: 'Suite 456',
        neighborhood: 'Test Neighborhood',
        city: 'Test City',
        state: 'SP',
        zipCode: '12345-678',
        latitude: -23.5505,
        longitude: -46.6333,
        userName: 'Main User',
        userEmail: 'user@registration.com',
        userPhone: '(11) 88888-8888',
        userCpf: '123.456.789-00',
        userPassword: 'password123',
      };

      const response = await request(app.getHttpServer())
        .post('/companies/register')
        .send(registrationData)
        .expect(201);

      expect(response.body).toMatchObject({
        message:
          'Company registered successfully. Please check your email to verify your account.',
        company: {
          cnpj: registrationData.cnpj,
          companyName: registrationData.companyName,
          email: registrationData.email,
        },
        mainUser: {
          name: registrationData.userName,
          email: registrationData.userEmail,
          status: 'pending',
        },
      });

      // Verify company was created in database
      const createdCompany = await prisma.company.findUnique({
        where: { cnpj: registrationData.cnpj },
      });
      expect(createdCompany).toBeTruthy();
      expect(createdCompany.trialStatus).toBe('active');

      // Verify user was created in database
      const createdUser = await prisma.user.findUnique({
        where: { email: registrationData.userEmail },
      });
      expect(createdUser).toBeTruthy();
      expect(createdUser.mainUser).toBe(true);
      expect(createdUser.companyId).toBe(createdCompany.id);
    });

    it('should handle CNPJ already exists error', async () => {
      const registrationData = {
        cnpj: '11.222.333/0001-44',
        companyName: 'First Company',
        email: 'first@company.com',
        phone: '(11) 99999-9999',
        street: 'Test Street',
        number: '123',
        neighborhood: 'Test Neighborhood',
        city: 'Test City',
        state: 'SP',
        zipCode: '12345-678',
        userName: 'First User',
        userEmail: 'first@user.com',
        userPhone: '(11) 88888-8888',
        userCpf: '123.456.789-00',
        userPassword: 'password123',
      };

      // Register first company
      await request(app.getHttpServer())
        .post('/companies/register')
        .send(registrationData)
        .expect(201);

      // Try to register with same CNPJ
      const duplicateData = {
        ...registrationData,
        companyName: 'Second Company',
        email: 'second@company.com',
        userEmail: 'second@user.com',
        userCpf: '987.654.321-00',
      };

      await request(app.getHttpServer())
        .post('/companies/register')
        .send(duplicateData)
        .expect(409);
    });

    it('should handle user email already exists error', async () => {
      const registrationData = {
        cnpj: '22.333.444/0001-55',
        companyName: 'Test Company',
        email: 'company@test.com',
        phone: '(11) 99999-9999',
        street: 'Test Street',
        number: '123',
        neighborhood: 'Test Neighborhood',
        city: 'Test City',
        state: 'SP',
        zipCode: '12345-678',
        userName: 'Test User',
        userEmail: 'duplicate@user.com',
        userPhone: '(11) 88888-8888',
        userCpf: '123.456.789-00',
        userPassword: 'password123',
      };

      // Register first company
      await request(app.getHttpServer())
        .post('/companies/register')
        .send(registrationData)
        .expect(201);

      // Try to register with same user email
      const duplicateData = {
        ...registrationData,
        cnpj: '33.444.555/0001-66',
        companyName: 'Another Company',
        email: 'another@company.com',
        userCpf: '987.654.321-00',
      };

      await request(app.getHttpServer())
        .post('/companies/register')
        .send(duplicateData)
        .expect(409);
    });

    it('should validate CNPJ format', async () => {
      const invalidData = {
        cnpj: 'invalid-cnpj',
        companyName: 'Test Company',
        email: 'company@test.com',
        phone: '(11) 99999-9999',
        street: 'Test Street',
        number: '123',
        neighborhood: 'Test Neighborhood',
        city: 'Test City',
        state: 'SP',
        zipCode: '12345-678',
        userName: 'Test User',
        userEmail: 'user@test.com',
        userPhone: '(11) 88888-8888',
        userCpf: '123.456.789-00',
        userPassword: 'password123',
      };

      await request(app.getHttpServer())
        .post('/companies/register')
        .send(invalidData)
        .expect(400);
    });

    it('should validate required fields', async () => {
      const incompleteData = {
        cnpj: '44.555.666/0001-77',
        companyName: 'Test Company',
        // Missing required fields
      };

      await request(app.getHttpServer())
        .post('/companies/register')
        .send(incompleteData)
        .expect(400);
    });
  });

  describe('Company Information Access', () => {
    let testCompany: any;
    let testUser: any;
    let authToken: string;

    beforeEach(async () => {
      // Create test company with user
      const testData = await createTestCompany(prisma, {
        companyName: 'Company Info Test',
        email: 'info@testcompany.com',
        cnpj: '55.666.777/0001-88',
        planName: 'Avançado',
        isTrial: true,
      });

      testCompany = testData.company;
      testUser = testData.user;

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

      authToken = loginResponse.body.access_token;
    });

    it('should get company details for authenticated user', async () => {
      const response = await authenticatedRequest(app, authToken)
        .get(`/companies/${testCompany.id}`)
        .expect(200);

      expect(response.body).toMatchObject({
        id: testCompany.id,
        cnpj: testCompany.cnpj,
        companyName: testCompany.companyName,
        email: testCompany.email,
        phone: testCompany.phone,
        status: 'active',
        trialStatus: 'active',
      });
    });

    it('should prevent access to other company details', async () => {
      // Create another company
      const otherCompanyData = await createTestCompany(prisma, {
        companyName: 'Other Company',
        email: 'other@company.com',
        cnpj: '66.777.888/0001-99',
        planName: 'Básico',
        isTrial: false,
      });

      await authenticatedRequest(app, authToken)
        .get(`/companies/${otherCompanyData.company.id}`)
        .expect(403);
    });

    it('should require authentication for company details', async () => {
      await request(app.getHttpServer())
        .get(`/companies/${testCompany.id}`)
        .expect(401);
    });

    it('should handle non-existent company ID', async () => {
      await request(app.getHttpServer())
        .get('/companies/non-existent-id')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(403); // Returns 403 because user doesn't have access to this company ID
    });
  });

  describe('Company Updates', () => {
    let testCompany: any;
    let testUser: any;
    let authToken: string;

    beforeEach(async () => {
      // Create test company with user
      const testData = await createTestCompany(prisma, {
        companyName: 'Company Update Test',
        email: 'update@testcompany.com',
        cnpj: '77.888.999/0001-00',
        planName: 'Avançado',
        isTrial: true,
      });

      testCompany = testData.company;
      testUser = testData.user;

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

      authToken = loginResponse.body.access_token;
    });

    it('should update company details as main user', async () => {
      const updateData = {
        companyName: 'Updated Company Name',
        email: 'updated@company.com',
        phone: '(11) 77777-7777',
        street: 'Updated Street',
        number: '456',
        city: 'Updated City',
        state: 'RJ',
      };

      const response = await authenticatedRequest(app, authToken)
        .put(`/companies/${testCompany.id}`)
        .send(updateData)
        .expect(200);

      expect(response.body).toMatchObject({
        id: testCompany.id,
        companyName: updateData.companyName,
        email: updateData.email,
        phone: updateData.phone,
        street: updateData.street,
        number: updateData.number,
        city: updateData.city,
        state: updateData.state,
      });

      // Verify in database
      const updatedCompany = await prisma.company.findUnique({
        where: { id: testCompany.id },
      });
      expect(updatedCompany.companyName).toBe(updateData.companyName);
      expect(updatedCompany.email).toBe(updateData.email);
    });

    it('should prevent team members from updating company', async () => {
      // Create a team member
      const teamMember = await prisma.user.create({
        data: {
          email: 'team@company.com',
          name: 'Team Member',
          phone: '(11) 66666-6666',
          cpf: '111.222.333-44',
          password: await require('bcrypt').hash('password123', 10),
          companyId: testCompany.id,
          mainUser: false,
          status: 'active',
        },
      });

      // Login as team member
      const teamLoginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: teamMember.email,
          password: 'password123',
        })
        .expect(200);

      const teamAuthToken = teamLoginResponse.body.access_token;

      // Try to update company (should fail)
      await authenticatedRequest(app, teamAuthToken)
        .put(`/companies/${testCompany.id}`)
        .send({ companyName: 'Hacked Name' })
        .expect(403);
    });

    it('should handle email conflicts during update', async () => {
      // Create another company with existing email
      await createTestCompany(prisma, {
        companyName: 'Existing Company',
        email: 'existing@company.com',
        cnpj: '88.999.000/0001-11',
        planName: 'Básico',
        isTrial: false,
      });

      await authenticatedRequest(app, authToken)
        .put(`/companies/${testCompany.id}`)
        .send({ email: 'existing@company.com' })
        .expect(409);
    });

    it('should validate email format during update', async () => {
      await authenticatedRequest(app, authToken)
        .put(`/companies/${testCompany.id}`)
        .send({ email: 'invalid-email-format' })
        .expect(400);
    });

    it('should handle partial updates', async () => {
      const partialUpdate = {
        companyName: 'Partially Updated Name',
      };

      const response = await authenticatedRequest(app, authToken)
        .put(`/companies/${testCompany.id}`)
        .send(partialUpdate)
        .expect(200);

      expect(response.body.companyName).toBe(partialUpdate.companyName);
      expect(response.body.email).toBe(testCompany.email); // Should remain unchanged
    });
  });

  describe('Trial System Integration', () => {
    it('should create company with active trial', async () => {
      const registrationData = {
        cnpj: '99.000.111/0001-22',
        companyName: 'Trial Test Company',
        email: 'trial@company.com',
        phone: '(11) 99999-9999',
        street: 'Trial Street',
        number: '123',
        neighborhood: 'Trial Neighborhood',
        city: 'Trial City',
        state: 'SP',
        zipCode: '12345-678',
        userName: 'Trial User',
        userEmail: 'trial@user.com',
        userPhone: '(11) 88888-8888',
        userCpf: '123.456.789-00',
        userPassword: 'password123',
      };

      await request(app.getHttpServer())
        .post('/companies/register')
        .send(registrationData)
        .expect(201);

      // Verify company was created in database with trial info
      const createdCompany = await prisma.company.findUnique({
        where: { cnpj: registrationData.cnpj },
      });
      expect(createdCompany).toBeTruthy();
      expect(createdCompany.trialStatus).toBe('active');
      expect(createdCompany.trialStartDate).toBeTruthy();
      expect(createdCompany.trialEndDate).toBeTruthy();

      // Verify trial dates are set correctly (14 days from start)
      const trialStart = new Date(createdCompany.trialStartDate);
      const trialEnd = new Date(createdCompany.trialEndDate);
      const daysDiff = Math.ceil(
        (trialEnd.getTime() - trialStart.getTime()) / (1000 * 60 * 60 * 24),
      );
      expect(daysDiff).toBe(14);
    });
  });
});
