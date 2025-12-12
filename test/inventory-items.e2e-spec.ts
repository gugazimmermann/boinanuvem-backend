import {
  setupE2ETest,
  teardownE2ETest,
  authenticatedRequest,
  E2ETestContext,
} from './e2e-test-helpers';
import { InventoryItemCategory } from '../src/inventory-items/dto';
import { createTestSupplier } from './test-data-factories';

describe('Inventory Items Management Flow (e2e)', () => {
  let context: E2ETestContext;
  let testSupplier: any;

  beforeAll(async () => {
    context = await setupE2ETest({
      companyName: 'Inventory Test Company',
      email: 'inventory@testcompany.com',
      cnpj: '11.222.333/0001-05',
      planName: 'Avançado',
      isTrial: true,
      createProperty: true,
    });

    testSupplier = await createTestSupplier(context.prisma, {
      code: '001',
      name: 'Test Supplier',
      companyId: context.testCompany.id,
    });
  });

  afterAll(async () => {
    await teardownE2ETest(context);
  });

  describe('POST /inventory-items', () => {
    it('should create an inventory item', async () => {
      const createDto = {
        code: 'INV001',
        name: 'Test Item',
        description: 'Test description',
        category: InventoryItemCategory.FEED,
        unit: 'kg',
        minimumStock: 10,
        unitPrice: 50.0,
        hasExpiration: false,
        propertyIds: [context.testProperty.id],
      };

      const response = authenticatedRequest(context.app, context.mainUserToken)
        .post('/inventory-items')
        .send(createDto)
        .expect(201);

      expect(response.body).toMatchObject({
        code: 'INV001',
        name: 'Test Item',
        category: InventoryItemCategory.FEED,
        minimumStock: 10,
      });
      expect(response.body.id).toBeDefined();
      expect(response.body.propertyIds).toContain(context.testProperty.id);
    });

    it('should create item with supplier and expiration', async () => {
      const createDto = {
        code: 'INV002',
        name: 'Test Item with Supplier',
        category: InventoryItemCategory.MEDICINES,
        unit: 'unit',
        minimumStock: 5,
        supplierId: testSupplier.id,
        hasExpiration: true,
        expirationDate: '2025-12-31',
        propertyIds: [context.testProperty.id],
      };

      const response = authenticatedRequest(context.app, context.mainUserToken)
        .post('/inventory-items')
        .send(createDto)
        .expect(201);

      expect(response.body.supplierId).toBe(testSupplier.id);
      expect(response.body.hasExpiration).toBe(true);
    });

    it('should return 409 if code already exists', async () => {
      await context.prisma.inventoryItem.create({
        data: {
          code: 'INV003',
          name: 'Existing Item',
          category: InventoryItemCategory.FEED,
          unit: 'kg',
          minimumStock: 10,
          hasExpiration: false,
          companyId: context.testCompany.id,
        },
      });

      const createDto = {
        code: 'INV003',
        name: 'Duplicate Item',
        category: InventoryItemCategory.FEED,
        unit: 'kg',
        minimumStock: 10,
        hasExpiration: false,
        propertyIds: [context.testProperty.id],
      };

      await authenticatedRequest(context.app, context.mainUserToken)
        .post('/inventory-items')
        .send(createDto)
        .expect(409);
    });

    it('should return 404 if property not found', async () => {
      const createDto = {
        code: 'INV004',
        name: 'Test Item',
        category: InventoryItemCategory.FEED,
        unit: 'kg',
        minimumStock: 10,
        hasExpiration: false,
        propertyIds: ['non-existent-id'],
      };

      await authenticatedRequest(context.app, context.mainUserToken)
        .post('/inventory-items')
        .send(createDto)
        .expect(404);
    });

    it('should return 401 if not authenticated', async () => {
      const createDto = {
        code: 'INV005',
        name: 'Test Item',
        category: InventoryItemCategory.FEED,
        unit: 'kg',
        minimumStock: 10,
        hasExpiration: false,
        propertyIds: [context.testProperty.id],
      };

      await request(context.app.getHttpServer())
        .post('/inventory-items')
        .send(createDto)
        .expect(401);
    });
  });

  describe('GET /inventory-items', () => {
    it('should return all inventory items for company', async () => {
      await context.prisma.inventoryItem.create({
        data: {
          code: 'INV006',
          name: 'Item 1',
          category: InventoryItemCategory.FEED,
          unit: 'kg',
          minimumStock: 10,
          hasExpiration: false,
          companyId: context.testCompany.id,
        },
      });

      await context.prisma.inventoryItem.create({
        data: {
          code: 'INV007',
          name: 'Item 2',
          category: InventoryItemCategory.MEDICINES,
          unit: 'unit',
          minimumStock: 5,
          hasExpiration: false,
          companyId: context.testCompany.id,
        },
      });

      const response = authenticatedRequest(context.app, context.mainUserToken)
        .get('/inventory-items')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThanOrEqual(2);
    });

    it('should return empty array when no items exist', async () => {
      const response = authenticatedRequest(context.app, context.mainUserToken)
        .get('/inventory-items')
        .expect(200);

      expect(response.body).toEqual([]);
    });
  });

  describe('GET /inventory-items/:id', () => {
    it('should return inventory item by ID', async () => {
      const item = await prisma.inventoryItem.create({
        data: {
          code: 'INV008',
          name: 'Test Item',
          category: InventoryItemCategory.FEED,
          unit: 'kg',
          minimumStock: 10,
          hasExpiration: false,
          companyId: context.testCompany.id,
        },
      });

      const response = authenticatedRequest(context.app, context.mainUserToken)
        .get(`/inventory-items/${item.id}`)
        .expect(200);

      expect(response.body.id).toBe(item.id);
      expect(response.body.code).toBe('INV008');
    });

    it('should return 404 if item not found', async () => {
      await authenticatedRequest(context.app, context.mainUserToken)
        .get('/inventory-items/non-existent-id')
        .expect(404);
    });
  });

  describe('PUT /inventory-items/:id', () => {
    it('should update inventory item successfully', async () => {
      const item = await prisma.inventoryItem.create({
        data: {
          code: 'INV009',
          name: 'Original Name',
          category: InventoryItemCategory.FEED,
          unit: 'kg',
          minimumStock: 10,
          hasExpiration: false,
          companyId: context.testCompany.id,
        },
      });

      const updateDto = {
        name: 'Updated Name',
        minimumStock: 20,
      };

      const response = authenticatedRequest(context.app, context.mainUserToken)
        .put(`/inventory-items/${item.id}`)
        .send(updateDto)
        .expect(200);

      expect(response.body.name).toBe('Updated Name');
      expect(response.body.minimumStock).toBe(20);
    });

    it('should return 404 if item not found', async () => {
      const updateDto = {
        name: 'Updated Name',
      };

      await authenticatedRequest(context.app, context.mainUserToken)
        .put('/inventory-items/non-existent-id')
        .send(updateDto)
        .expect(404);
    });

    it('should return 409 if code already exists', async () => {
      await context.prisma.inventoryItem.create({
        data: {
          code: 'INV010',
          name: 'Existing Item',
          category: InventoryItemCategory.FEED,
          unit: 'kg',
          minimumStock: 10,
          hasExpiration: false,
          companyId: context.testCompany.id,
        },
      });

      const item = await prisma.inventoryItem.create({
        data: {
          code: 'INV011',
          name: 'Item to Update',
          category: InventoryItemCategory.FEED,
          unit: 'kg',
          minimumStock: 10,
          hasExpiration: false,
          companyId: context.testCompany.id,
        },
      });

      const updateDto = {
        code: 'INV010',
      };

      await request(app.getHttpServer())
        .put(`/inventory-items/${item.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateDto)
        .expect(409);
    });
  });

  describe('DELETE /inventory-items/:id', () => {
    it('should soft delete inventory item successfully', async () => {
      const item = await prisma.inventoryItem.create({
        data: {
          code: 'INV012',
          name: 'Test Item',
          category: InventoryItemCategory.FEED,
          unit: 'kg',
          minimumStock: 10,
          hasExpiration: false,
          companyId: context.testCompany.id,
        },
      });

      await authenticatedRequest(context.app, context.mainUserToken)
        .delete(`/inventory-items/${item.id}`)
        .expect(200);

      // Verify item is soft deleted
      const deletedItem = await context.prisma.inventoryItem.findUnique({
        where: { id: item.id },
      });
      expect(deletedItem?.deletedAt).toBeDefined();
    });

    it('should return 404 if item not found', async () => {
      await authenticatedRequest(context.app, context.mainUserToken)
        .delete('/inventory-items/non-existent-id')
        .expect(404);
    });
  });
});
