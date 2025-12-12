import { SanitaryControlsService } from './sanitary-controls.service';
import { CreateSanitaryControlDto, UpdateSanitaryControlDto } from './dto';
import {
  describeOrSkip,
  setupIntegrationTest,
  teardownIntegrationTest,
  createServiceTestingModule,
  getServiceFromModule,
  IntegrationTestContext,
} from '../../test/integration-test-helpers';
import {
  createTestAnimal,
  createTestInventoryItem,
} from '../../test/test-data-factories';

describeOrSkip('SanitaryControlsService Integration Tests', () => {
  let service: SanitaryControlsService;
  let context: IntegrationTestContext;
  let testAnimal: any;
  let testInventoryItem: any;
  let testEmployee: any;
  let testServiceProvider: any;

  beforeAll(async () => {
    context = await setupIntegrationTest({
      cnpj: '11.222.333/0001-14',
      companyName: 'Test Sanitary Controls Company',
      email: 'sanitary@testcompany.com',
      userEmail: 'user-sanitary@testcompany.com',
      createProperty: true,
      createEmployees: 1,
      createServiceProviders: 1,
    });
    testEmployee = context.testEmployees[0];
    testServiceProvider = context.testServiceProviders[0];

    testAnimal = await createTestAnimal(context.prisma, {
      code: '001',
      registrationNumber: 'BR-2025-SC0001',
      status: 'active',
      companyId: context.testCompany.id,
      propertyId: context.testProperty.id,
    });

    testInventoryItem = await createTestInventoryItem(context.prisma, {
      code: 'MED001',
      name: 'Test Medicine',
      category: 'medicines',
      unit: 'ml',
      minimumStock: 10,
      hasExpiration: false,
      companyId: context.testCompany.id,
    });
  });

  afterAll(async () => {
    await teardownIntegrationTest(context, {
      tables: [
        'sanitaryControl',
        'inventoryItem',
        'animal',
        'serviceProvider',
        'employee',
      ],
    });
  });

  beforeEach(async () => {
    const module = await createServiceTestingModule(
      SanitaryControlsService,
      context.prisma,
    );
    service = getServiceFromModule(module, SanitaryControlsService);
  });

  afterEach(async () => {
    await context.prisma.sanitaryControl.deleteMany({
      where: {
        companyId: context.testCompany.id,
      },
    });
  });

  describe('create', () => {
    it('should create a sanitary control record successfully', async () => {
      const createDto: CreateSanitaryControlDto = {
        animalId: testAnimal.id,
        date: '2025-01-15',
        itemId: testInventoryItem.id,
        quantity: 10,
        calculatedDosage: 5.5,
        observation: 'Test control',
      };

      const result = await service.create(context.testUser.id, createDto);

      expect(result).toBeDefined();
      expect(result.animalId).toBe(testAnimal.id);
      expect(result.itemId).toBe(testInventoryItem.id);
      expect(result.quantity).toBe(10);
    });

    it('should create with employees and service providers', async () => {
      const createDto: CreateSanitaryControlDto = {
        animalId: testAnimal.id,
        date: '2025-01-16',
        itemId: testInventoryItem.id,
        employeeIds: [testEmployee.id],
        serviceProviderIds: [testServiceProvider.id],
      };

      const result = await service.create(context.testUser.id, createDto);

      expect(result).toBeDefined();
      expect(result.employeeIds).toContain(testEmployee.id);
      expect(result.serviceProviderIds).toContain(testServiceProvider.id);
    });

    it('should throw NotFoundException if animal not found', async () => {
      const createDto: CreateSanitaryControlDto = {
        animalId: 'non-existent-id',
        date: '2025-01-15',
        itemId: testInventoryItem.id,
      };

      await expect(
        service.create(context.testUser.id, createDto),
      ).rejects.toThrow('Animal not found');
    });
  });

  describe('findAll', () => {
    it('should return all sanitary control records for company', async () => {
      await service.create(context.testUser.id, {
        animalId: testAnimal.id,
        date: '2025-01-15',
        itemId: testInventoryItem.id,
      });

      await service.create(context.testUser.id, {
        animalId: testAnimal.id,
        date: '2025-01-20',
        itemId: testInventoryItem.id,
      });

      const result = await service.findAll(context.testUser.id);

      expect(result.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('findOne', () => {
    it('should return sanitary control record by ID', async () => {
      const created = await service.create(context.testUser.id, {
        animalId: testAnimal.id,
        date: '2025-01-15',
        itemId: testInventoryItem.id,
        observation: 'Test control',
      });

      const result = await service.findOne(context.testUser.id, created.id);

      expect(result).toBeDefined();
      expect(result.id).toBe(created.id);
    });
  });

  describe('findByAnimalId', () => {
    it('should return sanitary control records for animal', async () => {
      await service.create(context.testUser.id, {
        animalId: testAnimal.id,
        date: '2025-01-15',
        itemId: testInventoryItem.id,
      });

      await service.create(context.testUser.id, {
        animalId: testAnimal.id,
        date: '2025-01-20',
        itemId: testInventoryItem.id,
      });

      const result = await service.findByAnimalId(
        context.testUser.id,
        testAnimal.id,
      );

      expect(result.length).toBeGreaterThanOrEqual(2);
      expect(result.every((sc) => sc.animalId === testAnimal.id)).toBe(true);
    });
  });

  describe('update', () => {
    it('should update sanitary control record successfully', async () => {
      const created = await service.create(context.testUser.id, {
        animalId: testAnimal.id,
        date: '2025-01-15',
        itemId: testInventoryItem.id,
        observation: 'Original observation',
      });

      const updateDto: UpdateSanitaryControlDto = {
        observation: 'Updated observation',
        quantity: 20,
      };

      const result = await service.update(
        context.testUser.id,
        created.id,
        updateDto,
      );

      expect(result.observation).toBe('Updated observation');
      expect(result.quantity).toBe(20);
    });
  });

  describe('remove', () => {
    it('should soft delete sanitary control record', async () => {
      const created = await service.create(context.testUser.id, {
        animalId: testAnimal.id,
        date: '2025-01-15',
        itemId: testInventoryItem.id,
      });

      await service.remove(context.testUser.id, created.id);

      await expect(
        service.findOne(context.testUser.id, created.id),
      ).rejects.toThrow('Sanitary control not found');
    });
  });
});
