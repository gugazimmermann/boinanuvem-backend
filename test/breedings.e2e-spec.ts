import request from 'supertest';
import {
  setupE2ETest,
  teardownE2ETest,
  authenticatedRequest,
  E2ETestContext,
} from './e2e-test-helpers';
import { BreedingMethod } from '../src/breedings/dto';
import { createTestAnimal } from './test-data-factories';

describe('Breedings Management Flow (e2e)', () => {
  let context: E2ETestContext;
  let testAnimal: any;
  let testBull: any;

  beforeAll(async () => {
    context = await setupE2ETest({
      companyName: 'Breedings Test Company',
      email: 'breedings@testcompany.com',
      cnpj: '11.222.333/0001-03',
      planName: 'Avançado',
      isTrial: true,
      createProperty: true,
      createEmployees: 1,
      createServiceProviders: 1,
    });

    testAnimal = await createTestAnimal(context.prisma, {
      code: '001',
      registrationNumber: 'BR-2025-BR0001',
      status: 'active',
      companyId: context.testCompany.id,
      propertyId: context.testProperty.id,
    });

    testBull = await createTestAnimal(context.prisma, {
      code: '002',
      registrationNumber: 'BR-2025-BR0002',
      status: 'active',
      companyId: context.testCompany.id,
      propertyId: context.testProperty.id,
    });
  });

  afterAll(async () => {
    await teardownE2ETest(context);
  });

  describe('POST /breedings', () => {
    it('should create a natural breeding', async () => {
      const createDto = {
        animalId: testAnimal.id,
        date: '2025-01-15',
        method: BreedingMethod.NATURAL,
        bullId: testBull.id,
        observation: 'Test natural breeding',
      };

      const response = await authenticatedRequest(
        context.app,
        context.mainUserToken,
      )
        .post('/breedings')
        .send(createDto)
        .expect(201);

      expect(response.body).toMatchObject({
        animalId: testAnimal.id,
        method: BreedingMethod.NATURAL,
        bullId: testBull.id,
        confirmed: false,
      });
      expect(response.body.id).toBeDefined();
    });

    it('should create an artificial insemination breeding', async () => {
      const createDto = {
        animalId: testAnimal.id,
        date: '2025-01-16',
        method: BreedingMethod.ARTIFICIAL_INSEMINATION,
        attemptNumber: 1,
        semenCode: 'SEM001',
        observation: 'Test AI breeding',
      };

      const response = await authenticatedRequest(
        context.app,
        context.mainUserToken,
      )
        .post('/breedings')
        .send(createDto)
        .expect(201);

      expect(response.body).toMatchObject({
        method: BreedingMethod.ARTIFICIAL_INSEMINATION,
        attemptNumber: 1,
        semenCode: 'SEM001',
      });
    });

    it('should create breeding with employees and service providers', async () => {
      const createDto = {
        animalId: testAnimal.id,
        date: '2025-01-17',
        method: BreedingMethod.NATURAL,
        bullId: testBull.id,
        employeeIds: [context.testEmployees[0].id],
        serviceProviderIds: [context.testServiceProviders[0].id],
      };

      const response = await authenticatedRequest(
        context.app,
        context.mainUserToken,
      )
        .post('/breedings')
        .send(createDto)
        .expect(201);

      expect(response.body.employeeIds).toContain(context.testEmployees[0].id);
      expect(response.body.serviceProviderIds).toContain(
        context.testServiceProviders[0].id,
      );
    });

    it('should return 404 if animal not found', async () => {
      const createDto = {
        animalId: 'non-existent-id',
        date: '2025-01-15',
        method: BreedingMethod.NATURAL,
        bullId: testBull.id,
      };

      await authenticatedRequest(context.app, context.mainUserToken)
        .post('/breedings')
        .send(createDto)
        .expect(404);
    });

    it('should return 401 if not authenticated', async () => {
      const createDto = {
        animalId: testAnimal.id,
        date: '2025-01-15',
        method: BreedingMethod.NATURAL,
        bullId: testBull.id,
      };

      await request(context.app.getHttpServer())
        .post('/breedings')
        .send(createDto)
        .expect(401);
    });
  });

  describe('GET /breedings', () => {
    it('should return all breedings for company', async () => {
      // Create test breedings
      await context.prisma.breeding.create({
        data: {
          animalId: testAnimal.id,
          date: new Date('2025-01-15'),
          method: BreedingMethod.NATURAL,
          bullId: testBull.id,
          companyId: context.testCompany.id,
        },
      });

      await context.prisma.breeding.create({
        data: {
          animalId: testAnimal.id,
          date: new Date('2025-01-16'),
          method: BreedingMethod.ARTIFICIAL_INSEMINATION,
          attemptNumber: 1,
          semenCode: 'SEM001',
          companyId: context.testCompany.id,
        },
      });

      const response = await authenticatedRequest(
        context.app,
        context.mainUserToken,
      )
        .get('/breedings')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThanOrEqual(2);
    });

    it('should return empty array when no breedings exist', async () => {
      // Clean up any existing breedings for this test
      await context.prisma.breeding.deleteMany({
        where: { companyId: context.testCompany.id },
      });

      const response = await authenticatedRequest(
        context.app,
        context.mainUserToken,
      )
        .get('/breedings')
        .expect(200);

      expect(response.body).toEqual([]);
    });
  });

  describe('GET /breedings/:id', () => {
    it('should return breeding by ID', async () => {
      const breeding = await context.prisma.breeding.create({
        data: {
          animalId: testAnimal.id,
          date: new Date('2025-01-15'),
          method: BreedingMethod.NATURAL,
          bullId: testBull.id,
          companyId: context.testCompany.id,
        },
      });

      const response = await authenticatedRequest(
        context.app,
        context.mainUserToken,
      )
        .get(`/breedings/${breeding.id}`)
        .expect(200);

      expect(response.body.id).toBe(breeding.id);
      expect(response.body.animalId).toBe(testAnimal.id);
    });

    it('should return 404 if breeding not found', async () => {
      await authenticatedRequest(context.app, context.mainUserToken)
        .get('/breedings/non-existent-id')
        .expect(404);
    });
  });

  describe('GET /breedings/animal/:animalId', () => {
    it('should return breedings for animal', async () => {
      await context.prisma.breeding.create({
        data: {
          animalId: testAnimal.id,
          date: new Date('2025-01-15'),
          method: BreedingMethod.NATURAL,
          bullId: testBull.id,
          companyId: context.testCompany.id,
        },
      });

      await context.prisma.breeding.create({
        data: {
          animalId: testAnimal.id,
          date: new Date('2025-01-20'),
          method: BreedingMethod.NATURAL,
          bullId: testBull.id,
          companyId: context.testCompany.id,
        },
      });

      const response = await authenticatedRequest(
        context.app,
        context.mainUserToken,
      )
        .get(`/breedings/animal/${testAnimal.id}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThanOrEqual(2);
      expect(
        response.body.every((b: any) => b.animalId === testAnimal.id),
      ).toBe(true);
    });

    it('should return 404 if animal not found', async () => {
      await authenticatedRequest(context.app, context.mainUserToken)
        .get('/breedings/animal/non-existent-id')
        .expect(404);
    });
  });

  describe('PUT /breedings/:id', () => {
    it('should update breeding successfully', async () => {
      const breeding = await context.prisma.breeding.create({
        data: {
          animalId: testAnimal.id,
          date: new Date('2025-01-15'),
          method: BreedingMethod.NATURAL,
          bullId: testBull.id,
          observation: 'Original observation',
          companyId: context.testCompany.id,
        },
      });

      const updateDto = {
        observation: 'Updated observation',
      };

      const response = await authenticatedRequest(
        context.app,
        context.mainUserToken,
      )
        .put(`/breedings/${breeding.id}`)
        .send(updateDto)
        .expect(200);

      expect(response.body.observation).toBe('Updated observation');
    });

    it('should return 404 if breeding not found', async () => {
      const updateDto = {
        observation: 'Updated observation',
      };

      await authenticatedRequest(context.app, context.mainUserToken)
        .put('/breedings/non-existent-id')
        .send(updateDto)
        .expect(404);
    });
  });

  describe('PUT /breedings/:id/confirm', () => {
    it('should confirm breeding successfully', async () => {
      const breeding = await context.prisma.breeding.create({
        data: {
          animalId: testAnimal.id,
          date: new Date('2025-01-15'),
          method: BreedingMethod.NATURAL,
          bullId: testBull.id,
          confirmed: false,
          companyId: context.testCompany.id,
        },
      });

      const response = await authenticatedRequest(
        context.app,
        context.mainUserToken,
      )
        .put(`/breedings/${breeding.id}/confirm`)
        .expect(200);

      expect(response.body.confirmed).toBe(true);
    });

    it('should return 404 if breeding not found', async () => {
      await authenticatedRequest(context.app, context.mainUserToken)
        .put('/breedings/non-existent-id/confirm')
        .expect(404);
    });
  });

  describe('DELETE /breedings/:id', () => {
    it('should soft delete breeding successfully', async () => {
      const breeding = await context.prisma.breeding.create({
        data: {
          animalId: testAnimal.id,
          date: new Date('2025-01-15'),
          method: BreedingMethod.NATURAL,
          bullId: testBull.id,
          companyId: context.testCompany.id,
        },
      });

      await authenticatedRequest(context.app, context.mainUserToken)
        .delete(`/breedings/${breeding.id}`)
        .expect(200);

      // Verify breeding is soft deleted
      const deletedBreeding = await context.prisma.breeding.findUnique({
        where: { id: breeding.id },
      });
      expect(deletedBreeding?.deletedAt).toBeDefined();
    });

    it('should return 404 if breeding not found', async () => {
      await authenticatedRequest(context.app, context.mainUserToken)
        .delete('/breedings/non-existent-id')
        .expect(404);
    });
  });

  describe('GET /breedings/unconfirmed', () => {
    it('should return unconfirmed breedings', async () => {
      // Create confirmed and unconfirmed breedings
      await context.prisma.breeding.create({
        data: {
          animalId: testAnimal.id,
          date: new Date('2025-01-15'),
          method: BreedingMethod.NATURAL,
          bullId: testBull.id,
          confirmed: false,
          companyId: context.testCompany.id,
        },
      });

      await context.prisma.breeding.create({
        data: {
          animalId: testAnimal.id,
          date: new Date('2025-01-16'),
          method: BreedingMethod.NATURAL,
          bullId: testBull.id,
          confirmed: true,
          companyId: context.testCompany.id,
        },
      });

      const response = await authenticatedRequest(
        context.app,
        context.mainUserToken,
      )
        .get('/breedings/unconfirmed')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.every((b: any) => b.confirmed === false)).toBe(true);
    });

    it('should return empty array when no unconfirmed breedings exist', async () => {
      // Clean up and create only confirmed breedings
      await context.prisma.breeding.deleteMany({
        where: { companyId: context.testCompany.id },
      });

      await context.prisma.breeding.create({
        data: {
          animalId: testAnimal.id,
          date: new Date('2025-01-15'),
          method: BreedingMethod.NATURAL,
          bullId: testBull.id,
          confirmed: true,
          companyId: context.testCompany.id,
        },
      });

      const response = await authenticatedRequest(
        context.app,
        context.mainUserToken,
      )
        .get('/breedings/unconfirmed')
        .expect(200);

      expect(response.body).toEqual([]);
    });
  });

  describe('GET /breedings/animal/:animalId/next-attempt', () => {
    it('should return 1 when no breedings exist', async () => {
      const response = await authenticatedRequest(
        context.app,
        context.mainUserToken,
      )
        .get(`/breedings/animal/${testAnimal.id}/next-attempt`)
        .expect(200);

      expect(response.body).toMatchObject({ nextAttemptNumber: 1 });
    });

    it('should calculate next attempt number correctly', async () => {
      // Create AI breedings
      await context.prisma.breeding.create({
        data: {
          animalId: testAnimal.id,
          date: new Date('2025-01-15'),
          method: BreedingMethod.ARTIFICIAL_INSEMINATION,
          attemptNumber: 1,
          semenCode: 'SEM001',
          companyId: context.testCompany.id,
        },
      });

      await context.prisma.breeding.create({
        data: {
          animalId: testAnimal.id,
          date: new Date('2025-01-20'),
          method: BreedingMethod.ARTIFICIAL_INSEMINATION,
          attemptNumber: 2,
          semenCode: 'SEM002',
          companyId: context.testCompany.id,
        },
      });

      const response = await authenticatedRequest(
        context.app,
        context.mainUserToken,
      )
        .get(`/breedings/animal/${testAnimal.id}/next-attempt`)
        .expect(200);

      expect(response.body.nextAttemptNumber).toBe(3);
    });

    it('should return 404 if animal not found', async () => {
      await authenticatedRequest(context.app, context.mainUserToken)
        .get('/breedings/animal/non-existent-id/next-attempt')
        .expect(404);
    });
  });

  describe('GET /breedings/animal/:animalId/pregnant', () => {
    it('should return true when animal is pregnant', async () => {
      await context.prisma.breeding.create({
        data: {
          animalId: testAnimal.id,
          date: new Date('2025-01-15'),
          method: BreedingMethod.NATURAL,
          bullId: testBull.id,
          confirmed: true,
          companyId: context.testCompany.id,
        },
      });

      const response = await authenticatedRequest(
        context.app,
        context.mainUserToken,
      )
        .get(`/breedings/animal/${testAnimal.id}/pregnant`)
        .expect(200);

      expect(response.body).toMatchObject({ isPregnant: true });
    });

    it('should return false when animal is not pregnant', async () => {
      // Clean up confirmed breedings
      await context.prisma.breeding.deleteMany({
        where: {
          animalId: testAnimal.id,
          companyId: context.testCompany.id,
        },
      });

      const response = await authenticatedRequest(
        context.app,
        context.mainUserToken,
      )
        .get(`/breedings/animal/${testAnimal.id}/pregnant`)
        .expect(200);

      expect(response.body).toMatchObject({ isPregnant: false });
    });

    it('should return 404 if animal not found', async () => {
      await authenticatedRequest(context.app, context.mainUserToken)
        .get('/breedings/animal/non-existent-id/pregnant')
        .expect(404);
    });
  });

  describe('GET /breedings/animal/:animalId/most-recent-confirmed', () => {
    it('should return most recent confirmed breeding', async () => {
      await context.prisma.breeding.create({
        data: {
          animalId: testAnimal.id,
          date: new Date('2025-01-15'),
          method: BreedingMethod.NATURAL,
          bullId: testBull.id,
          confirmed: true,
          companyId: context.testCompany.id,
        },
      });

      const recentBreeding = await context.prisma.breeding.create({
        data: {
          animalId: testAnimal.id,
          date: new Date('2025-01-20'),
          method: BreedingMethod.NATURAL,
          bullId: testBull.id,
          confirmed: true,
          companyId: context.testCompany.id,
        },
      });

      const response = await authenticatedRequest(
        context.app,
        context.mainUserToken,
      )
        .get(`/breedings/animal/${testAnimal.id}/most-recent-confirmed`)
        .expect(200);

      expect(response.body.id).toBe(recentBreeding.id);
      expect(response.body.confirmed).toBe(true);
    });

    it('should return null when no confirmed breeding exists', async () => {
      // Clean up confirmed breedings
      await context.prisma.breeding.deleteMany({
        where: {
          animalId: testAnimal.id,
          companyId: context.testCompany.id,
        },
      });

      const response = await authenticatedRequest(
        context.app,
        context.mainUserToken,
      )
        .get(`/breedings/animal/${testAnimal.id}/most-recent-confirmed`)
        .expect(200);

      // NestJS may serialize null as {} in some cases
      // A valid breeding response would always have an id property, so check that it's missing
      expect(response.body.id).toBeUndefined();
      // Also check that it's either null or an empty object
      expect(
        response.body === null ||
          (typeof response.body === 'object' &&
            Object.keys(response.body).length === 0),
      ).toBe(true);
    });

    it('should return 404 if animal not found', async () => {
      await authenticatedRequest(context.app, context.mainUserToken)
        .get('/breedings/animal/non-existent-id/most-recent-confirmed')
        .expect(404);
    });
  });

  describe('GET /breedings/property/:propertyId', () => {
    it('should return breedings for property', async () => {
      await context.prisma.breeding.create({
        data: {
          animalId: testAnimal.id,
          date: new Date('2025-01-15'),
          method: BreedingMethod.NATURAL,
          bullId: testBull.id,
          companyId: context.testCompany.id,
        },
      });

      const response = await authenticatedRequest(
        context.app,
        context.mainUserToken,
      )
        .get(`/breedings/property/${context.testProperty.id}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThanOrEqual(1);
    });

    it('should return empty array when property has no breedings', async () => {
      // Create a new property with no animals
      const emptyProperty = await context.prisma.property.create({
        data: {
          code: 'EMPTY',
          name: 'Empty Property',
          area: { value: 100, type: 'hectares' },
          status: 'active',
          companyId: context.testCompany.id,
          street: 'Test St',
          number: '123',
          neighborhood: 'Test',
          city: 'Test City',
          state: 'TS',
          zipCode: '12345-678',
        },
      });

      const response = await authenticatedRequest(
        context.app,
        context.mainUserToken,
      )
        .get(`/breedings/property/${emptyProperty.id}`)
        .expect(200);

      expect(response.body).toEqual([]);

      // Clean up
      await context.prisma.property.delete({
        where: { id: emptyProperty.id },
      });
    });

    it('should return 404 if property not found', async () => {
      await authenticatedRequest(context.app, context.mainUserToken)
        .get('/breedings/property/non-existent-id')
        .expect(404);
    });
  });

  describe('GET /breedings/property/:propertyId/pregnant', () => {
    it('should return pregnant animal IDs for property', async () => {
      await context.prisma.breeding.create({
        data: {
          animalId: testAnimal.id,
          date: new Date('2025-01-15'),
          method: BreedingMethod.NATURAL,
          bullId: testBull.id,
          confirmed: true,
          companyId: context.testCompany.id,
        },
      });

      const response = await authenticatedRequest(
        context.app,
        context.mainUserToken,
      )
        .get(`/breedings/property/${context.testProperty.id}/pregnant`)
        .expect(200);

      expect(Array.isArray(response.body.animalIds)).toBe(true);
      expect(response.body.animalIds).toContain(testAnimal.id);
    });

    it('should return empty array when no pregnant animals exist', async () => {
      // Clean up confirmed breedings
      await context.prisma.breeding.deleteMany({
        where: {
          companyId: context.testCompany.id,
        },
      });

      const response = await authenticatedRequest(
        context.app,
        context.mainUserToken,
      )
        .get(`/breedings/property/${context.testProperty.id}/pregnant`)
        .expect(200);

      expect(response.body.animalIds).toEqual([]);
    });

    it('should return 404 if property not found', async () => {
      await authenticatedRequest(context.app, context.mainUserToken)
        .get('/breedings/property/non-existent-id/pregnant')
        .expect(404);
    });
  });

  describe('PUT /breedings/animal/:animalId/unconfirm-most-recent', () => {
    it('should unconfirm most recent breeding successfully', async () => {
      const breeding = await context.prisma.breeding.create({
        data: {
          animalId: testAnimal.id,
          date: new Date('2025-01-15'),
          method: BreedingMethod.NATURAL,
          bullId: testBull.id,
          confirmed: true,
          companyId: context.testCompany.id,
        },
      });

      const response = await authenticatedRequest(
        context.app,
        context.mainUserToken,
      )
        .put(`/breedings/animal/${testAnimal.id}/unconfirm-most-recent`)
        .expect(200);

      expect(response.body.confirmed).toBe(false);
      expect(response.body.id).toBe(breeding.id);
    });

    it('should return 404 if animal not found', async () => {
      await authenticatedRequest(context.app, context.mainUserToken)
        .put('/breedings/animal/non-existent-id/unconfirm-most-recent')
        .expect(404);
    });

    it('should return 404 if no confirmed breeding exists', async () => {
      // Clean up confirmed breedings
      await context.prisma.breeding.deleteMany({
        where: {
          animalId: testAnimal.id,
          companyId: context.testCompany.id,
        },
      });

      await authenticatedRequest(context.app, context.mainUserToken)
        .put(`/breedings/animal/${testAnimal.id}/unconfirm-most-recent`)
        .expect(404);
    });
  });
});
