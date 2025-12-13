import { InventoryItemsService } from './inventory-items.service';
import {
  CreateInventoryItemDto,
  UpdateInventoryItemDto,
  InventoryItemCategory,
} from './dto';
import {
  describeOrSkip,
  setupIntegrationTest,
  teardownIntegrationTest,
  createServiceTestingModule,
  getServiceFromModule,
  IntegrationTestContext,
} from '../../test/integration-test-helpers';

describeOrSkip('InventoryItemsService Integration Tests', () => {
  let service: InventoryItemsService;
  let context: IntegrationTestContext;
  let testSupplier: any;

  beforeAll(async () => {
    context = await setupIntegrationTest({
      cnpj: '11.222.333/0001-04',
      companyName: 'Test Inventory Company',
      email: 'inventory@testcompany.com',
      userEmail: 'user-inventory@testcompany.com',
      createProperty: true,
      createSupplier: true,
    });
    testSupplier = context.testSupplier;
  });

  afterAll(async () => {
    await teardownIntegrationTest(context, {
      tables: ['inventoryItemProperty', 'inventoryItem', 'supplier'],
    });
  });

  beforeEach(async () => {
    const module = await createServiceTestingModule(
      InventoryItemsService,
      context.prisma,
    );
    service = getServiceFromModule(module, InventoryItemsService);
  });

  afterEach(async () => {
    await context.prisma.inventoryItemProperty.deleteMany({
      where: {
        inventoryItem: {
          companyId: context.testCompany.id,
        },
      },
    });
    await context.prisma.inventoryItem.deleteMany({
      where: {
        companyId: context.testCompany.id,
      },
    });
  });

  describe('create', () => {
    it('should create an inventory item successfully', async () => {
      const createDto: CreateInventoryItemDto = {
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

      const result = await service.create(context.testUser.id, createDto);

      expect(result).toBeDefined();
      expect(result.code).toBe('INV001');
      expect(result.name).toBe('Test Item');
      expect(result.propertyIds).toContain(context.testProperty.id);
    });

    it('should create item with supplier', async () => {
      const createDto: CreateInventoryItemDto = {
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

      const result = await service.create(context.testUser.id, createDto);

      expect(result).toBeDefined();
      expect(result.supplierId).toBe(testSupplier.id);
      expect(result.hasExpiration).toBe(true);
    });

    it('should throw ConflictException if code already exists', async () => {
      await service.create(context.testUser.id, {
        code: 'INV003',
        name: 'First Item',
        category: InventoryItemCategory.FEED,
        unit: 'kg',
        minimumStock: 10,
        hasExpiration: false,
        propertyIds: [context.testProperty.id],
      });

      await expect(
        service.create(context.testUser.id, {
          code: 'INV003',
          name: 'Second Item',
          category: InventoryItemCategory.FEED,
          unit: 'kg',
          minimumStock: 10,
          hasExpiration: false,
          propertyIds: [context.testProperty.id],
        }),
      ).rejects.toThrow('already exists');
    });

    it('should throw NotFoundException if property not found', async () => {
      const createDto: CreateInventoryItemDto = {
        code: 'INV004',
        name: 'Test Item',
        category: InventoryItemCategory.FEED,
        unit: 'kg',
        minimumStock: 10,
        hasExpiration: false,
        propertyIds: ['non-existent-id'],
      };

      await expect(
        service.create(context.testUser.id, createDto),
      ).rejects.toThrow('not found');
    });
  });

  describe('findAll', () => {
    it('should return all inventory items for company', async () => {
      await service.create(context.testUser.id, {
        code: 'INV005',
        name: 'Item 1',
        category: InventoryItemCategory.FEED,
        unit: 'kg',
        minimumStock: 10,
        hasExpiration: false,
        propertyIds: [context.testProperty.id],
      });

      await service.create(context.testUser.id, {
        code: 'INV006',
        name: 'Item 2',
        category: InventoryItemCategory.MEDICINES,
        unit: 'unit',
        minimumStock: 5,
        hasExpiration: false,
        propertyIds: [context.testProperty.id],
      });

      const result = await service.findAll(context.testUser.id);

      expect(result.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('findOne', () => {
    it('should return inventory item by ID', async () => {
      const created = await service.create(context.testUser.id, {
        code: 'INV007',
        name: 'Test Item',
        category: InventoryItemCategory.FEED,
        unit: 'kg',
        minimumStock: 10,
        hasExpiration: false,
        propertyIds: [context.testProperty.id],
      });

      const result = await service.findOne(context.testUser.id, created.id);

      expect(result).toBeDefined();
      expect(result.id).toBe(created.id);
    });

    it('should throw NotFoundException if item not found', async () => {
      await expect(
        service.findOne(context.testUser.id, 'non-existent-id'),
      ).rejects.toThrow('Inventory item not found');
    });
  });

  describe('update', () => {
    it('should update inventory item successfully', async () => {
      const created = await service.create(context.testUser.id, {
        code: 'INV008',
        name: 'Original Name',
        category: InventoryItemCategory.FEED,
        unit: 'kg',
        minimumStock: 10,
        hasExpiration: false,
        propertyIds: [context.testProperty.id],
      });

      const updateDto: UpdateInventoryItemDto = {
        name: 'Updated Name',
        minimumStock: 20,
      };

      const result = await service.update(
        context.testUser.id,
        created.id,
        updateDto,
      );

      expect(result.name).toBe('Updated Name');
      expect(result.minimumStock).toBe(20);
    });

    it('should update property relations', async () => {
      const secondProperty = await context.prisma.property.create({
        data: {
          code: '002',
          name: 'Second Property',
          area: { value: 200, type: 'hectares' },
          status: 'active',
          companyId: context.testCompany.id,
          street: 'Test Street',
          number: '456',
          neighborhood: 'Test Neighborhood',
          city: 'Test City',
          state: 'SC',
          zipCode: '88395-001',
        },
      });

      const created = await service.create(context.testUser.id, {
        code: 'INV009',
        name: 'Test Item',
        category: InventoryItemCategory.FEED,
        unit: 'kg',
        minimumStock: 10,
        hasExpiration: false,
        propertyIds: [context.testProperty.id],
      });

      const updateDto: UpdateInventoryItemDto = {
        propertyIds: [context.testProperty.id, secondProperty.id],
      };

      const result = await service.update(
        context.testUser.id,
        created.id,
        updateDto,
      );

      expect(result.propertyIds.length).toBe(2);
      expect(result.propertyIds).toContain(context.testProperty.id);
      expect(result.propertyIds).toContain(secondProperty.id);

      await context.prisma.property.delete({
        where: { id: secondProperty.id },
      });
    });
  });

  describe('remove', () => {
    it('should soft delete inventory item', async () => {
      const created = await service.create(context.testUser.id, {
        code: 'INV010',
        name: 'Test Item',
        category: InventoryItemCategory.FEED,
        unit: 'kg',
        minimumStock: 10,
        hasExpiration: false,
        propertyIds: [context.testProperty.id],
      });

      await service.remove(context.testUser.id, created.id);

      // Should not find the item after soft delete
      await expect(
        service.findOne(context.testUser.id, created.id),
      ).rejects.toThrow('Inventory item not found');
    });
  });
});
