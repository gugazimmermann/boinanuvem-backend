import request from 'supertest';
import {
  setupE2ETest,
  teardownE2ETest,
  authenticatedRequest,
  E2ETestContext,
} from './e2e-test-helpers';
import { createTestCompany } from './test-utils';

describe('Service Providers Management Flow (e2e)', () => {
  let context: E2ETestContext;

  beforeAll(async () => {
    context = await setupE2ETest({
      companyName: 'Service Providers Test Company',
      email: 'serviceproviders@testcompany.com',
      cnpj: '11.222.333/0001-55',
      planName: 'Avançado',
      isTrial: true,
      createProperty: true,
    });

    // Create a test property
    // Property is already created by setupE2ETest with createProperty: true

    // Create a regular user with limited permissions
    const hashedPassword = await require('bcrypt').hash('password123', 10);
    const regularUser = await context.prisma.user.create({
      data: {
        name: 'Regular User',
        email: 'regular@testcompany.com',
        phone: '(47) 88888-8888',
        password: hashedPassword,
        companyId: context.testCompany.id,
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

    const regularLoginResponse = await request(context.app.getHttpServer())
      .post('/auth/login')
      .send({
        email: regularUser.email,
        password: 'password123',
      })
      .expect(200);

    context.authToken = regularLoginResponse.body.access_token;
  });

  afterAll(async () => {
    await teardownE2ETest(context);
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
        propertyIds: [context.testProperty.id],
      };
      const response = await authenticatedRequest(
        context.app,
        context.mainUserToken,
      )
        .post('/service-providers')
        .send(dto)
        .expect(201);

      expect(response.body).toMatchObject({
        code: dto.code,
        name: dto.name,
        status: dto.status,
        companyId: context.testCompany.id,
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
        propertyIds: [context.testProperty.id],
      };

      const response = await authenticatedRequest(
        context.app,
        context.mainUserToken,
      )
        .post('/service-providers')
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
        propertyIds: [context.testProperty.id],
      };
      await request(context.app.getHttpServer())
        .post('/service-providers')
        .set('Authorization', `Bearer ${context.authToken}`)
        .send(dto)
        .expect(403);
    });

    it('should fail with duplicate code for same company', async () => {
      // Clean up any existing service provider with this code first
      await context.prisma.serviceProvider.deleteMany({
        where: {
          companyId: context.testCompany.id,
          code: '001',
        },
      });

      const dto = {
        ...createServiceProviderDto,
        propertyIds: [context.testProperty.id],
      };

      // Create first service provider
      await request(context.app.getHttpServer())
        .post('/service-providers')
        .set('Authorization', `Bearer ${context.mainUserToken}`)
        .send(dto)
        .expect(201);

      // Try to create duplicate
      await request(context.app.getHttpServer())
        .post('/service-providers')
        .set('Authorization', `Bearer ${context.mainUserToken}`)
        .send(dto)
        .expect(409);
    });

    it('should allow same code for different companies', async () => {
      // Clean up any existing company with this CNPJ first
      await context.prisma.company.deleteMany({
        where: { cnpj: '22.333.444/0001-66' },
      });

      // Clean up any existing service provider with this code in first company
      await context.prisma.serviceProvider.deleteMany({
        where: {
          companyId: context.testCompany.id,
          code: '001',
        },
      });

      // Create another company
      const otherTestData = await createTestCompany(context.prisma, {
        companyName: 'Other Test Company',
        email: 'other@testcompany.com',
        cnpj: '22.333.444/0001-66',
        planName: 'Avançado',
        isTrial: true,
      });

      // Clean up any existing property with this code in other company
      await context.prisma.property.deleteMany({
        where: {
          companyId: otherTestData.company.id,
          code: '001',
        },
      });

      const otherProperty = await context.prisma.property.create({
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
        propertyIds: [context.testProperty.id],
      };
      const dto2 = {
        ...createServiceProviderDto,
        propertyIds: [otherProperty.id],
      };

      // Create service provider in first company
      await request(context.app.getHttpServer())
        .post('/service-providers')
        .set('Authorization', `Bearer ${context.mainUserToken}`)
        .send(dto1)
        .expect(201);

      // Login as other company user
      await context.prisma.user.update({
        where: { id: otherTestData.user.id },
        data: {
          status: 'active',
          emailVerifiedAt: new Date(),
        },
      });

      const otherLoginResponse = await request(context.app.getHttpServer())
        .post('/auth/login')
        .send({
          email: otherTestData.user.email,
          password: 'password123',
        })
        .expect(200);

      const otherToken = otherLoginResponse.body.access_token;

      // Create service provider with same code in second company (should succeed)
      await request(context.app.getHttpServer())
        .post('/service-providers')
        .set('Authorization', `Bearer ${otherToken}`)
        .send(dto2)
        .expect(201);
    });

    it('should validate required fields', async () => {
      await request(context.app.getHttpServer())
        .post('/service-providers')
        .set('Authorization', `Bearer ${context.mainUserToken}`)
        .send({ code: '003' }) // Missing required fields
        .expect(400);
    });

    it('should validate propertyIds requirement', async () => {
      await request(context.app.getHttpServer())
        .post('/service-providers')
        .set('Authorization', `Bearer ${context.mainUserToken}`)
        .send({
          ...createServiceProviderDto,
          code: '004',
          propertyIds: [], // Empty array
        })
        .expect(400);
    });

    it('should validate status enum', async () => {
      await request(context.app.getHttpServer())
        .post('/service-providers')
        .set('Authorization', `Bearer ${context.mainUserToken}`)
        .send({
          ...createServiceProviderDto,
          code: '005',
          properties: {
            create: [{ propertyId: context.testProperty.id }],
          },
          status: 'invalid_status',
        })
        .expect(400);
    });
  });

  describe('GET /service-providers', () => {
    let serviceProviderIds: string[] = [];

    beforeEach(async () => {
      // Clean up any existing service providers with these codes first
      await context.prisma.serviceProvider.deleteMany({
        where: {
          companyId: context.testCompany.id,
          code: { in: ['001', '002', '003'] },
        },
      });

      // Create test service providers
      const sp1 = await context.prisma.serviceProvider.create({
        data: {
          code: '001',
          name: 'Service Provider 1',
          status: 'active',
          companyId: context.testCompany.id,
          properties: {
            create: [{ propertyId: context.testProperty.id }],
          },
        },
      });

      const sp2 = await context.prisma.serviceProvider.create({
        data: {
          code: '002',
          name: 'Service Provider 2',
          status: 'active',
          companyId: context.testCompany.id,
          properties: {
            create: [{ propertyId: context.testProperty.id }],
          },
        },
      });

      const sp3 = await context.prisma.serviceProvider.create({
        data: {
          code: '003',
          name: 'Deleted Service Provider',
          status: 'active',
          companyId: context.testCompany.id,
          deletedAt: new Date(), // Soft deleted
          properties: {
            create: [{ propertyId: context.testProperty.id }],
          },
        },
      });
      serviceProviderIds = [sp1.id, sp2.id, sp3.id];
    });

    afterEach(async () => {
      if (serviceProviderIds.length > 0) {
        await context.prisma.serviceProvider.deleteMany({
          where: { id: { in: serviceProviderIds } },
        });
        serviceProviderIds = [];
      }
    });

    it('should return all service providers for company', async () => {
      const response = await authenticatedRequest(
        context.app,
        context.mainUserToken,
      )
        .get('/service-providers')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(2); // Excludes soft-deleted
      expect(response.body[0]).toHaveProperty('id');
      expect(response.body[0]).toHaveProperty('code');
      expect(response.body[0]).toHaveProperty('name');
    });

    it('should exclude soft-deleted service providers', async () => {
      const response = await authenticatedRequest(
        context.app,
        context.mainUserToken,
      )
        .get('/service-providers')
        .expect(200);

      const codes = response.body.map((sp: any) => sp.code);
      expect(codes).not.toContain('003');
    });

    it('should fail without view permission', async () => {
      // Update regular user to have no view permission
      await context.prisma.user.update({
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

      const newToken = await request(context.app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'regular@testcompany.com',
          password: 'password123',
        })
        .then((res) => res.body.access_token);

      await request(context.app.getHttpServer())
        .get('/service-providers')
        .set('Authorization', `Bearer ${newToken}`)
        .expect(403);
    });
  });

  describe('GET /service-providers/:id', () => {
    let serviceProviderId: string;

    beforeEach(async () => {
      // Clean up any existing service provider with this code first
      await context.prisma.serviceProvider.deleteMany({
        where: {
          companyId: context.testCompany.id,
          code: '001',
        },
      });

      const serviceProvider = await context.prisma.serviceProvider.create({
        data: {
          code: '001',
          name: 'Test Service Provider',
          status: 'active',
          companyId: context.testCompany.id,
          properties: {
            create: [{ propertyId: context.testProperty.id }],
          },
        },
      });
      serviceProviderId = serviceProvider.id;
    });

    afterEach(async () => {
      if (serviceProviderId) {
        await context.prisma.serviceProvider.deleteMany({
          where: { id: serviceProviderId },
        });
      }
    });

    it('should return a service provider by id', async () => {
      const response = await request(context.app.getHttpServer())
        .get(`/service-providers/${serviceProviderId}`)
        .set('Authorization', `Bearer ${context.mainUserToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        id: serviceProviderId,
        code: '001',
        name: 'Test Service Provider',
      });
    });

    it('should return 404 for non-existent service provider', async () => {
      await request(context.app.getHttpServer())
        .get('/service-providers/non-existent-id')
        .set('Authorization', `Bearer ${context.mainUserToken}`)
        .expect(404);
    });

    it('should return 404 for soft-deleted service provider', async () => {
      // Soft delete the service provider
      await context.prisma.serviceProvider.update({
        where: { id: serviceProviderId },
        data: { deletedAt: new Date() },
      });

      await request(context.app.getHttpServer())
        .get(`/service-providers/${serviceProviderId}`)
        .set('Authorization', `Bearer ${context.mainUserToken}`)
        .expect(404);
    });
  });

  describe('PUT /service-providers/:id', () => {
    let serviceProviderId: string;

    beforeEach(async () => {
      // Clean up any existing service provider with this code first
      await context.prisma.serviceProvider.deleteMany({
        where: {
          companyId: context.testCompany.id,
          code: '001',
        },
      });

      const serviceProvider = await context.prisma.serviceProvider.create({
        data: {
          code: '001',
          name: 'Test Service Provider',
          status: 'active',
          companyId: context.testCompany.id,
          properties: {
            create: [{ propertyId: context.testProperty.id }],
          },
        },
      });
      serviceProviderId = serviceProvider.id;
    });

    afterEach(async () => {
      if (serviceProviderId) {
        await context.prisma.serviceProvider.deleteMany({
          where: { id: serviceProviderId },
        });
      }
    });

    it('should update a service provider', async () => {
      const updateDto = {
        name: 'Updated Service Provider Name',
        status: 'inactive',
      };

      const response = await request(context.app.getHttpServer())
        .put(`/service-providers/${serviceProviderId}`)
        .set('Authorization', `Bearer ${context.mainUserToken}`)
        .send(updateDto)
        .expect(200);

      expect(response.body).toMatchObject({
        id: serviceProviderId,
        name: 'Updated Service Provider Name',
        status: 'inactive',
      });
    });

    it('should fail without edit permission', async () => {
      await request(context.app.getHttpServer())
        .put(`/service-providers/${serviceProviderId}`)
        .set('Authorization', `Bearer ${context.authToken}`)
        .send({ name: 'Updated Name' })
        .expect(403);
    });

    it('should fail with duplicate code', async () => {
      // Clean up any existing service provider with this code first
      await context.prisma.serviceProvider.deleteMany({
        where: {
          companyId: context.testCompany.id,
          code: '002',
        },
      });

      // Create another service provider
      await context.prisma.serviceProvider.create({
        data: {
          code: '002',
          name: 'Other Service Provider',
          status: 'active',
          companyId: context.testCompany.id,
          properties: {
            create: [{ propertyId: context.testProperty.id }],
          },
        },
      });

      // Try to update with duplicate code
      await request(context.app.getHttpServer())
        .put(`/service-providers/${serviceProviderId}`)
        .set('Authorization', `Bearer ${context.mainUserToken}`)
        .send({ code: '002' })
        .expect(409);
    });
  });

  describe('DELETE /service-providers/:id', () => {
    let serviceProviderId: string;

    beforeEach(async () => {
      // Clean up any existing service provider with this code first
      await context.prisma.serviceProvider.deleteMany({
        where: {
          companyId: context.testCompany.id,
          code: '001',
        },
      });

      const serviceProvider = await context.prisma.serviceProvider.create({
        data: {
          code: '001',
          name: 'Test Service Provider',
          status: 'active',
          companyId: context.testCompany.id,
          properties: {
            create: [{ propertyId: context.testProperty.id }],
          },
        },
      });
      serviceProviderId = serviceProvider.id;
    });

    afterEach(async () => {
      if (serviceProviderId) {
        await context.prisma.serviceProvider.deleteMany({
          where: { id: serviceProviderId },
        });
      }
    });

    it('should soft delete a service provider', async () => {
      const response = await request(context.app.getHttpServer())
        .delete(`/service-providers/${serviceProviderId}`)
        .set('Authorization', `Bearer ${context.mainUserToken}`)
        .expect(200);

      expect(response.body).toEqual({
        message: 'Service provider deleted successfully',
      });

      // Verify soft delete
      const deletedServiceProvider =
        await context.prisma.serviceProvider.findUnique({
          where: { id: serviceProviderId },
        });
      expect(deletedServiceProvider?.deletedAt).toBeDefined();

      // Verify it's excluded from list
      const listResponse = await request(context.app.getHttpServer())
        .get('/service-providers')
        .set('Authorization', `Bearer ${context.mainUserToken}`)
        .expect(200);

      expect(
        listResponse.body.find((sp: any) => sp.id === serviceProviderId),
      ).toBeUndefined();
    });

    it('should fail without remove permission', async () => {
      await request(context.app.getHttpServer())
        .delete(`/service-providers/${serviceProviderId}`)
        .set('Authorization', `Bearer ${context.authToken}`)
        .expect(403);
    });

    it('should return 404 for non-existent service provider', async () => {
      await request(context.app.getHttpServer())
        .delete('/service-providers/non-existent-id')
        .set('Authorization', `Bearer ${context.mainUserToken}`)
        .expect(404);
    });
  });

  describe('Company Isolation', () => {
    let otherUser: any;
    let otherToken: string;
    let serviceProviderId: string;

    beforeEach(async () => {
      // Clean up any existing company with this CNPJ first
      await context.prisma.company.deleteMany({
        where: { cnpj: '22.333.444/0001-66' },
      });

      // Create another company
      const otherTestData = await createTestCompany(context.prisma, {
        companyName: 'Other Test Company',
        email: 'other@testcompany.com',
        cnpj: '22.333.444/0001-66',
        planName: 'Avançado',
        isTrial: true,
      });

      otherUser = otherTestData.user;

      await context.prisma.user.update({
        where: { id: otherUser.id },
        data: {
          status: 'active',
          emailVerifiedAt: new Date(),
        },
      });

      const loginResponse = await request(context.app.getHttpServer())
        .post('/auth/login')
        .send({
          email: otherUser.email,
          password: 'password123',
        })
        .expect(200);

      otherToken = loginResponse.body.access_token;

      // Clean up any existing service provider with this code in first company
      await context.prisma.serviceProvider.deleteMany({
        where: {
          companyId: context.testCompany.id,
          code: '001',
        },
      });

      // Create service provider for first company
      const serviceProvider = await context.prisma.serviceProvider.create({
        data: {
          code: '001',
          name: 'First Company Service Provider',
          status: 'active',
          companyId: context.testCompany.id,
          properties: {
            create: [{ propertyId: context.testProperty.id }],
          },
        },
      });
      serviceProviderId = serviceProvider.id;
    });

    it('should not allow access to other company service providers', async () => {
      await request(context.app.getHttpServer())
        .get(`/service-providers/${serviceProviderId}`)
        .set('Authorization', `Bearer ${otherToken}`)
        .expect(404);
    });

    it('should not allow update of other company service providers', async () => {
      await request(context.app.getHttpServer())
        .put(`/service-providers/${serviceProviderId}`)
        .set('Authorization', `Bearer ${otherToken}`)
        .send({ name: 'Hacked Name' })
        .expect(404);
    });

    it('should not allow delete of other company service providers', async () => {
      await request(context.app.getHttpServer())
        .delete(`/service-providers/${serviceProviderId}`)
        .set('Authorization', `Bearer ${otherToken}`)
        .expect(404);
    });
  });
});
