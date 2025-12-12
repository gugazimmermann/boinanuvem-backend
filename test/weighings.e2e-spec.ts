import request from 'supertest';
import {
  setupE2ETest,
  teardownE2ETest,
  authenticatedRequest,
  E2ETestContext,
} from './e2e-test-helpers';
import { createTestAnimal } from './test-data-factories';

describe('Weighings Management Flow (e2e)', () => {
  let context: E2ETestContext;
  let testAnimal: any;

  beforeAll(async () => {
    context = await setupE2ETest({
      companyName: 'Weighings Test Company',
      email: 'weighings@testcompany.com',
      cnpj: '11.222.333/0001-55',
      planName: 'Avançado',
      isTrial: true,
      createProperty: true,
      createEmployees: 2,
      createServiceProviders: 1,
      createRegularUser: true,
      regularUserPermissions: {
        records: {
          weighings: {
            view: true,
            add: false,
            edit: false,
            remove: false,
          },
        },
      },
    });

    testAnimal = await createTestAnimal(context.prisma, {
      code: 'WEIGH-001',
      registrationNumber: 'BR-2020-WG0001',
      status: 'active',
      companyId: context.testCompany.id,
      propertyId: context.testProperty.id,
    });
  });

  afterAll(async () => {
    await teardownE2ETest(context);
  });

  describe('POST /weighings', () => {
    const createWeighingDto = {
      animalId: '',
      date: '2020-01-15',
      weight: 350.0,
      employeeIds: [] as string[],
      serviceProviderIds: [] as string[],
      appliedMedicines: [
        {
          itemId: 'medicine-1',
          quantity: 10,
          calculatedDosage: 5.5,
        },
      ],
      observation: 'Test weighing',
    };

    it('should create a weighing successfully', async () => {
      const dto = {
        ...createWeighingDto,
        animalId: testAnimal.id,
        employeeIds: context.testEmployees.map((e) => e.id),
        serviceProviderIds: context.testServiceProviders.map((sp) => sp.id),
      };

      const response = authenticatedRequest(context.app, context.mainUserToken)
        .post('/weighings')
        .send(dto)
        .expect(201);

      expect(response.body).toMatchObject({
        animalId: testAnimal.id,
        weighingDate: expect.stringMatching(/^2020-01-15/),
        weight: 350.0,
        observation: 'Test weighing',
        companyId: context.testCompany.id,
      });
      expect(response.body.id).toBeDefined();
      expect(Array.isArray(response.body.employeeIds)).toBe(true);
      expect(response.body.employeeIds.length).toBe(2);
      expect(Array.isArray(response.body.serviceProviderIds)).toBe(true);
      expect(response.body.serviceProviderIds.length).toBe(1);
    });

    it('should create weighing without service providers', async () => {
      const dto = {
        ...createWeighingDto,
        animalId: testAnimal.id,
        employeeIds: context.testEmployees.map((e) => e.id),
        serviceProviderIds: undefined,
      };

      const response = authenticatedRequest(context.app, context.mainUserToken)
        .post('/weighings')
        .send(dto)
        .expect(201);

      expect(response.body.serviceProviderIds).toEqual([]);
    });

    it('should fail without add permission', async () => {
      const dto = {
        ...createWeighingDto,
        animalId: testAnimal.id,
        employeeIds: context.testEmployees.map((e) => e.id),
      };

      await request(app.getHttpServer())
        .post('/weighings')
        .set('Authorization', `Bearer ${context.authToken}`)
        .send(dto)
        .expect(403);
    });

    it('should fail if animal not found', async () => {
      const dto = {
        ...createWeighingDto,
        animalId: 'non-existent-animal',
        employeeIds: context.testEmployees.map((e) => e.id),
      };

      await request(app.getHttpServer())
        .post('/weighings')
        .set('Authorization', `Bearer ${context.mainUserToken}`)
        .send(dto)
        .expect(404);
    });

    it('should fail if employee not found', async () => {
      const dto = {
        ...createWeighingDto,
        animalId: testAnimal.id,
        employeeIds: ['non-existent-employee'],
      };

      await request(app.getHttpServer())
        .post('/weighings')
        .set('Authorization', `Bearer ${context.mainUserToken}`)
        .send(dto)
        .expect(400);
    });

    it('should validate required fields', async () => {
      await request(app.getHttpServer())
        .post('/weighings')
        .set('Authorization', `Bearer ${context.mainUserToken}`)
        .send({ animalId: testAnimal.id })
        .expect(400);
    });
  });

  describe('GET /weighings', () => {
    let weighingId: string;

    beforeEach(async () => {
      const weighing = await context.prisma.weighing.create({
        data: {
          animalId: testAnimal.id,
          weighingDate: new Date('2020-01-15'),
          weight: 350.0,
          employeeIds: context.testEmployees.map((e) => e.id),
          serviceProviderIds: [],
          companyId: context.testCompany.id,
        },
      });
      weighingId = weighing.id;

      await context.prisma.weighing.create({
        data: {
          animalId: testAnimal.id,
          weighingDate: new Date('2020-02-20'),
          weight: 380.0,
          employeeIds: [],
          serviceProviderIds: [],
          companyId: context.testCompany.id,
          deletedAt: new Date(),
        },
      });
    });

    it('should return all weighings for company', async () => {
      const response = await request(app.getHttpServer())
        .get('/weighings')
        .set('Authorization', `Bearer ${context.mainUserToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(1);
      expect(response.body[0]).toHaveProperty('id');
      expect(response.body[0]).toHaveProperty('weighingDate');
    });

    it('should exclude soft-deleted weighings', async () => {
      const response = await request(app.getHttpServer())
        .get('/weighings')
        .set('Authorization', `Bearer ${context.mainUserToken}`)
        .expect(200);

      const ids = response.body.map((w: any) => w.id);
      expect(ids).toContain(weighingId);
      expect(response.body.length).toBe(1);
    });

    it('should fail without view permission', async () => {
      await context.prisma.user.update({
        where: { email: 'regular@testcompany.com' },
        data: {
          permissions: {
            records: {
              weighings: {
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

      await authenticatedRequest(context.app, newToken)
        .get('/weighings')
        .expect(403);
    });
  });

  describe('GET /weighings/:id', () => {
    let weighingId: string;

    beforeEach(async () => {
      const weighing = await context.prisma.weighing.create({
        data: {
          animalId: testAnimal.id,
          weighingDate: new Date('2020-01-15'),
          weight: 350.0,
          employeeIds: context.testEmployees.map((e) => e.id),
          serviceProviderIds: [],
          companyId: context.testCompany.id,
        },
      });
      weighingId = weighing.id;
    });

    it('should return weighing by ID', async () => {
      const response = await request(app.getHttpServer())
        .get(`/weighings/${weighingId}`)
        .set('Authorization', `Bearer ${context.mainUserToken}`)
        .expect(200);

      expect(response.body.id).toBe(weighingId);
      expect(response.body.companyId).toBe(testCompany.id);
      expect(Array.isArray(response.body.employeeIds)).toBe(true);
    });

    it('should fail if weighing not found', async () => {
      await request(app.getHttpServer())
        .get('/weighings/non-existent-id')
        .set('Authorization', `Bearer ${context.mainUserToken}`)
        .expect(404);
    });
  });

  describe('GET /weighings/animal/:animalId', () => {
    it('should return weighings for animal', async () => {
      await context.prisma.weighing.create({
        data: {
          animalId: testAnimal.id,
          weighingDate: new Date('2020-01-15'),
          weight: 350.0,
          employeeIds: context.testEmployees.map((e) => e.id),
          serviceProviderIds: [],
          companyId: context.testCompany.id,
        },
      });

      await context.prisma.weighing.create({
        data: {
          animalId: testAnimal.id,
          weighingDate: new Date('2020-02-15'),
          weight: 380.0,
          employeeIds: context.testEmployees.map((e) => e.id),
          serviceProviderIds: [],
          companyId: context.testCompany.id,
        },
      });

      const response = await request(app.getHttpServer())
        .get(`/weighings/animal/${testAnimal.id}`)
        .set('Authorization', `Bearer ${context.mainUserToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(2);
      expect(
        response.body.every((w: any) => w.animalId === testAnimal.id),
      ).toBe(true);
    });
  });

  describe('PUT /weighings/:id', () => {
    let weighingId: string;

    beforeEach(async () => {
      const weighing = await context.prisma.weighing.create({
        data: {
          animalId: testAnimal.id,
          weighingDate: new Date('2020-01-15'),
          weight: 350.0,
          employeeIds: context.testEmployees.map((e) => e.id),
          serviceProviderIds: [],
          companyId: context.testCompany.id,
        },
      });
      weighingId = weighing.id;
    });

    it('should update weighing successfully', async () => {
      const updateDto = {
        weight: 400.0,
        observation: 'Updated observation',
      };

      const response = await request(app.getHttpServer())
        .put(`/weighings/${weighingId}`)
        .set('Authorization', `Bearer ${context.mainUserToken}`)
        .send(updateDto)
        .expect(200);

      expect(response.body.weight).toBe(400.0);
      expect(response.body.observation).toBe('Updated observation');
    });

    it('should fail without edit permission', async () => {
      const updateDto = {
        weight: 400.0,
      };

      await request(app.getHttpServer())
        .put(`/weighings/${weighingId}`)
        .set('Authorization', `Bearer ${context.authToken}`)
        .send(updateDto)
        .expect(403);
    });
  });

  describe('DELETE /weighings/:id', () => {
    let weighingId: string;

    beforeEach(async () => {
      const weighing = await context.prisma.weighing.create({
        data: {
          animalId: testAnimal.id,
          weighingDate: new Date('2020-01-15'),
          weight: 350.0,
          employeeIds: context.testEmployees.map((e) => e.id),
          serviceProviderIds: [],
          companyId: context.testCompany.id,
        },
      });
      weighingId = weighing.id;
    });

    it('should soft delete weighing', async () => {
      await request(app.getHttpServer())
        .delete(`/weighings/${weighingId}`)
        .set('Authorization', `Bearer ${context.mainUserToken}`)
        .expect(200);

      const weighing = await context.prisma.weighing.findUnique({
        where: { id: weighingId },
      });
      expect(weighing?.deletedAt).toBeDefined();
    });

    it('should fail without remove permission', async () => {
      await request(app.getHttpServer())
        .delete(`/weighings/${weighingId}`)
        .set('Authorization', `Bearer ${context.authToken}`)
        .expect(403);
    });
  });
});
