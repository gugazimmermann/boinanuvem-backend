import request from 'supertest';
import {
  setupE2ETest,
  teardownE2ETest,
  authenticatedRequest,
  E2ETestContext,
} from './e2e-test-helpers';

describe('Animal Observations Management Flow (e2e)', () => {
  let context: E2ETestContext;
  let testAnimal: any;

  beforeAll(async () => {
    context = await setupE2ETest({
      companyName: 'Animal Observations Test Company',
      email: 'animal-obs@testcompany.com',
      cnpj: '11.222.333/0001-15',
      planName: 'Avançado',
      isTrial: true,
      createProperty: true,
    });

    testAnimal = await context.prisma.animal.create({
      data: {
        code: '001',
        registrationNumber: 'BR-2020-FJ0001',
        status: 'active',
        companyId: context.testCompany.id,
        propertyId: context.testProperty.id,
      },
    });
  });

  afterAll(async () => {
    await teardownE2ETest(context);
  });

  describe('POST /animals/:animalId/observations', () => {
    it('should create an observation successfully', async () => {
      const createDto = {
        observation: 'Test observation',
        fileIds: ['file-1', 'file-2'],
      };

      const response = await authenticatedRequest(
        context.app,
        context.mainUserToken,
      )
        .post(`/animals/${testAnimal.id}/observations`)
        .send(createDto)
        .expect(201);

      expect(response.body).toMatchObject({
        animalId: testAnimal.id,
        observation: 'Test observation',
        companyId: context.testCompany.id,
      });
      expect(response.body.id).toBeDefined();
      expect(response.body.fileIds).toEqual(['file-1', 'file-2']);
    });

    it('should return 401 if not authenticated', async () => {
      await request(context.app.getHttpServer())
        .post(`/animals/${testAnimal.id}/observations`)
        .send({ observation: 'Test' })
        .expect(401);
    });

    it('should return 404 if animal not found', async () => {
      await authenticatedRequest(context.app, context.mainUserToken)
        .post('/animals/non-existent-id/observations')
        .send({ observation: 'Test' })
        .expect(404);
    });
  });

  describe('GET /animals/:animalId/observations', () => {
    it('should return all observations for an animal', async () => {
      await context.prisma.animalObservation.createMany({
        data: [
          {
            animalId: testAnimal.id,
            observation: 'Observation 1',
            companyId: context.testCompany.id,
            createdBy: context.testUser.id,
          },
          {
            animalId: testAnimal.id,
            observation: 'Observation 2',
            companyId: context.testCompany.id,
            createdBy: context.testUser.id,
          },
        ],
      });

      const response = await authenticatedRequest(
        context.app,
        context.mainUserToken,
      )
        .get(`/animals/${testAnimal.id}/observations`)
        .expect(200);

      expect(response.body.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('GET /animal-observations/:id', () => {
    it('should return an observation by id', async () => {
      const obs = await context.prisma.animalObservation.create({
        data: {
          animalId: testAnimal.id,
          observation: 'Test observation',
          companyId: context.testCompany.id,
          createdBy: context.testUser.id,
        },
      });

      const response = await authenticatedRequest(
        context.app,
        context.mainUserToken,
      )
        .get(`/animal-observations/${obs.id}`)
        .expect(200);

      expect(response.body.id).toBe(obs.id);
      expect(response.body.observation).toBe('Test observation');
    });

    it('should return 404 if observation not found', async () => {
      await authenticatedRequest(context.app, context.mainUserToken)
        .get('/animal-observations/non-existent-id')
        .expect(404);
    });
  });

  describe('PUT /animal-observations/:id', () => {
    it('should update an observation', async () => {
      const obs = await context.prisma.animalObservation.create({
        data: {
          animalId: testAnimal.id,
          observation: 'Original',
          companyId: context.testCompany.id,
          createdBy: context.testUser.id,
        },
      });

      const response = await authenticatedRequest(
        context.app,
        context.mainUserToken,
      )
        .put(`/animal-observations/${obs.id}`)
        .send({ observation: 'Updated' })
        .expect(200);

      expect(response.body.observation).toBe('Updated');
    });
  });

  describe('DELETE /animal-observations/:id', () => {
    it('should delete an observation', async () => {
      const obs = await context.prisma.animalObservation.create({
        data: {
          animalId: testAnimal.id,
          observation: 'To delete',
          companyId: context.testCompany.id,
          createdBy: context.testUser.id,
        },
      });

      await authenticatedRequest(context.app, context.mainUserToken)
        .delete(`/animal-observations/${obs.id}`)
        .expect(200);

      const deleted = await context.prisma.animalObservation.findUnique({
        where: { id: obs.id },
      });
      expect(deleted?.deletedAt).toBeDefined();
    });
  });
});
