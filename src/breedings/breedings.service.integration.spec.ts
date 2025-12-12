import { BreedingsService } from './breedings.service';
import { CreateBreedingDto, UpdateBreedingDto, BreedingMethod } from './dto';
import {
  describeOrSkip,
  setupIntegrationTest,
  teardownIntegrationTest,
  createServiceTestingModule,
  getServiceFromModule,
  IntegrationTestContext,
} from '../../test/integration-test-helpers';
import { createTestAnimal } from '../../test/test-data-factories';

describeOrSkip('BreedingsService Integration Tests', () => {
  let service: BreedingsService;
  let context: IntegrationTestContext;
  let testAnimal: any;
  let testBull: any;
  let testEmployee: any;
  let testServiceProvider: any;

  beforeAll(async () => {
    context = await setupIntegrationTest({
      cnpj: '11.222.333/0001-02',
      companyName: 'Test Breedings Company',
      email: 'breedings@testcompany.com',
      userEmail: 'user-breedings@testcompany.com',
      createProperty: true,
      createEmployees: 1,
      createServiceProviders: 1,
    });
    testEmployee = context.testEmployees[0];
    testServiceProvider = context.testServiceProviders[0];

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
    await teardownIntegrationTest(context, {
      tables: ['breeding', 'animal', 'employee', 'serviceProvider'],
    });
  });

  beforeEach(async () => {
    const module = await createServiceTestingModule(
      BreedingsService,
      context.prisma,
    );
    service = getServiceFromModule(module, BreedingsService);
  });

  afterEach(async () => {
    await context.prisma.breeding.deleteMany({
      where: {
        companyId: context.testCompany.id,
      },
    });
  });

  describe('create', () => {
    it('should create a natural breeding successfully', async () => {
      const createDto: CreateBreedingDto = {
        animalId: testAnimal.id,
        date: '2025-01-15',
        method: BreedingMethod.NATURAL,
        bullId: testBull.id,
        observation: 'Test natural breeding',
      };

      const result = await service.create(context.testUser.id, createDto);

      expect(result).toBeDefined();
      expect(result.animalId).toBe(testAnimal.id);
      expect(result.method).toBe(BreedingMethod.NATURAL);
      expect(result.bullId).toBe(testBull.id);
      expect(result.confirmed).toBe(false);
    });

    it('should create an artificial insemination breeding successfully', async () => {
      const createDto: CreateBreedingDto = {
        animalId: testAnimal.id,
        date: '2025-01-16',
        method: BreedingMethod.ARTIFICIAL_INSEMINATION,
        attemptNumber: 1,
        semenCode: 'SEM001',
        observation: 'Test AI breeding',
      };

      const result = await service.create(context.testUser.id, createDto);

      expect(result).toBeDefined();
      expect(result.method).toBe(BreedingMethod.ARTIFICIAL_INSEMINATION);
      expect(result.attemptNumber).toBe(1);
      expect(result.semenCode).toBe('SEM001');
    });

    it('should create breeding with employees and service providers', async () => {
      const createDto: CreateBreedingDto = {
        animalId: testAnimal.id,
        date: '2025-01-17',
        method: BreedingMethod.NATURAL,
        bullId: testBull.id,
        employeeIds: [testEmployee.id],
        serviceProviderIds: [testServiceProvider.id],
      };

      const result = await service.create(context.testUser.id, createDto);

      expect(result).toBeDefined();
      expect(result.employeeIds).toContain(testEmployee.id);
      expect(result.serviceProviderIds).toContain(testServiceProvider.id);
    });

    it('should throw NotFoundException if animal not found', async () => {
      const createDto: CreateBreedingDto = {
        animalId: 'non-existent-id',
        date: '2025-01-15',
        method: BreedingMethod.NATURAL,
        bullId: testBull.id,
      };

      await expect(
        service.create(context.testUser.id, createDto),
      ).rejects.toThrow('Animal not found');
    });

    it('should throw NotFoundException if bull not found', async () => {
      const createDto: CreateBreedingDto = {
        animalId: testAnimal.id,
        date: '2025-01-15',
        method: BreedingMethod.NATURAL,
        bullId: 'non-existent-id',
      };

      await expect(
        service.create(context.testUser.id, createDto),
      ).rejects.toThrow('Animal not found');
    });
  });

  describe('findAll', () => {
    it('should return all breedings for company', async () => {
      // Create test breedings
      await service.create(context.testUser.id, {
        animalId: testAnimal.id,
        date: '2025-01-15',
        method: BreedingMethod.NATURAL,
        bullId: testBull.id,
      });

      await service.create(context.testUser.id, {
        animalId: testAnimal.id,
        date: '2025-01-16',
        method: BreedingMethod.ARTIFICIAL_INSEMINATION,
        attemptNumber: 1,
        semenCode: 'SEM001',
      });

      const result = await service.findAll(context.testUser.id);

      expect(result.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('findOne', () => {
    it('should return breeding by ID', async () => {
      const createDto: CreateBreedingDto = {
        animalId: testAnimal.id,
        date: '2025-01-15',
        method: BreedingMethod.NATURAL,
        bullId: testBull.id,
      };

      const created = await service.create(context.testUser.id, createDto);
      const result = await service.findOne(context.testUser.id, created.id);

      expect(result).toBeDefined();
      expect(result.id).toBe(created.id);
    });

    it('should throw NotFoundException if breeding not found', async () => {
      await expect(
        service.findOne(context.testUser.id, 'non-existent-id'),
      ).rejects.toThrow('Breeding not found');
    });
  });

  describe('findByAnimalId', () => {
    it('should return breedings for animal', async () => {
      await service.create(context.testUser.id, {
        animalId: testAnimal.id,
        date: '2025-01-15',
        method: BreedingMethod.NATURAL,
        bullId: testBull.id,
      });

      await service.create(context.testUser.id, {
        animalId: testAnimal.id,
        date: '2025-01-20',
        method: BreedingMethod.NATURAL,
        bullId: testBull.id,
      });

      const result = await service.findByAnimalId(
        context.testUser.id,
        testAnimal.id,
      );

      expect(result.length).toBeGreaterThanOrEqual(2);
      expect(result.every((b) => b.animalId === testAnimal.id)).toBe(true);
    });
  });

  describe('update', () => {
    it('should update breeding successfully', async () => {
      const created = await service.create(context.testUser.id, {
        animalId: testAnimal.id,
        date: '2025-01-15',
        method: BreedingMethod.NATURAL,
        bullId: testBull.id,
        observation: 'Original observation',
      });

      const updateDto: UpdateBreedingDto = {
        observation: 'Updated observation',
      };

      const result = await service.update(
        context.testUser.id,
        created.id,
        updateDto,
      );

      expect(result.observation).toBe('Updated observation');
    });

    it('should update breeding method', async () => {
      const created = await service.create(context.testUser.id, {
        animalId: testAnimal.id,
        date: '2025-01-15',
        method: BreedingMethod.NATURAL,
        bullId: testBull.id,
      });

      const updateDto: UpdateBreedingDto = {
        method: BreedingMethod.ARTIFICIAL_INSEMINATION,
        attemptNumber: 1,
        semenCode: 'SEM001',
        bullId: null,
      };

      const result = await service.update(
        context.testUser.id,
        created.id,
        updateDto,
      );

      expect(result.method).toBe(BreedingMethod.ARTIFICIAL_INSEMINATION);
      expect(result.attemptNumber).toBe(1);
    });
  });

  describe('confirm', () => {
    it('should confirm breeding successfully', async () => {
      const created = await service.create(context.testUser.id, {
        animalId: testAnimal.id,
        date: '2025-01-15',
        method: BreedingMethod.NATURAL,
        bullId: testBull.id,
        confirmed: false,
      });

      const result = await service.confirm(context.testUser.id, created.id);

      expect(result.confirmed).toBe(true);
    });
  });

  describe('remove', () => {
    it('should soft delete breeding', async () => {
      const created = await service.create(context.testUser.id, {
        animalId: testAnimal.id,
        date: '2025-01-15',
        method: BreedingMethod.NATURAL,
        bullId: testBull.id,
      });

      await service.remove(context.testUser.id, created.id);

      // Should not find the breeding after soft delete
      await expect(
        service.findOne(context.testUser.id, created.id),
      ).rejects.toThrow('Breeding not found');
    });
  });
});
