import request from 'supertest';
import {
  setupE2ETest,
  teardownE2ETest,
  authenticatedRequest,
  E2ETestContext,
} from './e2e-test-helpers';
import { createTestCompany } from './test-utils';

describe('Animals Management Flow (e2e)', () => {
  let context: E2ETestContext;

  beforeAll(async () => {
    context = await setupE2ETest({
      companyName: 'Animals Test Company',
      email: 'animals@testcompany.com',
      cnpj: '11.222.333/0001-55',
      planName: 'Avançado',
      isTrial: true,
      createProperty: true,
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
            animals: { view: true, add: false, edit: false, remove: false },
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

  describe('POST /animals', () => {
    const createAnimalDto = {
      code: '001',
      registrationNumber: 'BR-2020-FJ0001',
      status: 'active',
      propertyId: '', // Will be set in each test
    };

    it('should create an animal successfully (main user)', async () => {
      const dto = { ...createAnimalDto, propertyId: context.testProperty.id };
      const response = await authenticatedRequest(
        context.app,
        context.mainUserToken,
      )
        .post('/animals')
        .send(dto)
        .expect(201);

      expect(response.body).toMatchObject({
        code: dto.code,
        registrationNumber: dto.registrationNumber,
        status: dto.status,
        companyId: context.testCompany.id,
        propertyId: context.testProperty.id,
      });
      expect(response.body.id).toBeDefined();
      expect(response.body.createdAt).toBeDefined();
    });

    it('should create an animal with acquisition date', async () => {
      const dto = {
        ...createAnimalDto,
        code: '002',
        registrationNumber: 'BR-2020-FJ0002',
        propertyId: context.testProperty.id,
        acquisitionDate: '2020-01-15',
      };

      const response = await authenticatedRequest(
        context.app,
        context.mainUserToken,
      )
        .post('/animals')
        .send(dto)
        .expect(201);

      expect(response.body.acquisitionDate).toMatch(/^2020-01-15/);
    });

    it('should fail without add permission', async () => {
      const dto = { ...createAnimalDto, propertyId: context.testProperty.id };
      await request(context.app.getHttpServer())
        .post('/animals')
        .set('Authorization', `Bearer ${context.authToken}`)
        .send(dto)
        .expect(403);
    });

    it('should fail with duplicate code for same company', async () => {
      // Clean up any existing animal with this code first
      await context.prisma.animal.deleteMany({
        where: {
          companyId: context.testCompany.id,
          code: '001',
        },
      });

      const dto = { ...createAnimalDto, propertyId: context.testProperty.id };

      // Create first animal
      await request(context.app.getHttpServer())
        .post('/animals')
        .set('Authorization', `Bearer ${context.mainUserToken}`)
        .send(dto)
        .expect(201);

      // Try to create duplicate
      await request(context.app.getHttpServer())
        .post('/animals')
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

      // Clean up any existing animal with this code in first company
      await context.prisma.animal.deleteMany({
        where: {
          companyId: context.testCompany.id,
          code: '001',
        },
      });

      const dto1 = { ...createAnimalDto, propertyId: context.testProperty.id };
      const dto2 = {
        ...createAnimalDto,
        propertyId: otherProperty.id,
      };

      // Create animal in first company
      await request(context.app.getHttpServer())
        .post('/animals')
        .set('Authorization', `Bearer ${context.mainUserToken}`)
        .send(dto1)
        .expect(201);

      // Activate other company user
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

      // Create animal with same code in second company (should succeed)
      await request(context.app.getHttpServer())
        .post('/animals')
        .set('Authorization', `Bearer ${otherToken}`)
        .send(dto2)
        .expect(201);
    });

    it('should fail if property does not exist', async () => {
      const dto = {
        ...createAnimalDto,
        propertyId: 'non-existent-property-id',
      };
      await request(context.app.getHttpServer())
        .post('/animals')
        .set('Authorization', `Bearer ${context.mainUserToken}`)
        .send(dto)
        .expect(404);
    });

    it('should fail if property belongs to different company', async () => {
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

      const dto = { ...createAnimalDto, propertyId: otherProperty.id };
      await request(context.app.getHttpServer())
        .post('/animals')
        .set('Authorization', `Bearer ${context.mainUserToken}`)
        .send(dto)
        .expect(404);
    });

    it('should validate required fields', async () => {
      await request(context.app.getHttpServer())
        .post('/animals')
        .set('Authorization', `Bearer ${context.mainUserToken}`)
        .send({ code: '003' }) // Missing required fields
        .expect(400);
    });

    it('should validate status enum', async () => {
      await request(context.app.getHttpServer())
        .post('/animals')
        .set('Authorization', `Bearer ${context.mainUserToken}`)
        .send({
          ...createAnimalDto,
          code: '004',
          propertyId: context.testProperty.id,
          status: 'invalid_status',
        })
        .expect(400);
    });

    it('should validate code is not empty', async () => {
      await request(context.app.getHttpServer())
        .post('/animals')
        .set('Authorization', `Bearer ${context.mainUserToken}`)
        .send({
          ...createAnimalDto,
          code: '',
          propertyId: context.testProperty.id,
        })
        .expect(400);
    });
  });

  describe('GET /animals', () => {
    let animalIds: string[] = [];

    beforeEach(async () => {
      // Clean up any existing animals with these codes first
      await context.prisma.animal.deleteMany({
        where: {
          companyId: context.testCompany.id,
          code: { in: ['001', '002', '003'] },
        },
      });

      // Create test animals
      const animals = await Promise.all([
        context.prisma.animal.create({
          data: {
            code: '001',
            registrationNumber: 'BR-2020-FJ0001',
            status: 'active',
            companyId: context.testCompany.id,
            propertyId: context.testProperty.id,
          },
        }),
        context.prisma.animal.create({
          data: {
            code: '002',
            registrationNumber: 'BR-2020-FJ0002',
            status: 'active',
            companyId: context.testCompany.id,
            propertyId: context.testProperty.id,
          },
        }),
        context.prisma.animal.create({
          data: {
            code: '003',
            registrationNumber: 'BR-2020-FJ0003',
            status: 'inactive',
            companyId: context.testCompany.id,
            propertyId: context.testProperty.id,
            deletedAt: new Date(), // Soft deleted
          },
        }),
      ]);
      animalIds = animals.map((a) => a.id);
    });

    afterEach(async () => {
      if (animalIds.length > 0) {
        await context.prisma.animal.deleteMany({
          where: { id: { in: animalIds } },
        });
        animalIds = [];
      }
    });

    it('should return all animals for company', async () => {
      const response = await authenticatedRequest(
        context.app,
        context.mainUserToken,
      )
        .get('/animals')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(2); // Excludes soft-deleted
      expect(response.body[0]).toHaveProperty('id');
      expect(response.body[0]).toHaveProperty('code');
      expect(response.body[0]).toHaveProperty('registrationNumber');
      expect(response.body[0]).toHaveProperty('status');
    });

    it('should exclude soft-deleted animals', async () => {
      const response = await authenticatedRequest(
        context.app,
        context.mainUserToken,
      )
        .get('/animals')
        .expect(200);

      const codes = response.body.map((a: any) => a.code);
      expect(codes).not.toContain('003');
    });

    it('should fail without view permission', async () => {
      // Update regular user to have no view permission
      await context.prisma.user.update({
        where: { email: 'regular@testcompany.com' },
        data: {
          permissions: {
            registration: {
              animals: {
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
        .get('/animals')
        .set('Authorization', `Bearer ${newToken}`)
        .expect(403);
    });
  });

  describe('GET /animals/:id', () => {
    let animalId: string;

    beforeEach(async () => {
      // Clean up any existing animal with this code first
      await context.prisma.animal.deleteMany({
        where: {
          companyId: context.testCompany.id,
          code: '001',
        },
      });

      const animal = await context.prisma.animal.create({
        data: {
          code: '001',
          registrationNumber: 'BR-2020-FJ0001',
          status: 'active',
          companyId: context.testCompany.id,
          propertyId: context.testProperty.id,
        },
      });
      animalId = animal.id;
    });

    afterEach(async () => {
      if (animalId) {
        await context.prisma.animal.deleteMany({
          where: { id: animalId },
        });
      }
    });

    it('should return an animal by id', async () => {
      const response = await request(context.app.getHttpServer())
        .get(`/animals/${animalId}`)
        .set('Authorization', `Bearer ${context.mainUserToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        id: animalId,
        code: '001',
        registrationNumber: 'BR-2020-FJ0001',
        status: 'active',
      });
    });

    it('should return 404 for non-existent animal', async () => {
      await request(context.app.getHttpServer())
        .get('/animals/non-existent-id')
        .set('Authorization', `Bearer ${context.mainUserToken}`)
        .expect(404);
    });

    it('should return 404 for soft-deleted animal', async () => {
      // Soft delete the animal
      await context.prisma.animal.update({
        where: { id: animalId },
        data: { deletedAt: new Date() },
      });

      await request(context.app.getHttpServer())
        .get(`/animals/${animalId}`)
        .set('Authorization', `Bearer ${context.mainUserToken}`)
        .expect(404);
    });
  });

  describe('PUT /animals/:id', () => {
    let animalId: string;

    beforeEach(async () => {
      // Clean up any existing animal with this code first
      await context.prisma.animal.deleteMany({
        where: {
          companyId: context.testCompany.id,
          code: '001',
        },
      });

      const animal = await context.prisma.animal.create({
        data: {
          code: '001',
          registrationNumber: 'BR-2020-FJ0001',
          status: 'active',
          companyId: context.testCompany.id,
          propertyId: context.testProperty.id,
        },
      });
      animalId = animal.id;
    });

    afterEach(async () => {
      if (animalId) {
        await context.prisma.animal.deleteMany({
          where: { id: animalId },
        });
      }
    });

    it('should update an animal', async () => {
      const updateDto = {
        registrationNumber: 'BR-2020-FJ0001-UPDATED',
        status: 'inactive',
      };

      const response = await request(context.app.getHttpServer())
        .put(`/animals/${animalId}`)
        .set('Authorization', `Bearer ${context.mainUserToken}`)
        .send(updateDto)
        .expect(200);

      expect(response.body).toMatchObject({
        id: animalId,
        registrationNumber: 'BR-2020-FJ0001-UPDATED',
        status: 'inactive',
      });
    });

    it('should update animal code', async () => {
      const updateDto = {
        code: '001-UPDATED',
      };

      const response = await request(context.app.getHttpServer())
        .put(`/animals/${animalId}`)
        .set('Authorization', `Bearer ${context.mainUserToken}`)
        .send(updateDto)
        .expect(200);

      expect(response.body.code).toBe('001-UPDATED');
    });

    it('should fail without edit permission', async () => {
      await request(context.app.getHttpServer())
        .put(`/animals/${animalId}`)
        .set('Authorization', `Bearer ${context.authToken}`)
        .send({ registrationNumber: 'UPDATED' })
        .expect(403);
    });

    it('should fail with duplicate code in same company', async () => {
      // Create another animal
      await context.prisma.animal.create({
        data: {
          code: '002',
          registrationNumber: 'BR-2020-FJ0002',
          status: 'active',
          companyId: context.testCompany.id,
          propertyId: context.testProperty.id,
        },
      });

      // Try to update with duplicate code
      await request(context.app.getHttpServer())
        .put(`/animals/${animalId}`)
        .set('Authorization', `Bearer ${context.mainUserToken}`)
        .send({ code: '002' })
        .expect(409);
    });

    it('should allow updating propertyId to valid property', async () => {
      // Create another property
      const otherProperty = await context.prisma.property.create({
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

      const updateDto = {
        propertyId: otherProperty.id,
      };

      const response = await request(context.app.getHttpServer())
        .put(`/animals/${animalId}`)
        .set('Authorization', `Bearer ${context.mainUserToken}`)
        .send(updateDto)
        .expect(200);

      expect(response.body.propertyId).toBe(otherProperty.id);
    });

    it('should update acquisition date', async () => {
      const updateDto = {
        acquisitionDate: '2021-05-20',
      };

      const response = await request(context.app.getHttpServer())
        .put(`/animals/${animalId}`)
        .set('Authorization', `Bearer ${context.mainUserToken}`)
        .send(updateDto)
        .expect(200);

      expect(response.body.acquisitionDate).toMatch(/^2021-05-20/);
    });

    it('should clear acquisition date when set to null', async () => {
      // First set an acquisition date
      await context.prisma.animal.update({
        where: { id: animalId },
        data: { acquisitionDate: new Date('2020-01-15') },
      });

      const updateDto = {
        acquisitionDate: null,
      };

      const response = await request(context.app.getHttpServer())
        .put(`/animals/${animalId}`)
        .set('Authorization', `Bearer ${context.mainUserToken}`)
        .send(updateDto)
        .expect(200);

      expect(response.body.acquisitionDate).toBeUndefined();
    });
  });

  describe('DELETE /animals/:id', () => {
    let animalId: string;

    beforeEach(async () => {
      // Clean up any existing animal with this code first
      await context.prisma.animal.deleteMany({
        where: {
          companyId: context.testCompany.id,
          code: '001',
        },
      });

      const animal = await context.prisma.animal.create({
        data: {
          code: '001',
          registrationNumber: 'BR-2020-FJ0001',
          status: 'active',
          companyId: context.testCompany.id,
          propertyId: context.testProperty.id,
        },
      });
      animalId = animal.id;
    });

    afterEach(async () => {
      if (animalId) {
        await context.prisma.animal.deleteMany({
          where: { id: animalId },
        });
      }
    });

    it('should soft delete an animal', async () => {
      const response = await request(context.app.getHttpServer())
        .delete(`/animals/${animalId}`)
        .set('Authorization', `Bearer ${context.mainUserToken}`)
        .expect(200);

      expect(response.body).toEqual({
        message: 'Animal deleted successfully',
      });

      // Verify soft delete
      const deletedAnimal = await context.prisma.animal.findUnique({
        where: { id: animalId },
      });
      expect(deletedAnimal?.deletedAt).toBeDefined();

      // Verify it's excluded from list
      const listResponse = await request(context.app.getHttpServer())
        .get('/animals')
        .set('Authorization', `Bearer ${context.mainUserToken}`)
        .expect(200);

      expect(
        listResponse.body.find((a: any) => a.id === animalId),
      ).toBeUndefined();
    });

    it('should fail without remove permission', async () => {
      await request(context.app.getHttpServer())
        .delete(`/animals/${animalId}`)
        .set('Authorization', `Bearer ${context.authToken}`)
        .expect(403);
    });

    it('should return 404 for non-existent animal', async () => {
      await request(context.app.getHttpServer())
        .delete('/animals/non-existent-id')
        .set('Authorization', `Bearer ${context.mainUserToken}`)
        .expect(404);
    });
  });

  describe('Company Isolation', () => {
    let otherUser: any;
    let otherToken: string;
    let animalId: string;

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

      // Clean up any existing animal with this code in first company
      await context.prisma.animal.deleteMany({
        where: {
          companyId: context.testCompany.id,
          code: '001',
        },
      });

      // Create animal for first company
      const animal = await context.prisma.animal.create({
        data: {
          code: '001',
          registrationNumber: 'BR-2020-FJ0001',
          status: 'active',
          companyId: context.testCompany.id,
          propertyId: context.testProperty.id,
        },
      });
      animalId = animal.id;
    });

    it('should not allow access to other company animals', async () => {
      await request(context.app.getHttpServer())
        .get(`/animals/${animalId}`)
        .set('Authorization', `Bearer ${otherToken}`)
        .expect(404);
    });

    it('should not allow update of other company animals', async () => {
      await request(context.app.getHttpServer())
        .put(`/animals/${animalId}`)
        .set('Authorization', `Bearer ${otherToken}`)
        .send({ registrationNumber: 'HACKED' })
        .expect(404);
    });

    it('should not allow delete of other company animals', async () => {
      await request(context.app.getHttpServer())
        .delete(`/animals/${animalId}`)
        .set('Authorization', `Bearer ${otherToken}`)
        .expect(404);
    });
  });
});
