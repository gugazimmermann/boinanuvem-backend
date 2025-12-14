import { InventoryMovementsService } from './inventory-movements.service';
import {
  CreateInventoryMovementDto,
  UpdateInventoryMovementDto,
  InventoryMovementType,
} from './dto';
import {
  describeOrSkip,
  setupIntegrationTest,
  teardownIntegrationTest,
  createServiceTestingModule,
  getServiceFromModule,
  IntegrationTestContext,
} from '../../test/integration-test-helpers';
import { createTestInventoryItem } from '../../test/test-data-factories';

describeOrSkip('InventoryMovementsService Integration Tests', () => {
  let service: InventoryMovementsService;
  let context: IntegrationTestContext;
  let testSupplier: any;
  let testInventoryItem: any;
  let testLocation: any;
  let testEmployee: any;
  let testServiceProvider: any;

  beforeAll(async () => {
    context = await setupIntegrationTest({
      cnpj: '11.222.333/0001-26',
      companyName: 'Test Inventory Movements Company',
      email: 'inventory-movements@testcompany.com',
      userEmail: 'user-inventory-movements@testcompany.com',
      createProperty: true,
      createSupplier: true,
      createEmployees: 1,
      createServiceProviders: 1,
    });
    testSupplier = context.testSupplier;
    testEmployee = context.testEmployees[0];
    testServiceProvider = context.testServiceProviders[0];

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
    await teardownIntegrationTest(context, {
      tables: [
        'inventoryMovement',
        'location',
        'inventoryItem',
        'supplier',
        'serviceProvider',
        'employee',
      ],
    });
  });

  beforeEach(async () => {
    const module = await createServiceTestingModule(
      InventoryMovementsService,
      context.prisma,
    );
    service = getServiceFromModule(module, InventoryMovementsService);
  });

  afterEach(async () => {
    await context.prisma.inventoryMovement.deleteMany({
      where: {
        companyId: context.testCompany.id,
      },
    });
  });

  describe('create', () => {
    it('should create a purchase movement with all fields', async () => {
      const createDto: CreateInventoryMovementDto = {
        itemId: testInventoryItem.id,
        type: InventoryMovementType.PURCHASE,
        quantity: 100,
        unitPrice: 2.5,
        date: '2025-01-15',
        description: 'Purchase of feed',
        supplierId: testSupplier.id,
        propertyId: context.testProperty.id,
        locationId: testLocation.id,
        expirationDate: '2025-12-31',
        employeeIds: [testEmployee.id],
        serviceProviderIds: [testServiceProvider.id],
        observation: 'Test observation',
        fileIds: ['file-1', 'file-2'],
      };

      const result = await service.create(context.testUser.id, createDto);

      expect(result).toBeDefined();
      expect(result.itemId).toBe(testInventoryItem.id);
      expect(result.type).toBe(InventoryMovementType.PURCHASE);
      expect(result.quantity).toBe(100);
      expect(result.unitPrice).toBe(2.5);
      expect(result.supplierId).toBe(testSupplier.id);
      expect(result.propertyId).toBe(context.testProperty.id);
      expect(result.locationId).toBe(testLocation.id);
      expect(result.employeeIds).toContain(testEmployee.id);
      expect(result.serviceProviderIds).toContain(testServiceProvider.id);
      expect(result.fileIds).toContain('file-1');
      expect(result.fileIds).toContain('file-2');
    });

    it('should create a consumption movement', async () => {
      const createDto: CreateInventoryMovementDto = {
        itemId: testInventoryItem.id,
        type: InventoryMovementType.CONSUMPTION,
        quantity: 50,
        date: '2025-01-16',
        description: 'Consumption for animals',
        propertyId: context.testProperty.id,
        locationId: testLocation.id,
      };

      const result = await service.create(context.testUser.id, createDto);

      expect(result.type).toBe(InventoryMovementType.CONSUMPTION);
      expect(result.quantity).toBe(50);
      expect(result.supplierId).toBeNull();
    });

    it('should create movement with employees and service providers', async () => {
      const createDto: CreateInventoryMovementDto = {
        itemId: testInventoryItem.id,
        type: InventoryMovementType.CONSUMPTION,
        quantity: 25,
        date: '2025-01-17',
        propertyId: context.testProperty.id,
        employeeIds: [testEmployee.id],
        serviceProviderIds: [testServiceProvider.id],
      };

      const result = await service.create(context.testUser.id, createDto);

      expect(result.employeeIds).toContain(testEmployee.id);
      expect(result.serviceProviderIds).toContain(testServiceProvider.id);
    });

    it('should create movement with expiration date', async () => {
      const createDto: CreateInventoryMovementDto = {
        itemId: testInventoryItem.id,
        type: InventoryMovementType.PURCHASE,
        quantity: 100,
        unitPrice: 2.5,
        date: '2025-01-15',
        supplierId: testSupplier.id,
        propertyId: context.testProperty.id,
        expirationDate: '2025-12-31',
      };

      const result = await service.create(context.testUser.id, createDto);

      expect(result.expirationDate).toBeDefined();
      expect(new Date(result.expirationDate).getFullYear()).toBe(2025);
    });

    it('should transform JSON fields correctly', async () => {
      const createDto: CreateInventoryMovementDto = {
        itemId: testInventoryItem.id,
        type: InventoryMovementType.CONSUMPTION,
        quantity: 30,
        date: '2025-01-18',
        propertyId: context.testProperty.id,
        employeeIds: [testEmployee.id],
        serviceProviderIds: [testServiceProvider.id],
        fileIds: ['file-1'],
      };

      const result = await service.create(context.testUser.id, createDto);

      expect(Array.isArray(result.employeeIds)).toBe(true);
      expect(Array.isArray(result.serviceProviderIds)).toBe(true);
      expect(Array.isArray(result.fileIds)).toBe(true);
    });
  });

  describe('findAll', () => {
    it('should return all movements for company', async () => {
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

      const result = await service.findAll(context.testUser.id);

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('findOne', () => {
    it('should return movement by ID', async () => {
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

      const result = await service.findOne(context.testUser.id, movement.id);

      expect(result.id).toBe(movement.id);
      expect(result.itemId).toBe(testInventoryItem.id);
    });
  });

  describe('findByItemId', () => {
    it('should return movements for specific item', async () => {
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

      const result = await service.findByItemId(
        context.testUser.id,
        testInventoryItem.id,
      );

      expect(Array.isArray(result)).toBe(true);
      expect(result.every((m) => m.itemId === testInventoryItem.id)).toBe(true);
    });
  });

  describe('findByPropertyId', () => {
    it('should return movements for specific property', async () => {
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

      const result = await service.findByPropertyId(
        context.testUser.id,
        context.testProperty.id,
      );

      expect(Array.isArray(result)).toBe(true);
      expect(
        result.every((m) => m.propertyId === context.testProperty.id),
      ).toBe(true);
    });
  });

  describe('findByLocationId', () => {
    it('should return movements for specific location', async () => {
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

      const result = await service.findByLocationId(
        context.testUser.id,
        testLocation.id,
      );

      expect(Array.isArray(result)).toBe(true);
      expect(result.every((m) => m.locationId === testLocation.id)).toBe(true);
    });
  });

  describe('update', () => {
    it('should update movement successfully', async () => {
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

      const updateDto: UpdateInventoryMovementDto = {
        quantity: 150,
        description: 'Updated quantity',
      };

      const result = await service.update(
        context.testUser.id,
        movement.id,
        updateDto,
      );

      expect(result.quantity).toBe(150);
      expect(result.description).toBe('Updated quantity');
    });
  });

  describe('remove', () => {
    it('should soft delete movement', async () => {
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

      await service.remove(context.testUser.id, movement.id);

      const deletedMovement = await context.prisma.inventoryMovement.findUnique(
        {
          where: { id: movement.id },
        },
      );
      expect(deletedMovement?.deletedAt).toBeDefined();
    });
  });
});
