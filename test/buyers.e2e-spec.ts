import request from 'supertest';
import {
  setupE2ETest,
  teardownE2ETest,
  authenticatedRequest,
  E2ETestContext,
} from './e2e-test-helpers';
import { createTestCompany } from './test-utils';

describe('Buyers Management Flow (e2e)', () => {
  let context: E2ETestContext;

  beforeAll(async () => {
    context = await setupE2ETest({
      companyName: 'Buyers Test Company',
      email: 'buyers@testcompany.com',
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
            buyer: { view: true, add: false, edit: false, remove: false },
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

  describe('POST /buyers', () => {
    const createBuyerDto = {
      code: '001',
      name: 'Comprador de Gado LTDA',
      status: 'active',
      propertyIds: [], // Will be set in each test
    };

    it('should create a buyer successfully (main user)', async () => {
      const dto = { ...createBuyerDto, propertyIds: [context.testProperty.id] };
      const response = await authenticatedRequest(
        context.app,
        context.mainUserToken,
      )
        .post('/buyers')
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

    it('should create a buyer with optional fields', async () => {
      const dto = {
        ...createBuyerDto,
        code: '002',
        cpf: '123.456.789-00',
        cnpj: '12.345.678/0001-90',
        email: 'contato@comprador.com',
        phone: '(47) 99999-9999',
        street: 'Rua das Flores',
        number: '123',
        complement: 'Escritório 1',
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
        .post('/buyers')
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
      const dto = { ...createBuyerDto, propertyIds: [context.testProperty.id] };
      await request(context.app.getHttpServer())
        .post('/buyers')
        .set('Authorization', `Bearer ${context.authToken}`)
        .send(dto)
        .expect(403);
    });

    it('should fail with duplicate code for same company', async () => {
      // Clean up any existing buyer with this code first
      await context.prisma.buyer.deleteMany({
        where: {
          companyId: context.testCompany.id,
          code: 'DUPLICATE-001',
        },
      });

      const dto = {
        ...createBuyerDto,
        code: 'DUPLICATE-001',
        propertyIds: [context.testProperty.id],
      };

      // Create first buyer
      await request(context.app.getHttpServer())
        .post('/buyers')
        .set('Authorization', `Bearer ${context.mainUserToken}`)
        .send(dto)
        .expect(201);

      // Try to create duplicate
      await request(context.app.getHttpServer())
        .post('/buyers')
        .set('Authorization', `Bearer ${context.mainUserToken}`)
        .send(dto)
        .expect(409);
    });

    it('should allow same code for different companies', async () => {
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

      // Clean up any existing buyers with these codes first
      await context.prisma.buyer.deleteMany({
        where: {
          OR: [
            { companyId: context.testCompany.id, code: 'CROSS-001' },
            { companyId: otherTestData.company.id, code: 'CROSS-001' },
          ],
        },
      });

      const dto1 = {
        ...createBuyerDto,
        code: 'CROSS-001',
        propertyIds: [context.testProperty.id],
      };
      const dto2 = {
        ...createBuyerDto,
        code: 'CROSS-001',
        propertyIds: [otherProperty.id],
      };

      // Create buyer in first company
      await request(context.app.getHttpServer())
        .post('/buyers')
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

      // Create buyer with same code in second company (should succeed)
      await request(context.app.getHttpServer())
        .post('/buyers')
        .set('Authorization', `Bearer ${otherToken}`)
        .send(dto2)
        .expect(201);
    });

    it('should validate required fields', async () => {
      await request(context.app.getHttpServer())
        .post('/buyers')
        .set('Authorization', `Bearer ${context.mainUserToken}`)
        .send({ code: '003' }) // Missing required fields
        .expect(400);
    });

    it('should validate propertyIds requirement', async () => {
      await request(context.app.getHttpServer())
        .post('/buyers')
        .set('Authorization', `Bearer ${context.mainUserToken}`)
        .send({
          ...createBuyerDto,
          code: '004',
          propertyIds: [], // Empty array
        })
        .expect(400);
    });

    it('should validate status enum', async () => {
      await request(context.app.getHttpServer())
        .post('/buyers')
        .set('Authorization', `Bearer ${context.mainUserToken}`)
        .send({
          ...createBuyerDto,
          code: '005',
          propertyIds: [context.testProperty.id],
          status: 'invalid_status',
        })
        .expect(400);
    });
  });

  describe('GET /buyers', () => {
    beforeEach(async () => {
      // Clean up all buyers for this company to ensure clean state
      await context.prisma.buyer.deleteMany({
        where: {
          companyId: context.testCompany.id,
        },
      });

      // Create test buyers
      await context.prisma.buyer.create({
        data: {
          code: 'GET-001',
          name: 'Buyer 1',
          status: 'active',
          companyId: context.testCompany.id,
          properties: {
            create: [{ propertyId: context.testProperty.id }],
          },
        },
      });

      await context.prisma.buyer.create({
        data: {
          code: 'GET-002',
          name: 'Buyer 2',
          status: 'active',
          companyId: context.testCompany.id,
          properties: {
            create: [{ propertyId: context.testProperty.id }],
          },
        },
      });

      await context.prisma.buyer.create({
        data: {
          code: 'GET-003',
          name: 'Deleted Buyer',
          status: 'active',
          companyId: context.testCompany.id,
          deletedAt: new Date(), // Soft deleted
          properties: {
            create: [{ propertyId: context.testProperty.id }],
          },
        },
      });
    });

    it('should return all buyers for company', async () => {
      const response = await authenticatedRequest(
        context.app,
        context.mainUserToken,
      )
        .get('/buyers')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(2); // Excludes soft-deleted
      expect(response.body[0]).toHaveProperty('id');
      expect(response.body[0]).toHaveProperty('code');
      expect(response.body[0]).toHaveProperty('name');
    });

    it('should exclude soft-deleted buyers', async () => {
      const response = await authenticatedRequest(
        context.app,
        context.mainUserToken,
      )
        .get('/buyers')
        .expect(200);

      const codes = response.body.map((b: any) => b.code);
      expect(codes).not.toContain('GET-003');
    });

    it('should fail without view permission', async () => {
      // Update regular user to have no view permission
      await context.prisma.user.update({
        where: { email: 'regular@testcompany.com' },
        data: {
          permissions: {
            registration: {
              buyer: { view: false, add: false, edit: false, remove: false },
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
        .get('/buyers')
        .set('Authorization', `Bearer ${newToken}`)
        .expect(403);
    });
  });

  describe('GET /buyers/:id', () => {
    let buyerId: string;

    beforeEach(async () => {
      // Clean up any existing buyer with this code first
      await context.prisma.buyer.deleteMany({
        where: {
          companyId: context.testCompany.id,
          code: 'GET-ID-001',
        },
      });

      const buyer = await context.prisma.buyer.create({
        data: {
          code: 'GET-ID-001',
          name: 'Test Buyer',
          status: 'active',
          companyId: context.testCompany.id,
          properties: {
            create: [{ propertyId: context.testProperty.id }],
          },
        },
      });
      buyerId = buyer.id;
    });

    it('should return a buyer by id', async () => {
      const response = await request(context.app.getHttpServer())
        .get(`/buyers/${buyerId}`)
        .set('Authorization', `Bearer ${context.mainUserToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        id: buyerId,
        code: 'GET-ID-001',
        name: 'Test Buyer',
      });
    });

    it('should return 404 for non-existent buyer', async () => {
      await request(context.app.getHttpServer())
        .get('/buyers/non-existent-id')
        .set('Authorization', `Bearer ${context.mainUserToken}`)
        .expect(404);
    });

    it('should return 404 for soft-deleted buyer', async () => {
      // Soft delete the buyer
      await context.prisma.buyer.update({
        where: { id: buyerId },
        data: { deletedAt: new Date() },
      });

      await request(context.app.getHttpServer())
        .get(`/buyers/${buyerId}`)
        .set('Authorization', `Bearer ${context.mainUserToken}`)
        .expect(404);
    });
  });

  describe('PUT /buyers/:id', () => {
    let buyerId: string;

    beforeEach(async () => {
      // Clean up any existing buyers with these codes first
      await context.prisma.buyer.deleteMany({
        where: {
          companyId: context.testCompany.id,
          code: { in: ['PUT-001', 'PUT-002'] },
        },
      });

      const buyer = await context.prisma.buyer.create({
        data: {
          code: 'PUT-001',
          name: 'Test Buyer',
          status: 'active',
          companyId: context.testCompany.id,
          properties: {
            create: [{ propertyId: context.testProperty.id }],
          },
        },
      });
      buyerId = buyer.id;
    });

    it('should update a buyer', async () => {
      const updateDto = {
        name: 'Updated Buyer Name',
        status: 'inactive',
      };

      const response = await request(context.app.getHttpServer())
        .put(`/buyers/${buyerId}`)
        .set('Authorization', `Bearer ${context.mainUserToken}`)
        .send(updateDto)
        .expect(200);

      expect(response.body).toMatchObject({
        id: buyerId,
        name: 'Updated Buyer Name',
        status: 'inactive',
      });
    });

    it('should fail without edit permission', async () => {
      await request(context.app.getHttpServer())
        .put(`/buyers/${buyerId}`)
        .set('Authorization', `Bearer ${context.authToken}`)
        .send({ name: 'Updated Name' })
        .expect(403);
    });

    it('should fail with duplicate code', async () => {
      // Create another buyer
      await context.prisma.buyer.create({
        data: {
          code: 'PUT-002',
          name: 'Other Buyer',
          status: 'active',
          companyId: context.testCompany.id,
          properties: {
            create: [{ propertyId: context.testProperty.id }],
          },
        },
      });

      // Try to update with duplicate code
      await request(context.app.getHttpServer())
        .put(`/buyers/${buyerId}`)
        .set('Authorization', `Bearer ${context.mainUserToken}`)
        .send({ code: 'PUT-002' })
        .expect(409);
    });
  });

  describe('DELETE /buyers/:id', () => {
    let buyerId: string;

    beforeEach(async () => {
      // Clean up any existing buyer with this code first
      await context.prisma.buyer.deleteMany({
        where: {
          companyId: context.testCompany.id,
          code: 'DELETE-001',
        },
      });

      const buyer = await context.prisma.buyer.create({
        data: {
          code: 'DELETE-001',
          name: 'Test Buyer',
          status: 'active',
          companyId: context.testCompany.id,
          properties: {
            create: [{ propertyId: context.testProperty.id }],
          },
        },
      });
      buyerId = buyer.id;
    });

    it('should soft delete a buyer', async () => {
      const response = await request(context.app.getHttpServer())
        .delete(`/buyers/${buyerId}`)
        .set('Authorization', `Bearer ${context.mainUserToken}`)
        .expect(200);

      expect(response.body).toEqual({
        message: 'Buyer deleted successfully',
      });

      // Verify soft delete
      const deletedBuyer = await context.prisma.buyer.findUnique({
        where: { id: buyerId },
      });
      expect(deletedBuyer?.deletedAt).toBeDefined();

      // Verify it's excluded from list
      const listResponse = await request(context.app.getHttpServer())
        .get('/buyers')
        .set('Authorization', `Bearer ${context.mainUserToken}`)
        .expect(200);

      expect(
        listResponse.body.find((b: any) => b.id === buyerId),
      ).toBeUndefined();
    });

    it('should fail without remove permission', async () => {
      await request(context.app.getHttpServer())
        .delete(`/buyers/${buyerId}`)
        .set('Authorization', `Bearer ${context.authToken}`)
        .expect(403);
    });

    it('should return 404 for non-existent buyer', async () => {
      await request(context.app.getHttpServer())
        .delete('/buyers/non-existent-id')
        .set('Authorization', `Bearer ${context.mainUserToken}`)
        .expect(404);
    });
  });

  describe('Company Isolation', () => {
    let otherUser: any;
    let otherToken: string;
    let buyerId: string;

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

      // Clean up any existing buyer with this code first
      await context.prisma.buyer.deleteMany({
        where: {
          companyId: context.testCompany.id,
          code: 'ISOLATE-001',
        },
      });

      // Create buyer for first company
      const buyer = await context.prisma.buyer.create({
        data: {
          code: 'ISOLATE-001',
          name: 'First Company Buyer',
          status: 'active',
          companyId: context.testCompany.id,
          properties: {
            create: [{ propertyId: context.testProperty.id }],
          },
        },
      });
      buyerId = buyer.id;
    });

    it('should not allow access to other company buyers', async () => {
      await request(context.app.getHttpServer())
        .get(`/buyers/${buyerId}`)
        .set('Authorization', `Bearer ${otherToken}`)
        .expect(404);
    });

    it('should not allow update of other company buyers', async () => {
      await request(context.app.getHttpServer())
        .put(`/buyers/${buyerId}`)
        .set('Authorization', `Bearer ${otherToken}`)
        .send({ name: 'Hacked Name' })
        .expect(404);
    });

    it('should not allow delete of other company buyers', async () => {
      await request(context.app.getHttpServer())
        .delete(`/buyers/${buyerId}`)
        .set('Authorization', `Bearer ${otherToken}`)
        .expect(404);
    });
  });
});
