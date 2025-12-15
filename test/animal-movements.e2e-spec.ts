import {
  setupE2ETest,
  teardownE2ETest,
  authenticatedRequest,
  E2ETestContext,
} from './e2e-test-helpers';
import { createTestAnimal } from './test-data-factories';

describe('Animal Movements Management Flow (e2e)', () => {
  let context: E2ETestContext;
  let testAnimal1: any;
  let testAnimal2: any;
  let testLocation: any;

  beforeAll(async () => {
    context = await setupE2ETest({
      companyName: 'Animal Movements Test Company',
      email: 'animal-movements@testcompany.com',
      cnpj: '11.222.333/0001-26',
      planName: 'Avançado',
      isTrial: true,
      createProperty: true,
      createEmployees: 1,
      createServiceProviders: 1,
    });

    testAnimal1 = await createTestAnimal(context.prisma, {
      code: 'ANM001',
      registrationNumber: 'BR-2020-A001',
      companyId: context.testCompany.id,
      propertyId: context.testProperty.id,
    });

    testAnimal2 = await createTestAnimal(context.prisma, {
      code: 'ANM002',
      registrationNumber: 'BR-2020-A002',
      companyId: context.testCompany.id,
      propertyId: context.testProperty.id,
    });

    testLocation = await context.prisma.location.create({
      data: {
        code: 'LOC001',
        name: 'Test Pasture',
        locationType: 'pasture',
        area: { value: 100, type: 'hectares' },
        status: 'active',
        companyId: context.testCompany.id,
        propertyId: context.testProperty.id,
      },
    });
  });

  afterAll(async () => {
    await teardownE2ETest(context);
  });

  describe('POST /animal-movements', () => {
    it('should create an animal movement', async () => {
      const createDto = {
        companyId: context.testCompany.id,
        propertyId: context.testProperty.id,
        locationId: testLocation.id,
        animalIds: [testAnimal1.id],
        date: '2025-01-15',
        observation: 'Moved to new pasture',
      };

      const response = await authenticatedRequest(
        context.app,
        context.mainUserToken,
      )
        .post('/animal-movements')
        .send(createDto)
        .expect(201);

      expect(response.body).toMatchObject({
        propertyId: context.testProperty.id,
        locationId: testLocation.id,
        animalIds: [testAnimal1.id],
      });
      expect(response.body.id).toBeDefined();
    });

    it('should create a movement with multiple animals', async () => {
      const createDto = {
        companyId: context.testCompany.id,
        propertyId: context.testProperty.id,
        locationId: testLocation.id,
        animalIds: [testAnimal1.id, testAnimal2.id],
        date: '2025-01-16',
        employeeIds: [context.testEmployees[0].id],
      };

      const response = await authenticatedRequest(
        context.app,
        context.mainUserToken,
      )
        .post('/animal-movements')
        .send(createDto)
        .expect(201);

      expect(response.body.animalIds).toHaveLength(2);
      expect(response.body.employeeIds).toContain(context.testEmployees[0].id);
    });

    it('should create with employees and service providers', async () => {
      const createDto = {
        companyId: context.testCompany.id,
        propertyId: context.testProperty.id,
        locationId: testLocation.id,
        animalIds: [testAnimal1.id],
        date: '2025-01-17',
        employeeIds: [context.testEmployees[0].id],
        serviceProviderIds: [context.testServiceProviders[0].id],
      };

      const response = await authenticatedRequest(
        context.app,
        context.mainUserToken,
      )
        .post('/animal-movements')
        .send(createDto)
        .expect(201);

      expect(response.body.employeeIds).toContain(context.testEmployees[0].id);
      expect(response.body.serviceProviderIds).toContain(
        context.testServiceProviders[0].id,
      );
    });

    it('should return 404 if property not found', async () => {
      const createDto = {
        companyId: context.testCompany.id,
        propertyId: 'non-existent-id',
        animalIds: [testAnimal1.id],
        date: '2025-01-15',
      };

      await authenticatedRequest(context.app, context.mainUserToken)
        .post('/animal-movements')
        .send(createDto)
        .expect(404);
    });

    it('should return 404 if location does not belong to property', async () => {
      const otherProperty = await context.prisma.property.create({
        data: {
          code: 'PROP002',
          name: 'Other Property',
          area: { value: 200, type: 'hectares' },
          status: 'active',
          companyId: context.testCompany.id,
          street: 'Test Street',
          number: '123',
          neighborhood: 'Test',
          city: 'Test City',
          state: 'TS',
          zipCode: '12345-678',
        },
      });

      const createDto = {
        companyId: context.testCompany.id,
        propertyId: otherProperty.id,
        locationId: testLocation.id, // Location belongs to different property
        animalIds: [testAnimal1.id],
        date: '2025-01-15',
      };

      await authenticatedRequest(context.app, context.mainUserToken)
        .post('/animal-movements')
        .send(createDto)
        .expect(404);
    });

    it('should return 404 if animal not found', async () => {
      const createDto = {
        companyId: context.testCompany.id,
        propertyId: context.testProperty.id,
        animalIds: ['non-existent-id'],
        date: '2025-01-15',
      };

      await authenticatedRequest(context.app, context.mainUserToken)
        .post('/animal-movements')
        .send(createDto)
        .expect(404);
    });
  });

  describe('GET /animal-movements', () => {
    it('should return all animal movements for company', async () => {
      await context.prisma.animalMovement.create({
        data: {
          companyId: context.testCompany.id,
          propertyId: context.testProperty.id,
          locationId: testLocation.id,
          animalIds: JSON.stringify([testAnimal1.id]),
          date: new Date('2025-01-15'),
        },
      });

      const response = await authenticatedRequest(
        context.app,
        context.mainUserToken,
      )
        .get('/animal-movements')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('GET /animal-movements/:id', () => {
    it('should return animal movement by ID', async () => {
      const movement = await context.prisma.animalMovement.create({
        data: {
          companyId: context.testCompany.id,
          propertyId: context.testProperty.id,
          locationId: testLocation.id,
          // Store as JSON array
          animalIds: [testAnimal1.id],
          date: new Date('2025-01-15'),
        },
      });

      const response = await authenticatedRequest(
        context.app,
        context.mainUserToken,
      )
        .get(`/animal-movements/${movement.id}`)
        .expect(200);

      expect(response.body.id).toBe(movement.id);
      expect(response.body.animalIds).toContain(testAnimal1.id);
    });
  });

  describe('GET /animal-movements/animal/:animalId', () => {
    it('should return movements for specific animal', async () => {
      await context.prisma.animalMovement.create({
        data: {
          companyId: context.testCompany.id,
          propertyId: context.testProperty.id,
          locationId: testLocation.id,
          animalIds: [testAnimal1.id],
          date: new Date('2025-01-15'),
        },
      });

      const response = await authenticatedRequest(
        context.app,
        context.mainUserToken,
      )
        .get(`/animal-movements/animal/${testAnimal1.id}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(
        response.body.every((movement: any) =>
          movement.animalIds.includes(testAnimal1.id),
        ),
      ).toBe(true);
    });
  });

  describe('GET /animal-movements/location/:locationId', () => {
    it('should return movements for specific location', async () => {
      await context.prisma.animalMovement.create({
        data: {
          companyId: context.testCompany.id,
          propertyId: context.testProperty.id,
          locationId: testLocation.id,
          animalIds: [testAnimal1.id],
          date: new Date('2025-01-15'),
        },
      });

      const response = await authenticatedRequest(
        context.app,
        context.mainUserToken,
      )
        .get(`/animal-movements/location/${testLocation.id}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(
        response.body.every(
          (movement: any) => movement.locationId === testLocation.id,
        ),
      ).toBe(true);
    });
  });

  describe('GET /animal-movements/property/:propertyId', () => {
    it('should return movements for specific property', async () => {
      await context.prisma.animalMovement.create({
        data: {
          companyId: context.testCompany.id,
          propertyId: context.testProperty.id,
          locationId: testLocation.id,
          animalIds: JSON.stringify([testAnimal1.id]),
          date: new Date('2025-01-15'),
        },
      });

      const response = await authenticatedRequest(
        context.app,
        context.mainUserToken,
      )
        .get(`/animal-movements/property/${context.testProperty.id}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(
        response.body.every(
          (movement: any) => movement.propertyId === context.testProperty.id,
        ),
      ).toBe(true);
    });
  });

  describe('GET /animal-movements/last-location/:locationId/animals', () => {
    it('should return animals whose last movement is to the specified location', async () => {
      const location2 = await context.prisma.location.create({
        data: {
          code: 'LOC002',
          name: 'Test Pasture 2',
          locationType: 'pasture',
          area: { value: 50, type: 'hectares' },
          status: 'active',
          companyId: context.testCompany.id,
          propertyId: context.testProperty.id,
        },
      });

      // Create older movement to location2
      await context.prisma.animalMovement.create({
        data: {
          companyId: context.testCompany.id,
          propertyId: context.testProperty.id,
          locationId: location2.id,
          animalIds: JSON.stringify([testAnimal1.id]),
          date: new Date('2025-01-10'),
        },
      });

      // Create newer movement to testLocation (should be the last)
      await context.prisma.animalMovement.create({
        data: {
          companyId: context.testCompany.id,
          propertyId: context.testProperty.id,
          locationId: testLocation.id,
          animalIds: JSON.stringify([testAnimal1.id]),
          date: new Date('2025-01-15'),
        },
      });

      const response = await authenticatedRequest(
        context.app,
        context.mainUserToken,
      )
        .get(`/animal-movements/last-location/${testLocation.id}/animals`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body).toContain(testAnimal1.id);
    });
  });

  describe('DELETE /animal-movements/:id', () => {
    it('should soft delete animal movement successfully', async () => {
      const movement = await context.prisma.animalMovement.create({
        data: {
          companyId: context.testCompany.id,
          propertyId: context.testProperty.id,
          locationId: testLocation.id,
          animalIds: JSON.stringify([testAnimal1.id]),
          date: new Date('2025-01-15'),
        },
      });

      await authenticatedRequest(context.app, context.mainUserToken)
        .delete(`/animal-movements/${movement.id}`)
        .expect(200);

      const deletedMovement = await context.prisma.animalMovement.findUnique({
        where: { id: movement.id },
      });
      expect(deletedMovement?.deletedAt).toBeDefined();
    });
  });
});
