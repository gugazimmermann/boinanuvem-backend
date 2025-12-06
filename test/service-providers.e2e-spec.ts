import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/common/services/prisma.service';
import { EmailService } from '../src/email/email.service';
import { createTestCompany, cleanupTestData } from './test-utils';

describe('Service Providers Management Flow (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let testCompany: any;
  let testUser: any;
  let testProperty: any;
  let authToken: string;
  let mainUserToken: string;

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
      companyName: 'Service Providers Test Company',
      email: 'serviceproviders@testcompany.com',
      cnpj: '11.222.333/0001-55',
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

    mainUserToken = loginResponse.body.access_token;

    // Create a test property
    testProperty = await prisma.property.create({
      data: {
        code: '001',
        name: 'Test Property',
        area: { value: 100, type: 'hectares' },
        status: 'active',
        companyId: testCompany.id,
        street: 'Test Street',
        number: '123',
        neighborhood: 'Test Neighborhood',
        city: 'Test City',
        state: 'SC',
        zipCode: '88395-000',
      },
    });

    // Create a regular user with limited permissions
    const hashedPassword = await require('bcrypt').hash('password123', 10);
    const regularUser = await prisma.user.create({
      data: {
        name: 'Regular User',
        email: 'regular@testcompany.com',
        phone: '(47) 88888-8888',
        password: hashedPassword,
        companyId: testCompany.id,
        mainUser: false,
        status: 'active',
        emailVerifiedAt: new Date(),
        permissions: {
          registration: {
            serviceProvider: {
              view: true,
              add: false,
              edit: false,
              remove: false,
            },
          },
        },
      },
    });

    const regularLoginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: regularUser.email,
        password: 'password123',
      })
      .expect(200);

    authToken = regularLoginResponse.body.access_token;
  });

  afterAll(async () => {
    await cleanupTestData(prisma);
    await app.close();
  });

  describe('POST /service-providers', () => {
    const createServiceProviderDto = {
      code: '001',
      name: 'Serviços Agrícolas LTDA',
      status: 'active',
      propertyIds: [], // Will be set in each test
    };

    it('should create a service provider successfully (main user)', async () => {
      const dto = {
        ...createServiceProviderDto,
        propertyIds: [testProperty.id],
      };
      const response = await request(app.getHttpServer())
        .post('/service-providers')
        .set('Authorization', `Bearer ${mainUserToken}`)
        .send(dto)
        .expect(201);

      expect(response.body).toMatchObject({
        code: dto.code,
        name: dto.name,
        status: dto.status,
        companyId: testCompany.id,
      });
      expect(response.body.id).toBeDefined();
      expect(response.body.createdAt).toBeDefined();
    });

    it('should create a service provider with optional fields', async () => {
      const dto = {
        ...createServiceProviderDto,
        code: '002',
        cpf: '123.456.789-00',
        cnpj: '12.345.678/0001-90',
        email: 'contato@servicosagricolas.com',
        phone: '(47) 99999-9999',
        street: 'Rua das Flores',
        number: '123',
        complement: 'Sala 101',
        neighborhood: 'Centro',
        city: 'São Paulo',
        state: 'SP',
        zipCode: '01310-100',
        propertyIds: [testProperty.id],
      };

      const response = await request(app.getHttpServer())
        .post('/service-providers')
        .set('Authorization', `Bearer ${mainUserToken}`)
        .send(dto)
        .expect(201);

      expect(response.body).toMatchObject({
        code: dto.code,
        name: dto.name,
        email: dto.email,
        phone: dto.phone,
      });
    });

    it('should fail without add permission', async () => {
      const dto = {
        ...createServiceProviderDto,
        propertyIds: [testProperty.id],
      };
      await request(app.getHttpServer())
        .post('/service-providers')
        .set('Authorization', `Bearer ${authToken}`)
        .send(dto)
        .expect(403);
    });

    it('should fail with duplicate code for same company', async () => {
      const dto = {
        ...createServiceProviderDto,
        propertyIds: [testProperty.id],
      };

      // Create first service provider
      await request(app.getHttpServer())
        .post('/service-providers')
        .set('Authorization', `Bearer ${mainUserToken}`)
        .send(dto)
        .expect(201);

      // Try to create duplicate
      await request(app.getHttpServer())
        .post('/service-providers')
        .set('Authorization', `Bearer ${mainUserToken}`)
        .send(dto)
        .expect(409);
    });

    it('should allow same code for different companies', async () => {
      // Create another company
      const otherTestData = await createTestCompany(prisma, {
        companyName: 'Other Test Company',
        email: 'other@testcompany.com',
        cnpj: '22.333.444/0001-66',
        planName: 'Avançado',
        isTrial: true,
      });

      const otherProperty = await prisma.property.create({
        data: {
          code: '001',
          name: 'Other Company Property',
          area: { value: 100, type: 'hectares' },
          status: 'active',
          companyId: otherTestData.company.id,
          street: 'Other Street',
          number: '123',
          neighborhood: 'Other Neighborhood',
          city: 'Other City',
          state: 'SC',
          zipCode: '88395-000',
        },
      });

      const dto1 = {
        ...createServiceProviderDto,
        propertyIds: [testProperty.id],
      };
      const dto2 = {
        ...createServiceProviderDto,
        propertyIds: [otherProperty.id],
      };

      // Create service provider in first company
      await request(app.getHttpServer())
        .post('/service-providers')
        .set('Authorization', `Bearer ${mainUserToken}`)
        .send(dto1)
        .expect(201);

      // Login as other company user
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

      // Create service provider with same code in second company (should succeed)
      await request(app.getHttpServer())
        .post('/service-providers')
        .set('Authorization', `Bearer ${otherToken}`)
        .send(dto2)
        .expect(201);
    });

    it('should validate required fields', async () => {
      await request(app.getHttpServer())
        .post('/service-providers')
        .set('Authorization', `Bearer ${mainUserToken}`)
        .send({ code: '003' }) // Missing required fields
        .expect(400);
    });

    it('should validate propertyIds requirement', async () => {
      await request(app.getHttpServer())
        .post('/service-providers')
        .set('Authorization', `Bearer ${mainUserToken}`)
        .send({
          ...createServiceProviderDto,
          code: '004',
          propertyIds: [], // Empty array
        })
        .expect(400);
    });

    it('should validate status enum', async () => {
      await request(app.getHttpServer())
        .post('/service-providers')
        .set('Authorization', `Bearer ${mainUserToken}`)
        .send({
          ...createServiceProviderDto,
          code: '005',
          properties: {
            create: [{ propertyId: testProperty.id }],
          },
          status: 'invalid_status',
        })
        .expect(400);
    });
  });

  describe('GET /service-providers', () => {
    beforeEach(async () => {
      // Create test service providers
      await prisma.serviceProvider.create({
        data: {
          code: '001',
          name: 'Service Provider 1',
          status: 'active',
          companyId: testCompany.id,
          properties: {
            create: [{ propertyId: testProperty.id }],
          },
        },
      });

      await prisma.serviceProvider.create({
        data: {
          code: '002',
          name: 'Service Provider 2',
          status: 'active',
          companyId: testCompany.id,
          properties: {
            create: [{ propertyId: testProperty.id }],
          },
        },
      });

      await prisma.serviceProvider.create({
        data: {
          code: '003',
          name: 'Deleted Service Provider',
          status: 'active',
          companyId: testCompany.id,
          deletedAt: new Date(), // Soft deleted
          properties: {
            create: [{ propertyId: testProperty.id }],
          },
        },
      });
    });

    it('should return all service providers for company', async () => {
      const response = await request(app.getHttpServer())
        .get('/service-providers')
        .set('Authorization', `Bearer ${mainUserToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(2); // Excludes soft-deleted
      expect(response.body[0]).toHaveProperty('id');
      expect(response.body[0]).toHaveProperty('code');
      expect(response.body[0]).toHaveProperty('name');
    });

    it('should exclude soft-deleted service providers', async () => {
      const response = await request(app.getHttpServer())
        .get('/service-providers')
        .set('Authorization', `Bearer ${mainUserToken}`)
        .expect(200);

      const codes = response.body.map((sp: any) => sp.code);
      expect(codes).not.toContain('003');
    });

    it('should fail without view permission', async () => {
      // Update regular user to have no view permission
      await prisma.user.update({
        where: { email: 'regular@testcompany.com' },
        data: {
          permissions: {
            registration: {
              serviceProvider: {
                view: false,
                add: false,
                edit: false,
                remove: false,
              },
            },
          },
        },
      });

      const newToken = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'regular@testcompany.com',
          password: 'password123',
        })
        .then((res) => res.body.access_token);

      await request(app.getHttpServer())
        .get('/service-providers')
        .set('Authorization', `Bearer ${newToken}`)
        .expect(403);
    });
  });

  describe('GET /service-providers/:id', () => {
    let serviceProviderId: string;

    beforeEach(async () => {
      const serviceProvider = await prisma.serviceProvider.create({
        data: {
          code: '001',
          name: 'Test Service Provider',
          status: 'active',
          companyId: testCompany.id,
          properties: {
            create: [{ propertyId: testProperty.id }],
          },
        },
      });
      serviceProviderId = serviceProvider.id;
    });

    it('should return a service provider by id', async () => {
      const response = await request(app.getHttpServer())
        .get(`/service-providers/${serviceProviderId}`)
        .set('Authorization', `Bearer ${mainUserToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        id: serviceProviderId,
        code: '001',
        name: 'Test Service Provider',
      });
    });

    it('should return 404 for non-existent service provider', async () => {
      await request(app.getHttpServer())
        .get('/service-providers/non-existent-id')
        .set('Authorization', `Bearer ${mainUserToken}`)
        .expect(404);
    });

    it('should return 404 for soft-deleted service provider', async () => {
      // Soft delete the service provider
      await prisma.serviceProvider.update({
        where: { id: serviceProviderId },
        data: { deletedAt: new Date() },
      });

      await request(app.getHttpServer())
        .get(`/service-providers/${serviceProviderId}`)
        .set('Authorization', `Bearer ${mainUserToken}`)
        .expect(404);
    });
  });

  describe('PUT /service-providers/:id', () => {
    let serviceProviderId: string;

    beforeEach(async () => {
      const serviceProvider = await prisma.serviceProvider.create({
        data: {
          code: '001',
          name: 'Test Service Provider',
          status: 'active',
          companyId: testCompany.id,
          properties: {
            create: [{ propertyId: testProperty.id }],
          },
        },
      });
      serviceProviderId = serviceProvider.id;
    });

    it('should update a service provider', async () => {
      const updateDto = {
        name: 'Updated Service Provider Name',
        status: 'inactive',
      };

      const response = await request(app.getHttpServer())
        .put(`/service-providers/${serviceProviderId}`)
        .set('Authorization', `Bearer ${mainUserToken}`)
        .send(updateDto)
        .expect(200);

      expect(response.body).toMatchObject({
        id: serviceProviderId,
        name: 'Updated Service Provider Name',
        status: 'inactive',
      });
    });

    it('should fail without edit permission', async () => {
      await request(app.getHttpServer())
        .put(`/service-providers/${serviceProviderId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Updated Name' })
        .expect(403);
    });

    it('should fail with duplicate code', async () => {
      // Create another service provider
      await prisma.serviceProvider.create({
        data: {
          code: '002',
          name: 'Other Service Provider',
          status: 'active',
          companyId: testCompany.id,
          properties: {
            create: [{ propertyId: testProperty.id }],
          },
        },
      });

      // Try to update with duplicate code
      await request(app.getHttpServer())
        .put(`/service-providers/${serviceProviderId}`)
        .set('Authorization', `Bearer ${mainUserToken}`)
        .send({ code: '002' })
        .expect(409);
    });
  });

  describe('DELETE /service-providers/:id', () => {
    let serviceProviderId: string;

    beforeEach(async () => {
      const serviceProvider = await prisma.serviceProvider.create({
        data: {
          code: '001',
          name: 'Test Service Provider',
          status: 'active',
          companyId: testCompany.id,
          properties: {
            create: [{ propertyId: testProperty.id }],
          },
        },
      });
      serviceProviderId = serviceProvider.id;
    });

    it('should soft delete a service provider', async () => {
      const response = await request(app.getHttpServer())
        .delete(`/service-providers/${serviceProviderId}`)
        .set('Authorization', `Bearer ${mainUserToken}`)
        .expect(200);

      expect(response.body).toEqual({
        message: 'Service provider deleted successfully',
      });

      // Verify soft delete
      const deletedServiceProvider = await prisma.serviceProvider.findUnique({
        where: { id: serviceProviderId },
      });
      expect(deletedServiceProvider?.deletedAt).toBeDefined();

      // Verify it's excluded from list
      const listResponse = await request(app.getHttpServer())
        .get('/service-providers')
        .set('Authorization', `Bearer ${mainUserToken}`)
        .expect(200);

      expect(
        listResponse.body.find((sp: any) => sp.id === serviceProviderId),
      ).toBeUndefined();
    });

    it('should fail without remove permission', async () => {
      await request(app.getHttpServer())
        .delete(`/service-providers/${serviceProviderId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(403);
    });

    it('should return 404 for non-existent service provider', async () => {
      await request(app.getHttpServer())
        .delete('/service-providers/non-existent-id')
        .set('Authorization', `Bearer ${mainUserToken}`)
        .expect(404);
    });
  });

  describe('Company Isolation', () => {
    let otherUser: any;
    let otherToken: string;
    let serviceProviderId: string;

    beforeEach(async () => {
      // Create another company
      const otherTestData = await createTestCompany(prisma, {
        companyName: 'Other Test Company',
        email: 'other@testcompany.com',
        cnpj: '22.333.444/0001-66',
        planName: 'Avançado',
        isTrial: true,
      });

      otherUser = otherTestData.user;

      await prisma.user.update({
        where: { id: otherUser.id },
        data: {
          status: 'active',
          emailVerifiedAt: new Date(),
        },
      });

      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: otherUser.email,
          password: 'password123',
        })
        .expect(200);

      otherToken = loginResponse.body.access_token;

      // Create service provider for first company
      const serviceProvider = await prisma.serviceProvider.create({
        data: {
          code: '001',
          name: 'First Company Service Provider',
          status: 'active',
          companyId: testCompany.id,
          properties: {
            create: [{ propertyId: testProperty.id }],
          },
        },
      });
      serviceProviderId = serviceProvider.id;
    });

    it('should not allow access to other company service providers', async () => {
      await request(app.getHttpServer())
        .get(`/service-providers/${serviceProviderId}`)
        .set('Authorization', `Bearer ${otherToken}`)
        .expect(404);
    });

    it('should not allow update of other company service providers', async () => {
      await request(app.getHttpServer())
        .put(`/service-providers/${serviceProviderId}`)
        .set('Authorization', `Bearer ${otherToken}`)
        .send({ name: 'Hacked Name' })
        .expect(404);
    });

    it('should not allow delete of other company service providers', async () => {
      await request(app.getHttpServer())
        .delete(`/service-providers/${serviceProviderId}`)
        .set('Authorization', `Bearer ${otherToken}`)
        .expect(404);
    });
  });
});
