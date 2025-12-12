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

      const response = authenticatedRequest(context.app, context.mainUserToken)
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

      const response = authenticatedRequest(context.app, context.mainUserToken)
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

      const response = authenticatedRequest(context.app, context.mainUserToken)
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

      await prisma.breeding.create({
        data: {
          animalId: testAnimal.id,
          date: new Date('2025-01-16'),
          method: BreedingMethod.ARTIFICIAL_INSEMINATION,
          attemptNumber: 1,
          semenCode: 'SEM001',
          companyId: context.testCompany.id,
        },
      });

      const response = authenticatedRequest(context.app, context.mainUserToken)
        .get('/breedings')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThanOrEqual(2);
    });

    it('should return empty array when no breedings exist', async () => {
      const response = authenticatedRequest(context.app, context.mainUserToken)
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

      const response = authenticatedRequest(context.app, context.mainUserToken)
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
      await prisma.breeding.create({
        data: {
          animalId: testAnimal.id,
          date: new Date('2025-01-15'),
          method: BreedingMethod.NATURAL,
          bullId: testBull.id,
          companyId: context.testCompany.id,
        },
      });

      await prisma.breeding.create({
        data: {
          animalId: testAnimal.id,
          date: new Date('2025-01-20'),
          method: BreedingMethod.NATURAL,
          bullId: testBull.id,
          companyId: context.testCompany.id,
        },
      });

      const response = authenticatedRequest(context.app, context.mainUserToken)
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

      const response = authenticatedRequest(context.app, context.mainUserToken)
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

      const response = authenticatedRequest(context.app, context.mainUserToken)
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
});
