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
        'sanitaryControlItem',
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
    await context.prisma.sanitaryControlItem.deleteMany({
      where: {
        sanitaryControl: {
          companyId: context.testCompany.id,
        },
      },
    });
    await context.prisma.sanitaryControl.deleteMany({
      where: {
        companyId: context.testCompany.id,
      },
    });
  });

  describe('create', () => {
    it('should create a sanitary control record with appliedMedicines array', async () => {
      const createDto: CreateSanitaryControlDto = {
        animalId: testAnimal.id,
        date: '2025-01-15',
        appliedMedicines: [
          {
            itemId: testInventoryItem.id,
            quantity: 10,
            calculatedDosage: 5.5,
          },
        ],
        observation: 'Test control',
      };

      const result = await service.create(context.testUser.id, createDto);

      expect(result).toBeDefined();
      expect(result.animalId).toBe(testAnimal.id);
      expect(Array.isArray(result.appliedMedicines)).toBe(true);
      expect(result.appliedMedicines.length).toBe(1);
      expect(result.appliedMedicines[0]).toMatchObject({
        itemId: testInventoryItem.id,
        quantity: 10,
        calculatedDosage: 5.5,
      });

      // Verify junction table record exists in database
      const junctionRecords = await context.prisma.sanitaryControlItem.findMany(
        {
          where: {
            sanitaryControlId: result.id,
          },
        },
      );
      expect(junctionRecords.length).toBe(1);
      expect(junctionRecords[0].itemId).toBe(testInventoryItem.id);
    });

    it('should create with multiple medicines', async () => {
      const secondItem = await createTestInventoryItem(context.prisma, {
        code: 'MED002',
        name: 'Test Medicine 2',
        category: 'medicines',
        unit: 'ml',
        minimumStock: 10,
        hasExpiration: false,
        companyId: context.testCompany.id,
      });

      const createDto: CreateSanitaryControlDto = {
        animalId: testAnimal.id,
        date: '2025-01-16',
        appliedMedicines: [
          {
            itemId: testInventoryItem.id,
            quantity: 10,
            calculatedDosage: 5.5,
          },
          {
            itemId: secondItem.id,
            quantity: 20,
            calculatedDosage: 10.0,
          },
        ],
      };

      const result = await service.create(context.testUser.id, createDto);

      expect(result.appliedMedicines.length).toBe(2);
      expect(result.appliedMedicines[0].itemId).toBe(testInventoryItem.id);
      expect(result.appliedMedicines[1].itemId).toBe(secondItem.id);

      // Verify both junction table records exist
      const junctionRecords = await context.prisma.sanitaryControlItem.findMany(
        {
          where: {
            sanitaryControlId: result.id,
          },
        },
      );
      expect(junctionRecords.length).toBe(2);
    });

    it('should create with legacy format (backward compatibility)', async () => {
      const createDto: CreateSanitaryControlDto = {
        animalId: testAnimal.id,
        date: '2025-01-17',
        itemId: testInventoryItem.id,
        quantity: 10,
        calculatedDosage: 5.5,
      };

      const result = await service.create(context.testUser.id, createDto);

      expect(result).toBeDefined();
      expect(Array.isArray(result.appliedMedicines)).toBe(true);
      expect(result.appliedMedicines.length).toBe(1);

      // Verify junction table record was created
      const junctionRecords = await context.prisma.sanitaryControlItem.findMany(
        {
          where: {
            sanitaryControlId: result.id,
          },
        },
      );
      expect(junctionRecords.length).toBe(1);
    });

    it('should create with employees and service providers', async () => {
      const createDto: CreateSanitaryControlDto = {
        animalId: testAnimal.id,
        date: '2025-01-18',
        appliedMedicines: [
          {
            itemId: testInventoryItem.id,
            quantity: 10,
          },
        ],
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
        appliedMedicines: [
          {
            itemId: testInventoryItem.id,
            quantity: 10,
          },
        ],
      };

      await expect(
        service.create(context.testUser.id, createDto),
      ).rejects.toThrow('Animal not found');
    });
  });

  describe('findAll', () => {
    it('should return all sanitary control records for company with appliedMedicines', async () => {
      await service.create(context.testUser.id, {
        animalId: testAnimal.id,
        date: '2025-01-15',
        appliedMedicines: [
          {
            itemId: testInventoryItem.id,
            quantity: 10,
          },
        ],
      });

      await service.create(context.testUser.id, {
        animalId: testAnimal.id,
        date: '2025-01-20',
        appliedMedicines: [
          {
            itemId: testInventoryItem.id,
            quantity: 20,
          },
        ],
      });

      const result = await service.findAll(context.testUser.id);

      expect(result.length).toBeGreaterThanOrEqual(2);
      expect(Array.isArray(result[0].appliedMedicines)).toBe(true);
      expect(Array.isArray(result[1].appliedMedicines)).toBe(true);
    });
  });

  describe('findOne', () => {
    it('should return sanitary control record by ID with appliedMedicines', async () => {
      const created = await service.create(context.testUser.id, {
        animalId: testAnimal.id,
        date: '2025-01-15',
        appliedMedicines: [
          {
            itemId: testInventoryItem.id,
            quantity: 10,
            calculatedDosage: 5.5,
          },
        ],
        observation: 'Test control',
      });

      const result = await service.findOne(context.testUser.id, created.id);

      expect(result).toBeDefined();
      expect(result.id).toBe(created.id);
      expect(Array.isArray(result.appliedMedicines)).toBe(true);
      expect(result.appliedMedicines.length).toBe(1);
    });
  });

  describe('findByAnimalId', () => {
    it('should return sanitary control records for animal with appliedMedicines', async () => {
      await service.create(context.testUser.id, {
        animalId: testAnimal.id,
        date: '2025-01-15',
        appliedMedicines: [
          {
            itemId: testInventoryItem.id,
            quantity: 10,
          },
        ],
      });

      await service.create(context.testUser.id, {
        animalId: testAnimal.id,
        date: '2025-01-20',
        appliedMedicines: [
          {
            itemId: testInventoryItem.id,
            quantity: 20,
          },
        ],
      });

      const result = await service.findByAnimalId(
        context.testUser.id,
        testAnimal.id,
      );

      expect(result.length).toBeGreaterThanOrEqual(2);
      expect(result.every((sc) => sc.animalId === testAnimal.id)).toBe(true);
      expect(result.every((sc) => Array.isArray(sc.appliedMedicines))).toBe(
        true,
      );
    });
  });

  describe('update', () => {
    it('should update sanitary control record successfully', async () => {
      const created = await service.create(context.testUser.id, {
        animalId: testAnimal.id,
        date: '2025-01-15',
        appliedMedicines: [
          {
            itemId: testInventoryItem.id,
            quantity: 10,
            calculatedDosage: 5.5,
          },
        ],
        observation: 'Original observation',
      });

      const updateDto: UpdateSanitaryControlDto = {
        observation: 'Updated observation',
      };

      const result = await service.update(
        context.testUser.id,
        created.id,
        updateDto,
      );

      expect(result.observation).toBe('Updated observation');
    });

    it('should update medicines array', async () => {
      const secondItem = await createTestInventoryItem(context.prisma, {
        code: 'MED003',
        name: 'Test Medicine 3',
        category: 'medicines',
        unit: 'ml',
        minimumStock: 10,
        hasExpiration: false,
        companyId: context.testCompany.id,
      });

      const created = await service.create(context.testUser.id, {
        animalId: testAnimal.id,
        date: '2025-01-15',
        appliedMedicines: [
          {
            itemId: testInventoryItem.id,
            quantity: 10,
          },
        ],
      });

      // Verify initial state
      const initialJunctionRecords =
        await context.prisma.sanitaryControlItem.findMany({
          where: { sanitaryControlId: created.id },
        });
      expect(initialJunctionRecords.length).toBe(1);

      const updateDto: UpdateSanitaryControlDto = {
        appliedMedicines: [
          {
            itemId: testInventoryItem.id,
            quantity: 20,
            calculatedDosage: 10.0,
          },
          {
            itemId: secondItem.id,
            quantity: 30,
            calculatedDosage: 15.0,
          },
        ],
      };

      const result = await service.update(
        context.testUser.id,
        created.id,
        updateDto,
      );

      expect(result.appliedMedicines.length).toBe(2);
      expect(result.appliedMedicines[0].quantity).toBe(20);
      expect(result.appliedMedicines[1].itemId).toBe(secondItem.id);

      // Verify old records deleted and new ones created
      const updatedJunctionRecords =
        await context.prisma.sanitaryControlItem.findMany({
          where: { sanitaryControlId: created.id },
        });
      expect(updatedJunctionRecords.length).toBe(2);
    });

    it('should update with empty appliedMedicines array', async () => {
      const created = await service.create(context.testUser.id, {
        animalId: testAnimal.id,
        date: '2025-01-15',
        appliedMedicines: [
          {
            itemId: testInventoryItem.id,
            quantity: 10,
          },
        ],
      });

      const updateDto: UpdateSanitaryControlDto = {
        appliedMedicines: [],
      };

      const result = await service.update(
        context.testUser.id,
        created.id,
        updateDto,
      );

      expect(result.appliedMedicines).toEqual([]);

      // Verify junction records deleted
      const junctionRecords = await context.prisma.sanitaryControlItem.findMany(
        {
          where: { sanitaryControlId: created.id },
        },
      );
      expect(junctionRecords.length).toBe(0);
    });
  });

  describe('remove', () => {
    it('should soft delete sanitary control record', async () => {
      const created = await service.create(context.testUser.id, {
        animalId: testAnimal.id,
        date: '2025-01-15',
        appliedMedicines: [
          {
            itemId: testInventoryItem.id,
            quantity: 10,
          },
        ],
      });

      await service.remove(context.testUser.id, created.id);

      await expect(
        service.findOne(context.testUser.id, created.id),
      ).rejects.toThrow('Sanitary control not found');
    });
  });
});
