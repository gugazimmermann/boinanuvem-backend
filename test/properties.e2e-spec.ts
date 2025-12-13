import request from 'supertest';
import {
  setupE2ETest,
  teardownE2ETest,
  authenticatedRequest,
  E2ETestContext,
} from './e2e-test-helpers';
import { createTestCompany } from './test-utils';

describe('Properties Management Flow (e2e)', () => {
  let context: E2ETestContext;

  beforeAll(async () => {
    context = await setupE2ETest({
      companyName: 'Properties Test Company',
      email: 'properties@testcompany.com',
      cnpj: '11.222.333/0001-55',
      planName: 'Avançado',
      isTrial: true,
    });

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
            property: { view: true, add: false, edit: false, remove: false },
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

  describe('POST /properties', () => {
    const createPropertyDto = {
      code: '001',
      name: 'Fazenda do Juca',
      area: { value: 150.5, type: 'hectares' },
      status: 'active',
      street: 'Rua Simão Piaz',
      number: 'SN',
      complement: 'Fazenda do Juca',
      neighborhood: 'LIMOEIRO',
      city: 'São João do Itaperiú',
      state: 'SC',
      zipCode: '88395000',
      latitude: -26.559317100277863,
      longitude: -48.75873810994559,
    };

    it('should create a property successfully (main user)', async () => {
      const response = await authenticatedRequest(
        context.app,
        context.mainUserToken,
      )
        .post('/properties')
        .send(createPropertyDto)
        .expect(201);

      expect(response.body).toMatchObject({
        code: createPropertyDto.code,
        name: createPropertyDto.name,
        status: createPropertyDto.status,
        companyId: context.testCompany.id,
      });
      expect(response.body.id).toBeDefined();
      expect(response.body.createdAt).toBeDefined();
    });

    it('should create a property with optional fields', async () => {
      const dtoWithOptional = {
        ...createPropertyDto,
        code: '002',
        pasturePlanning: [
          {
            month: 'January',
            min: 22.34,
            max: 27.92,
            precipitation: 207.87,
            classification: 'Excellent',
          },
        ],
        breedingMonths: ['April', 'May', 'June'],
        pasturePlanningModifiedByUser: true,
        breedingSeasonModifiedByUser: true,
      };

      const response = await authenticatedRequest(
        context.app,
        context.mainUserToken,
      )
        .post('/properties')
        .send(dtoWithOptional)
        .expect(201);

      expect(response.body.pasturePlanning).toBeDefined();
      expect(response.body.breedingMonths).toBeDefined();
      expect(response.body.pasturePlanningModifiedByUser).toBe(true);
      expect(response.body.breedingSeasonModifiedByUser).toBe(true);
    });

    it('should fail without add permission', async () => {
      await request(context.app.getHttpServer())
        .post('/properties')
        .set('Authorization', `Bearer ${context.authToken}`)
        .send(createPropertyDto)
        .expect(403);
    });

    it('should fail with duplicate code for same company', async () => {
      // Use a unique code that doesn't conflict with setupE2ETest property
      const dto = { ...createPropertyDto, code: 'DUPLICATE-001' };

      // Create first property
      await request(context.app.getHttpServer())
        .post('/properties')
        .set('Authorization', `Bearer ${context.mainUserToken}`)
        .send(dto)
        .expect(201);

      // Try to create duplicate
      await request(context.app.getHttpServer())
        .post('/properties')
        .set('Authorization', `Bearer ${context.mainUserToken}`)
        .send(dto)
        .expect(409);
    });

    it('should validate required fields', async () => {
      await request(context.app.getHttpServer())
        .post('/properties')
        .set('Authorization', `Bearer ${context.mainUserToken}`)
        .send({ code: '003' }) // Missing required fields
        .expect(400);
    });

    it('should validate area type enum', async () => {
      await request(context.app.getHttpServer())
        .post('/properties')
        .set('Authorization', `Bearer ${context.mainUserToken}`)
        .send({
          ...createPropertyDto,
          code: '004',
          area: { value: 100, type: 'invalid_type' },
        })
        .expect(400);
    });
  });

  describe('GET /properties', () => {
    let propertyIds: string[] = [];

    beforeEach(async () => {
      // Clean up any existing properties with these codes first
      await context.prisma.property.deleteMany({
        where: {
          companyId: context.testCompany.id,
          code: { in: ['GET-001', 'GET-002', 'GET-003'] },
        },
      });

      // Create test properties with unique codes
      const properties = await Promise.all([
        context.prisma.property.create({
          data: {
            code: 'GET-001',
            name: 'Property 1',
            area: { value: 100, type: 'hectares' },
            status: 'active',
            companyId: context.testCompany.id,
            street: 'Street 1',
            number: '1',
            neighborhood: 'Neighborhood 1',
            city: 'City 1',
            state: 'SC',
            zipCode: '88395-000',
          },
        }),
        context.prisma.property.create({
          data: {
            code: 'GET-002',
            name: 'Property 2',
            area: { value: 200, type: 'hectares' },
            status: 'active',
            companyId: context.testCompany.id,
            street: 'Street 2',
            number: '2',
            neighborhood: 'Neighborhood 2',
            city: 'City 2',
            state: 'SC',
            zipCode: '88395-000',
          },
        }),
        context.prisma.property.create({
          data: {
            code: 'GET-003',
            name: 'Deleted Property',
            area: { value: 300, type: 'hectares' },
            status: 'active',
            companyId: context.testCompany.id,
            street: 'Street 3',
            number: '3',
            neighborhood: 'Neighborhood 3',
            city: 'City 3',
            state: 'SC',
            zipCode: '88395-000',
            deletedAt: new Date(), // Soft deleted
          },
        }),
      ]);
      propertyIds = properties.map((p) => p.id);
    });

    afterEach(async () => {
      if (propertyIds.length > 0) {
        await context.prisma.property.deleteMany({
          where: { id: { in: propertyIds } },
        });
        propertyIds = [];
      }
    });

    it('should return all properties for company', async () => {
      const response = await authenticatedRequest(
        context.app,
        context.mainUserToken,
      )
        .get('/properties')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      // Should return 2 active properties (GET-001 and GET-002), excluding soft-deleted (GET-003) and setupE2ETest property
      expect(response.body.length).toBeGreaterThanOrEqual(2);
      // Verify our test properties are in the response
      const codes = response.body.map((p: any) => p.code);
      expect(codes).toContain('GET-001');
      expect(codes).toContain('GET-002');
      expect(response.body[0]).toHaveProperty('id');
      expect(response.body[0]).toHaveProperty('code');
      expect(response.body[0]).toHaveProperty('name');
    });

    it('should exclude soft-deleted properties', async () => {
      const response = await authenticatedRequest(
        context.app,
        context.mainUserToken,
      )
        .get('/properties')
        .expect(200);

      const codes = response.body.map((p: any) => p.code);
      expect(codes).not.toContain('GET-003');
    });

    it('should fail without view permission', async () => {
      // Update regular user to have no view permission
      await context.prisma.user.update({
        where: { email: 'regular@testcompany.com' },
        data: {
          permissions: {
            registration: {
              property: { view: false, add: false, edit: false, remove: false },
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
        .get('/properties')
        .set('Authorization', `Bearer ${newToken}`)
        .expect(403);
    });
  });

  describe('GET /properties/:id', () => {
    let propertyId: string;

    beforeEach(async () => {
      // Clean up any existing property with this code first
      await context.prisma.property.deleteMany({
        where: {
          companyId: context.testCompany.id,
          code: '001',
        },
      });

      const property = await context.prisma.property.create({
        data: {
          code: '001',
          name: 'Test Property',
          area: { value: 100, type: 'hectares' },
          status: 'active',
          companyId: context.testCompany.id,
          street: 'Test Street',
          number: '123',
          neighborhood: 'Test Neighborhood',
          city: 'Test City',
          state: 'SC',
          zipCode: '88395-000',
        },
      });
      propertyId = property.id;
    });

    afterEach(async () => {
      if (propertyId) {
        await context.prisma.property.deleteMany({
          where: { id: propertyId },
        });
      }
    });

    it('should return a property by id', async () => {
      const response = await request(context.app.getHttpServer())
        .get(`/properties/${propertyId}`)
        .set('Authorization', `Bearer ${context.mainUserToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        id: propertyId,
        code: '001',
        name: 'Test Property',
      });
    });

    it('should return 404 for non-existent property', async () => {
      await request(context.app.getHttpServer())
        .get('/properties/non-existent-id')
        .set('Authorization', `Bearer ${context.mainUserToken}`)
        .expect(404);
    });

    it('should return 404 for soft-deleted property', async () => {
      // Soft delete the property
      await context.prisma.property.update({
        where: { id: propertyId },
        data: { deletedAt: new Date() },
      });

      await request(context.app.getHttpServer())
        .get(`/properties/${propertyId}`)
        .set('Authorization', `Bearer ${context.mainUserToken}`)
        .expect(404);
    });
  });

  describe('PUT /properties/:id', () => {
    let propertyId: string;

    beforeEach(async () => {
      // Clean up any existing property with this code first
      await context.prisma.property.deleteMany({
        where: {
          companyId: context.testCompany.id,
          code: '001',
        },
      });

      const property = await context.prisma.property.create({
        data: {
          code: '001',
          name: 'Test Property',
          area: { value: 100, type: 'hectares' },
          status: 'active',
          companyId: context.testCompany.id,
          street: 'Test Street',
          number: '123',
          neighborhood: 'Test Neighborhood',
          city: 'Test City',
          state: 'SC',
          zipCode: '88395-000',
        },
      });
      propertyId = property.id;
    });

    afterEach(async () => {
      if (propertyId) {
        await context.prisma.property.deleteMany({
          where: { id: propertyId },
        });
      }
    });

    it('should update a property', async () => {
      const updateDto = {
        name: 'Updated Property Name',
        status: 'inactive',
      };

      const response = await request(context.app.getHttpServer())
        .put(`/properties/${propertyId}`)
        .set('Authorization', `Bearer ${context.mainUserToken}`)
        .send(updateDto)
        .expect(200);

      expect(response.body).toMatchObject({
        id: propertyId,
        name: 'Updated Property Name',
        status: 'inactive',
      });
    });

    it('should fail without edit permission', async () => {
      await request(context.app.getHttpServer())
        .put(`/properties/${propertyId}`)
        .set('Authorization', `Bearer ${context.authToken}`)
        .send({ name: 'Updated Name' })
        .expect(403);
    });

    it('should fail with duplicate code', async () => {
      // Clean up any existing property with this code first
      await context.prisma.property.deleteMany({
        where: {
          companyId: context.testCompany.id,
          code: '002',
        },
      });

      // Create another property
      await context.prisma.property.create({
        data: {
          code: '002',
          name: 'Other Property',
          area: { value: 200, type: 'hectares' },
          status: 'active',
          companyId: context.testCompany.id,
          street: 'Other Street',
          number: '456',
          neighborhood: 'Other Neighborhood',
          city: 'Other City',
          state: 'SC',
          zipCode: '88395-000',
        },
      });

      // Try to update with duplicate code
      await request(context.app.getHttpServer())
        .put(`/properties/${propertyId}`)
        .set('Authorization', `Bearer ${context.mainUserToken}`)
        .send({ code: '002' })
        .expect(409);
    });
  });

  describe('DELETE /properties/:id', () => {
    let propertyId: string;

    beforeEach(async () => {
      // Clean up any existing property with this code first
      await context.prisma.property.deleteMany({
        where: {
          companyId: context.testCompany.id,
          code: '001',
        },
      });

      const property = await context.prisma.property.create({
        data: {
          code: '001',
          name: 'Test Property',
          area: { value: 100, type: 'hectares' },
          status: 'active',
          companyId: context.testCompany.id,
          street: 'Test Street',
          number: '123',
          neighborhood: 'Test Neighborhood',
          city: 'Test City',
          state: 'SC',
          zipCode: '88395-000',
        },
      });
      propertyId = property.id;
    });

    afterEach(async () => {
      if (propertyId) {
        await context.prisma.property.deleteMany({
          where: { id: propertyId },
        });
      }
    });

    it('should soft delete a property', async () => {
      const response = await request(context.app.getHttpServer())
        .delete(`/properties/${propertyId}`)
        .set('Authorization', `Bearer ${context.mainUserToken}`)
        .expect(200);

      expect(response.body).toEqual({
        message: 'Property deleted successfully',
      });

      // Verify soft delete
      const deletedProperty = await context.prisma.property.findUnique({
        where: { id: propertyId },
      });
      expect(deletedProperty?.deletedAt).toBeDefined();

      // Verify it's excluded from list
      const listResponse = await request(context.app.getHttpServer())
        .get('/properties')
        .set('Authorization', `Bearer ${context.mainUserToken}`)
        .expect(200);

      expect(
        listResponse.body.find((p: any) => p.id === propertyId),
      ).toBeUndefined();
    });

    it('should fail without remove permission', async () => {
      await request(context.app.getHttpServer())
        .delete(`/properties/${propertyId}`)
        .set('Authorization', `Bearer ${context.authToken}`)
        .expect(403);
    });

    it('should return 404 for non-existent property', async () => {
      await request(context.app.getHttpServer())
        .delete('/properties/non-existent-id')
        .set('Authorization', `Bearer ${context.mainUserToken}`)
        .expect(404);
    });
  });

  describe('Company Isolation', () => {
    let otherCompany: any;
    let otherUser: any;
    let otherToken: string;
    let propertyId: string;

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

      otherCompany = otherTestData.company;
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

      // Clean up any existing property with this code in first company
      await context.prisma.property.deleteMany({
        where: {
          companyId: context.testCompany.id,
          code: '001',
        },
      });

      // Create property for first company
      const property = await context.prisma.property.create({
        data: {
          code: '001',
          name: 'First Company Property',
          area: { value: 100, type: 'hectares' },
          status: 'active',
          companyId: context.testCompany.id,
          street: 'Test Street',
          number: '123',
          neighborhood: 'Test Neighborhood',
          city: 'Test City',
          state: 'SC',
          zipCode: '88395-000',
        },
      });
      propertyId = property.id;
    });

    it('should not allow access to other company properties', async () => {
      await request(context.app.getHttpServer())
        .get(`/properties/${propertyId}`)
        .set('Authorization', `Bearer ${otherToken}`)
        .expect(404);
    });

    it('should not allow update of other company properties', async () => {
      await request(context.app.getHttpServer())
        .put(`/properties/${propertyId}`)
        .set('Authorization', `Bearer ${otherToken}`)
        .send({ name: 'Hacked Name' })
        .expect(404);
    });

    it('should not allow delete of other company properties', async () => {
      await request(context.app.getHttpServer())
        .delete(`/properties/${propertyId}`)
        .set('Authorization', `Bearer ${otherToken}`)
        .expect(404);
    });

    it('should allow same code for different companies', async () => {
      // Create property with same code in other company
      const response = await request(context.app.getHttpServer())
        .post('/properties')
        .set('Authorization', `Bearer ${otherToken}`)
        .send({
          code: '001', // Same code
          name: 'Other Company Property',
          area: { value: 200, type: 'hectares' },
          status: 'active',
          street: 'Other Street',
          number: '456',
          neighborhood: 'Other Neighborhood',
          city: 'Other City',
          state: 'SC',
          zipCode: '88395-000',
        })
        .expect(201);

      expect(response.body.code).toBe('001');
      expect(response.body.companyId).toBe(otherCompany.id);
    });
  });
});
