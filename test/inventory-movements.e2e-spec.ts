import {
  setupE2ETest,
  teardownE2ETest,
  authenticatedRequest,
  E2ETestContext,
} from './e2e-test-helpers';
import { InventoryMovementType } from '../src/inventory-movements/dto';
import {
  createTestSupplier,
  createTestInventoryItem,
} from './test-data-factories';

describe('Inventory Movements Management Flow (e2e)', () => {
  let context: E2ETestContext;
  let testSupplier: any;
  let testInventoryItem: any;
  let testLocation: any;

  beforeAll(async () => {
    context = await setupE2ETest({
      companyName: 'Inventory Movements Test Company',
      email: 'inventory-movements@testcompany.com',
      cnpj: '11.222.333/0001-25',
      planName: 'Avançado',
      isTrial: true,
      createProperty: true,
      createEmployees: 1,
      createServiceProviders: 1,
    });

    testSupplier = await createTestSupplier(context.prisma, {
      code: '001',
      name: 'Test Supplier',
      companyId: context.testCompany.id,
    });

    testInventoryItem = await createTestInventoryItem(context.prisma, {
      code: 'INV001',
      name: 'Test Item',
      category: 'feed',
      unit: 'kg',
      minimumStock: 10,
      hasExpiration: false,
      companyId: context.testCompany.id,
    });

    testLocation = await context.prisma.location.create({
      data: {
        code: 'LOC001',
        name: 'Test Location',
        locationType: 'warehouse',
        area: { value: 100, type: 'm2' },
        status: 'active',
        companyId: context.testCompany.id,
        propertyId: context.testProperty.id,
      },
    });
  });

  afterAll(async () => {
    await teardownE2ETest(context);
  });

  describe('POST /inventory-movements', () => {
    it('should create a purchase inventory movement', async () => {
      const createDto = {
        itemId: testInventoryItem.id,
        type: InventoryMovementType.PURCHASE,
        quantity: 100,
        unitPrice: 2.5,
        date: '2025-01-15',
        description: 'Purchase of feed',
        supplierId: testSupplier.id,
        propertyId: context.testProperty.id,
        locationId: testLocation.id,
      };

      const response = await authenticatedRequest(
        context.app,
        context.mainUserToken,
      )
        .post('/inventory-movements')
        .send(createDto)
        .expect(201);

      expect(response.body).toMatchObject({
        itemId: testInventoryItem.id,
        type: InventoryMovementType.PURCHASE,
        quantity: 100,
        unitPrice: 2.5,
        propertyId: context.testProperty.id,
        locationId: testLocation.id,
      });
      expect(response.body.id).toBeDefined();
    });

    it('should create a consumption inventory movement', async () => {
      const createDto = {
        itemId: testInventoryItem.id,
        type: InventoryMovementType.CONSUMPTION,
        quantity: 50,
        date: '2025-01-16',
        description: 'Consumption for animals',
        propertyId: context.testProperty.id,
        locationId: testLocation.id,
        employeeIds: [context.testEmployees[0].id],
      };

      const response = await authenticatedRequest(
        context.app,
        context.mainUserToken,
      )
        .post('/inventory-movements')
        .send(createDto)
        .expect(201);

      expect(response.body.type).toBe(InventoryMovementType.CONSUMPTION);
      expect(response.body.quantity).toBe(50);
      expect(response.body.employeeIds).toContain(context.testEmployees[0].id);
    });

    it('should create with employees and service providers', async () => {
      const createDto = {
        itemId: testInventoryItem.id,
        type: InventoryMovementType.CONSUMPTION,
        quantity: 25,
        date: '2025-01-17',
        propertyId: context.testProperty.id,
        employeeIds: [context.testEmployees[0].id],
        serviceProviderIds: [context.testServiceProviders[0].id],
      };

      const response = await authenticatedRequest(
        context.app,
        context.mainUserToken,
      )
        .post('/inventory-movements')
        .send(createDto)
        .expect(201);

      expect(response.body.employeeIds).toContain(context.testEmployees[0].id);
      expect(response.body.serviceProviderIds).toContain(
        context.testServiceProviders[0].id,
      );
    });

    it('should return 404 if inventory item not found', async () => {
      const createDto = {
        itemId: 'non-existent-id',
        type: InventoryMovementType.PURCHASE,
        quantity: 100,
        date: '2025-01-15',
        propertyId: context.testProperty.id,
      };

      await authenticatedRequest(context.app, context.mainUserToken)
        .post('/inventory-movements')
        .send(createDto)
        .expect(404);
    });

    it('should return 404 if property not found', async () => {
      const createDto = {
        itemId: testInventoryItem.id,
        type: InventoryMovementType.PURCHASE,
        quantity: 100,
        date: '2025-01-15',
        propertyId: 'non-existent-id',
      };

      await authenticatedRequest(context.app, context.mainUserToken)
        .post('/inventory-movements')
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
        itemId: testInventoryItem.id,
        type: InventoryMovementType.CONSUMPTION,
        quantity: 50,
        date: '2025-01-15',
        propertyId: otherProperty.id,
        locationId: testLocation.id, // Location belongs to different property
      };

      await authenticatedRequest(context.app, context.mainUserToken)
        .post('/inventory-movements')
        .send(createDto)
        .expect(404);
    });
  });

  describe('GET /inventory-movements', () => {
    it('should return all inventory movements for company', async () => {
      await context.prisma.inventoryMovement.create({
        data: {
          itemId: testInventoryItem.id,
          type: InventoryMovementType.PURCHASE,
          quantity: 100,
          date: new Date('2025-01-15'),
          propertyId: context.testProperty.id,
          companyId: context.testCompany.id,
        },
      });

      const response = await authenticatedRequest(
        context.app,
        context.mainUserToken,
      )
        .get('/inventory-movements')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('GET /inventory-movements/:id', () => {
    it('should return inventory movement by ID', async () => {
      const movement = await context.prisma.inventoryMovement.create({
        data: {
          itemId: testInventoryItem.id,
          type: InventoryMovementType.PURCHASE,
          quantity: 100,
          date: new Date('2025-01-15'),
          propertyId: context.testProperty.id,
          companyId: context.testCompany.id,
        },
      });

      const response = await authenticatedRequest(
        context.app,
        context.mainUserToken,
      )
        .get(`/inventory-movements/${movement.id}`)
        .expect(200);

      expect(response.body.id).toBe(movement.id);
      expect(response.body.itemId).toBe(testInventoryItem.id);
    });
  });

  describe('GET /inventory-movements/item/:itemId', () => {
    it('should return inventory movements for specific item', async () => {
      await context.prisma.inventoryMovement.create({
        data: {
          itemId: testInventoryItem.id,
          type: InventoryMovementType.PURCHASE,
          quantity: 100,
          date: new Date('2025-01-15'),
          propertyId: context.testProperty.id,
          companyId: context.testCompany.id,
        },
      });

      const response = await authenticatedRequest(
        context.app,
        context.mainUserToken,
      )
        .get(`/inventory-movements/item/${testInventoryItem.id}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(
        response.body.every(
          (movement: any) => movement.itemId === testInventoryItem.id,
        ),
      ).toBe(true);
    });
  });

  describe('GET /inventory-movements/property/:propertyId', () => {
    it('should return inventory movements for specific property', async () => {
      await context.prisma.inventoryMovement.create({
        data: {
          itemId: testInventoryItem.id,
          type: InventoryMovementType.CONSUMPTION,
          quantity: 50,
          date: new Date('2025-01-15'),
          propertyId: context.testProperty.id,
          companyId: context.testCompany.id,
        },
      });

      const response = await authenticatedRequest(
        context.app,
        context.mainUserToken,
      )
        .get(`/inventory-movements/property/${context.testProperty.id}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(
        response.body.every(
          (movement: any) => movement.propertyId === context.testProperty.id,
        ),
      ).toBe(true);
    });
  });

  describe('GET /inventory-movements/location/:locationId', () => {
    it('should return inventory movements for specific location', async () => {
      await context.prisma.inventoryMovement.create({
        data: {
          itemId: testInventoryItem.id,
          type: InventoryMovementType.CONSUMPTION,
          quantity: 25,
          date: new Date('2025-01-15'),
          propertyId: context.testProperty.id,
          locationId: testLocation.id,
          companyId: context.testCompany.id,
        },
      });

      const response = await authenticatedRequest(
        context.app,
        context.mainUserToken,
      )
        .get(`/inventory-movements/location/${testLocation.id}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(
        response.body.every(
          (movement: any) => movement.locationId === testLocation.id,
        ),
      ).toBe(true);
    });
  });

  describe('PUT /inventory-movements/:id', () => {
    it('should update inventory movement successfully', async () => {
      const movement = await context.prisma.inventoryMovement.create({
        data: {
          itemId: testInventoryItem.id,
          type: InventoryMovementType.PURCHASE,
          quantity: 100,
          date: new Date('2025-01-15'),
          propertyId: context.testProperty.id,
          companyId: context.testCompany.id,
        },
      });

      const updateDto = {
        quantity: 150,
        description: 'Updated quantity',
      };

      const response = await authenticatedRequest(
        context.app,
        context.mainUserToken,
      )
        .put(`/inventory-movements/${movement.id}`)
        .send(updateDto)
        .expect(200);

      expect(response.body.quantity).toBe(150);
      expect(response.body.description).toBe('Updated quantity');
    });
  });

  describe('DELETE /inventory-movements/:id', () => {
    it('should soft delete inventory movement successfully', async () => {
      const movement = await context.prisma.inventoryMovement.create({
        data: {
          itemId: testInventoryItem.id,
          type: InventoryMovementType.PURCHASE,
          quantity: 100,
          date: new Date('2025-01-15'),
          propertyId: context.testProperty.id,
          companyId: context.testCompany.id,
        },
      });

      await authenticatedRequest(context.app, context.mainUserToken)
        .delete(`/inventory-movements/${movement.id}`)
        .expect(200);

      const deletedMovement = await context.prisma.inventoryMovement.findUnique(
        {
          where: { id: movement.id },
        },
      );
      expect(deletedMovement?.deletedAt).toBeDefined();
    });
  });
});
