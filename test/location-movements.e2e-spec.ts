import {
  setupE2ETest,
  teardownE2ETest,
  authenticatedRequest,
  E2ETestContext,
} from './e2e-test-helpers';
import { LocationMovementType } from '../src/location-movements/dto';

describe('Location Movements Management Flow (e2e)', () => {
  let context: E2ETestContext;
  let testLocation1: any;
  let testLocation2: any;

  beforeAll(async () => {
    context = await setupE2ETest({
      companyName: 'Location Movements Test Company',
      email: 'location-movements@testcompany.com',
      cnpj: '11.222.333/0001-27',
      planName: 'Avançado',
      isTrial: true,
      createProperty: true,
      createEmployees: 1,
      createServiceProviders: 1,
    });

    testLocation1 = await context.prisma.location.create({
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

    testLocation2 = await context.prisma.location.create({
      data: {
        code: 'LOC002',
        name: 'Test Barn',
        locationType: 'barn',
        area: { value: 50, type: 'm2' },
        status: 'active',
        companyId: context.testCompany.id,
        propertyId: context.testProperty.id,
      },
    });
  });

  afterAll(async () => {
    await teardownE2ETest(context);
  });

  describe('POST /location-movements', () => {
    it('should create a location movement', async () => {
      const createDto = {
        companyId: context.testCompany.id,
        propertyId: context.testProperty.id,
        locationIds: [testLocation1.id],
        type: LocationMovementType.FEED_DELIVERY,
        date: '2025-01-15',
        observation: 'Feed delivery completed',
      };

      const response = await authenticatedRequest(
        context.app,
        context.mainUserToken,
      )
        .post('/location-movements')
        .send(createDto)
        .expect(201);

      expect(response.body).toMatchObject({
        propertyId: context.testProperty.id,
        locationIds: [testLocation1.id],
        type: LocationMovementType.FEED_DELIVERY,
      });
      expect(response.body.id).toBeDefined();
    });

    it('should create a movement with multiple locations', async () => {
      const createDto = {
        companyId: context.testCompany.id,
        propertyId: context.testProperty.id,
        locationIds: [testLocation1.id, testLocation2.id],
        type: LocationMovementType.CLEANING,
        date: '2025-01-16',
        employeeIds: [context.testEmployees[0].id],
      };

      const response = await authenticatedRequest(
        context.app,
        context.mainUserToken,
      )
        .post('/location-movements')
        .send(createDto)
        .expect(201);

      expect(response.body.locationIds).toHaveLength(2);
      expect(response.body.employeeIds).toContain(context.testEmployees[0].id);
    });

    it('should create with employees and service providers', async () => {
      const createDto = {
        companyId: context.testCompany.id,
        propertyId: context.testProperty.id,
        locationIds: [testLocation1.id],
        type: LocationMovementType.VETERINARY_SERVICE,
        date: '2025-01-17',
        employeeIds: [context.testEmployees[0].id],
        serviceProviderIds: [context.testServiceProviders[0].id],
      };

      const response = await authenticatedRequest(
        context.app,
        context.mainUserToken,
      )
        .post('/location-movements')
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
        locationIds: [testLocation1.id],
        type: LocationMovementType.FEED_DELIVERY,
        date: '2025-01-15',
      };

      await authenticatedRequest(context.app, context.mainUserToken)
        .post('/location-movements')
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
        locationIds: [testLocation1.id], // Location belongs to different property
        type: LocationMovementType.FEED_DELIVERY,
        date: '2025-01-15',
      };

      await authenticatedRequest(context.app, context.mainUserToken)
        .post('/location-movements')
        .send(createDto)
        .expect(404);
    });
  });

  describe('GET /location-movements', () => {
    it('should return all location movements for company', async () => {
      await context.prisma.locationMovement.create({
        data: {
          companyId: context.testCompany.id,
          propertyId: context.testProperty.id,
          locationIds: JSON.stringify([testLocation1.id]),
          type: LocationMovementType.FEED_DELIVERY,
          date: new Date('2025-01-15'),
        },
      });

      const response = await authenticatedRequest(
        context.app,
        context.mainUserToken,
      )
        .get('/location-movements')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('GET /location-movements/:id', () => {
    it('should return location movement by ID', async () => {
      const movement = await context.prisma.locationMovement.create({
        data: {
          companyId: context.testCompany.id,
          propertyId: context.testProperty.id,
          // Store as JSON array
          locationIds: [testLocation1.id],
          type: LocationMovementType.FEED_DELIVERY,
          date: new Date('2025-01-15'),
        },
      });

      const response = await authenticatedRequest(
        context.app,
        context.mainUserToken,
      )
        .get(`/location-movements/${movement.id}`)
        .expect(200);

      expect(response.body.id).toBe(movement.id);
      expect(response.body.locationIds).toContain(testLocation1.id);
    });
  });

  describe('GET /location-movements/location/:locationId', () => {
    it('should return movements for specific location', async () => {
      await context.prisma.locationMovement.create({
        data: {
          companyId: context.testCompany.id,
          propertyId: context.testProperty.id,
          locationIds: [testLocation1.id, testLocation2.id],
          type: LocationMovementType.CLEANING,
          date: new Date('2025-01-15'),
        },
      });

      const response = await authenticatedRequest(
        context.app,
        context.mainUserToken,
      )
        .get(`/location-movements/location/${testLocation1.id}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(
        response.body.every((movement: any) =>
          movement.locationIds.includes(testLocation1.id),
        ),
      ).toBe(true);
    });
  });

  describe('GET /location-movements/property/:propertyId', () => {
    it('should return movements for specific property', async () => {
      await context.prisma.locationMovement.create({
        data: {
          companyId: context.testCompany.id,
          propertyId: context.testProperty.id,
          locationIds: [testLocation1.id],
          type: LocationMovementType.INSPECTION,
          date: new Date('2025-01-15'),
        },
      });

      const response = await authenticatedRequest(
        context.app,
        context.mainUserToken,
      )
        .get(`/location-movements/property/${context.testProperty.id}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(
        response.body.every(
          (movement: any) => movement.propertyId === context.testProperty.id,
        ),
      ).toBe(true);
    });
  });

  describe('GET /location-movements/type/:type', () => {
    it('should return movements for specific type', async () => {
      await context.prisma.locationMovement.create({
        data: {
          companyId: context.testCompany.id,
          propertyId: context.testProperty.id,
          locationIds: [testLocation1.id],
          type: LocationMovementType.FEED_DELIVERY,
          date: new Date('2025-01-15'),
        },
      });

      const response = await authenticatedRequest(
        context.app,
        context.mainUserToken,
      )
        .get(`/location-movements/type/${LocationMovementType.FEED_DELIVERY}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(
        response.body.every(
          (movement: any) =>
            movement.type === LocationMovementType.FEED_DELIVERY,
        ),
      ).toBe(true);
    });
  });

  describe('PUT /location-movements/:id', () => {
    it('should update location movement successfully', async () => {
      const movement = await context.prisma.locationMovement.create({
        data: {
          companyId: context.testCompany.id,
          propertyId: context.testProperty.id,
          locationIds: JSON.stringify([testLocation1.id]),
          type: LocationMovementType.FEED_DELIVERY,
          date: new Date('2025-01-15'),
        },
      });

      const updateDto = {
        observation: 'Updated observation',
      };

      const response = await authenticatedRequest(
        context.app,
        context.mainUserToken,
      )
        .put(`/location-movements/${movement.id}`)
        .send(updateDto)
        .expect(200);

      expect(response.body.observation).toBe('Updated observation');
    });
  });

  describe('DELETE /location-movements/:id', () => {
    it('should soft delete location movement successfully', async () => {
      const movement = await context.prisma.locationMovement.create({
        data: {
          companyId: context.testCompany.id,
          propertyId: context.testProperty.id,
          locationIds: JSON.stringify([testLocation1.id]),
          type: LocationMovementType.FEED_DELIVERY,
          date: new Date('2025-01-15'),
        },
      });

      await authenticatedRequest(context.app, context.mainUserToken)
        .delete(`/location-movements/${movement.id}`)
        .expect(200);

      const deletedMovement = await context.prisma.locationMovement.findUnique({
        where: { id: movement.id },
      });
      expect(deletedMovement?.deletedAt).toBeDefined();
    });
  });
});
