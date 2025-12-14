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
    // Also clean up births to ensure test isolation
    await context.prisma.birth.deleteMany({
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

  describe('findUnconfirmed', () => {
    it('should return only unconfirmed breedings', async () => {
      // Create confirmed and unconfirmed breedings
      await service.create(context.testUser.id, {
        animalId: testAnimal.id,
        date: '2025-01-15',
        method: BreedingMethod.NATURAL,
        bullId: testBull.id,
        confirmed: false,
      });

      const confirmedBreeding = await service.create(context.testUser.id, {
        animalId: testAnimal.id,
        date: '2025-01-16',
        method: BreedingMethod.NATURAL,
        bullId: testBull.id,
        confirmed: true,
      });

      await service.confirm(context.testUser.id, confirmedBreeding.id);

      const result = await service.findUnconfirmed(context.testUser.id);

      expect(result.length).toBeGreaterThanOrEqual(1);
      expect(result.every((b) => b.confirmed === false)).toBe(true);
    });

    it('should return empty array when all breedings are confirmed', async () => {
      const breeding = await service.create(context.testUser.id, {
        animalId: testAnimal.id,
        date: '2025-01-15',
        method: BreedingMethod.NATURAL,
        bullId: testBull.id,
        confirmed: false,
      });

      await service.confirm(context.testUser.id, breeding.id);

      const result = await service.findUnconfirmed(context.testUser.id);

      expect(result).toEqual([]);
    });
  });

  describe('getNextAttemptNumber', () => {
    it('should return 1 when no breedings exist', async () => {
      const result = await service.getNextAttemptNumber(
        context.testUser.id,
        testAnimal.id,
      );

      expect(result).toEqual({ nextAttemptNumber: 1 });
    });

    it('should return next attempt number when no birth exists', async () => {
      // Create AI breedings without birth
      await service.create(context.testUser.id, {
        animalId: testAnimal.id,
        date: '2025-01-15',
        method: BreedingMethod.ARTIFICIAL_INSEMINATION,
        attemptNumber: 1,
        semenCode: 'SEM001',
      });

      await service.create(context.testUser.id, {
        animalId: testAnimal.id,
        date: '2025-01-20',
        method: BreedingMethod.ARTIFICIAL_INSEMINATION,
        attemptNumber: 2,
        semenCode: 'SEM002',
      });

      const result = await service.getNextAttemptNumber(
        context.testUser.id,
        testAnimal.id,
      );

      expect(result).toEqual({ nextAttemptNumber: 3 });
    });

    it('should return next attempt number after most recent birth', async () => {
      // Create a calf animal for the birth
      const calf = await createTestAnimal(context.prisma, {
        code: 'CALF-002',
        registrationNumber: 'BR-2025-CL0002',
        status: 'active',
        companyId: context.testCompany.id,
        propertyId: context.testProperty.id,
      });

      // Create a birth where testAnimal is the mother
      const birth = await context.prisma.birth.create({
        data: {
          animalId: calf.id,
          motherId: testAnimal.id,
          birthDate: new Date('2025-01-10'),
          companyId: context.testCompany.id,
        },
      });

      // Create AI breedings before and after birth
      await service.create(context.testUser.id, {
        animalId: testAnimal.id,
        date: '2025-01-05',
        method: BreedingMethod.ARTIFICIAL_INSEMINATION,
        attemptNumber: 1,
        semenCode: 'SEM001',
      });

      await service.create(context.testUser.id, {
        animalId: testAnimal.id,
        date: '2025-01-15',
        method: BreedingMethod.ARTIFICIAL_INSEMINATION,
        attemptNumber: 1,
        semenCode: 'SEM002',
      });

      await service.create(context.testUser.id, {
        animalId: testAnimal.id,
        date: '2025-01-20',
        method: BreedingMethod.ARTIFICIAL_INSEMINATION,
        attemptNumber: 2,
        semenCode: 'SEM003',
      });

      const result = await service.getNextAttemptNumber(
        context.testUser.id,
        testAnimal.id,
      );

      expect(result).toEqual({ nextAttemptNumber: 3 });

      // Clean up
      await context.prisma.birth.delete({ where: { id: birth.id } });
      await context.prisma.animal.delete({ where: { id: calf.id } });
    });

    it('should return 1 when no breedings after birth', async () => {
      // Clean up any existing breedings and births for this animal to ensure test isolation
      await context.prisma.breeding.deleteMany({
        where: {
          animalId: testAnimal.id,
          companyId: context.testCompany.id,
        },
      });
      await context.prisma.birth.deleteMany({
        where: {
          motherId: testAnimal.id,
          companyId: context.testCompany.id,
        },
      });

      // Create AI breeding first (before birth)
      await service.create(context.testUser.id, {
        animalId: testAnimal.id,
        date: '2025-01-15',
        method: BreedingMethod.ARTIFICIAL_INSEMINATION,
        attemptNumber: 1,
        semenCode: 'SEM001',
      });

      // Create a calf animal for the birth
      const calf = await createTestAnimal(context.prisma, {
        code: 'CALF-001',
        registrationNumber: 'BR-2025-CL0001',
        status: 'active',
        companyId: context.testCompany.id,
        propertyId: context.testProperty.id,
      });

      // Create a birth where testAnimal is the mother (on a much later date)
      const birth = await context.prisma.birth.create({
        data: {
          animalId: calf.id,
          motherId: testAnimal.id,
          birthDate: new Date('2025-02-01'),
          companyId: context.testCompany.id,
        },
      });

      const result = await service.getNextAttemptNumber(
        context.testUser.id,
        testAnimal.id,
      );

      expect(result).toEqual({ nextAttemptNumber: 1 });

      // Clean up
      await context.prisma.birth.delete({ where: { id: birth.id } });
      await context.prisma.animal.delete({ where: { id: calf.id } });
    });

    it('should ignore natural breedings when calculating attempt number', async () => {
      await service.create(context.testUser.id, {
        animalId: testAnimal.id,
        date: '2025-01-15',
        method: BreedingMethod.NATURAL,
        bullId: testBull.id,
      });

      await service.create(context.testUser.id, {
        animalId: testAnimal.id,
        date: '2025-01-20',
        method: BreedingMethod.ARTIFICIAL_INSEMINATION,
        attemptNumber: 1,
        semenCode: 'SEM001',
      });

      const result = await service.getNextAttemptNumber(
        context.testUser.id,
        testAnimal.id,
      );

      expect(result).toEqual({ nextAttemptNumber: 2 });
    });
  });

  describe('isAnimalPregnant', () => {
    it('should return true when animal has confirmed breeding', async () => {
      const breeding = await service.create(context.testUser.id, {
        animalId: testAnimal.id,
        date: '2025-01-15',
        method: BreedingMethod.NATURAL,
        bullId: testBull.id,
        confirmed: false,
      });

      await service.confirm(context.testUser.id, breeding.id);

      const result = await service.isAnimalPregnant(
        context.testUser.id,
        testAnimal.id,
      );

      expect(result).toEqual({ isPregnant: true });
    });

    it('should return false when animal has no confirmed breeding', async () => {
      await service.create(context.testUser.id, {
        animalId: testAnimal.id,
        date: '2025-01-15',
        method: BreedingMethod.NATURAL,
        bullId: testBull.id,
        confirmed: false,
      });

      const result = await service.isAnimalPregnant(
        context.testUser.id,
        testAnimal.id,
      );

      expect(result).toEqual({ isPregnant: false });
    });

    it('should return false when animal has no breedings', async () => {
      const result = await service.isAnimalPregnant(
        context.testUser.id,
        testAnimal.id,
      );

      expect(result).toEqual({ isPregnant: false });
    });
  });

  describe('getMostRecentConfirmedBreeding', () => {
    it('should return most recent confirmed breeding', async () => {
      const olderBreeding = await service.create(context.testUser.id, {
        animalId: testAnimal.id,
        date: '2025-01-15',
        method: BreedingMethod.NATURAL,
        bullId: testBull.id,
        confirmed: false,
      });

      const recentBreeding = await service.create(context.testUser.id, {
        animalId: testAnimal.id,
        date: '2025-01-20',
        method: BreedingMethod.NATURAL,
        bullId: testBull.id,
        confirmed: false,
      });

      await service.confirm(context.testUser.id, olderBreeding.id);
      await service.confirm(context.testUser.id, recentBreeding.id);

      const result = await service.getMostRecentConfirmedBreeding(
        context.testUser.id,
        testAnimal.id,
      );

      expect(result).toBeDefined();
      expect(result?.id).toBe(recentBreeding.id);
      expect(result?.confirmed).toBe(true);
    });

    it('should return null when no confirmed breeding exists', async () => {
      await service.create(context.testUser.id, {
        animalId: testAnimal.id,
        date: '2025-01-15',
        method: BreedingMethod.NATURAL,
        bullId: testBull.id,
        confirmed: false,
      });

      const result = await service.getMostRecentConfirmedBreeding(
        context.testUser.id,
        testAnimal.id,
      );

      expect(result).toBeNull();
    });

    it('should ignore unconfirmed breedings', async () => {
      await service.create(context.testUser.id, {
        animalId: testAnimal.id,
        date: '2025-01-15',
        method: BreedingMethod.NATURAL,
        bullId: testBull.id,
        confirmed: false,
      });

      const confirmedBreeding = await service.create(context.testUser.id, {
        animalId: testAnimal.id,
        date: '2025-01-10',
        method: BreedingMethod.NATURAL,
        bullId: testBull.id,
        confirmed: false,
      });

      await service.confirm(context.testUser.id, confirmedBreeding.id);

      const result = await service.getMostRecentConfirmedBreeding(
        context.testUser.id,
        testAnimal.id,
      );

      expect(result?.id).toBe(confirmedBreeding.id);
    });
  });

  describe('findByPropertyId', () => {
    it('should return breedings for property', async () => {
      await service.create(context.testUser.id, {
        animalId: testAnimal.id,
        date: '2025-01-15',
        method: BreedingMethod.NATURAL,
        bullId: testBull.id,
      });

      const result = await service.findByPropertyId(
        context.testUser.id,
        context.testProperty.id,
      );

      expect(result.length).toBeGreaterThanOrEqual(1);
      expect(result.every((b) => b.animalId === testAnimal.id)).toBe(true);
    });

    it('should return empty array when property has no animals', async () => {
      // Create a new property with no animals
      const emptyProperty = await context.prisma.property.create({
        data: {
          code: 'EMPTY',
          name: 'Empty Property',
          area: { value: 100, type: 'hectares' },
          status: 'active',
          companyId: context.testCompany.id,
          street: 'Test St',
          number: '123',
          neighborhood: 'Test',
          city: 'Test City',
          state: 'TS',
          zipCode: '12345-678',
        },
      });

      const result = await service.findByPropertyId(
        context.testUser.id,
        emptyProperty.id,
      );

      expect(result).toEqual([]);

      // Clean up
      await context.prisma.property.delete({ where: { id: emptyProperty.id } });
    });

    it('should only return breedings for animals in the property', async () => {
      // Create another animal in a different property
      const otherProperty = await context.prisma.property.create({
        data: {
          code: 'OTHER',
          name: 'Other Property',
          area: { value: 200, type: 'hectares' },
          status: 'active',
          companyId: context.testCompany.id,
          street: 'Other St',
          number: '456',
          neighborhood: 'Other',
          city: 'Other City',
          state: 'TS',
          zipCode: '12345-678',
        },
      });

      const otherAnimal = await createTestAnimal(context.prisma, {
        code: '003',
        registrationNumber: 'BR-2025-BR0003',
        status: 'active',
        companyId: context.testCompany.id,
        propertyId: otherProperty.id,
      });

      await service.create(context.testUser.id, {
        animalId: testAnimal.id,
        date: '2025-01-15',
        method: BreedingMethod.NATURAL,
        bullId: testBull.id,
      });

      await service.create(context.testUser.id, {
        animalId: otherAnimal.id,
        date: '2025-01-16',
        method: BreedingMethod.NATURAL,
        bullId: testBull.id,
      });

      const result = await service.findByPropertyId(
        context.testUser.id,
        context.testProperty.id,
      );

      expect(result.every((b) => b.animalId === testAnimal.id)).toBe(true);
      expect(result.some((b) => b.animalId === otherAnimal.id)).toBe(false);

      // Clean up
      await context.prisma.animal.delete({ where: { id: otherAnimal.id } });
      await context.prisma.property.delete({ where: { id: otherProperty.id } });
    });
  });

  describe('getPregnantAnimalsByProperty', () => {
    it('should return pregnant animal IDs for property', async () => {
      const breeding = await service.create(context.testUser.id, {
        animalId: testAnimal.id,
        date: '2025-01-15',
        method: BreedingMethod.NATURAL,
        bullId: testBull.id,
        confirmed: false,
      });

      await service.confirm(context.testUser.id, breeding.id);

      const result = await service.getPregnantAnimalsByProperty(
        context.testUser.id,
        context.testProperty.id,
      );

      expect(result.animalIds).toContain(testAnimal.id);
    });

    it('should return unique animal IDs', async () => {
      // Create multiple confirmed breedings for same animal
      const breeding1 = await service.create(context.testUser.id, {
        animalId: testAnimal.id,
        date: '2025-01-15',
        method: BreedingMethod.NATURAL,
        bullId: testBull.id,
        confirmed: false,
      });

      const breeding2 = await service.create(context.testUser.id, {
        animalId: testAnimal.id,
        date: '2025-01-20',
        method: BreedingMethod.NATURAL,
        bullId: testBull.id,
        confirmed: false,
      });

      await service.confirm(context.testUser.id, breeding1.id);
      await service.confirm(context.testUser.id, breeding2.id);

      const result = await service.getPregnantAnimalsByProperty(
        context.testUser.id,
        context.testProperty.id,
      );

      expect(result.animalIds.filter((id) => id === testAnimal.id).length).toBe(
        1,
      );
    });

    it('should return empty array when no pregnant animals exist', async () => {
      await service.create(context.testUser.id, {
        animalId: testAnimal.id,
        date: '2025-01-15',
        method: BreedingMethod.NATURAL,
        bullId: testBull.id,
        confirmed: false,
      });

      const result = await service.getPregnantAnimalsByProperty(
        context.testUser.id,
        context.testProperty.id,
      );

      expect(result.animalIds).toEqual([]);
    });

    it('should only return confirmed breedings', async () => {
      await service.create(context.testUser.id, {
        animalId: testAnimal.id,
        date: '2025-01-15',
        method: BreedingMethod.NATURAL,
        bullId: testBull.id,
        confirmed: false,
      });

      const confirmedBreeding = await service.create(context.testUser.id, {
        animalId: testAnimal.id,
        date: '2025-01-20',
        method: BreedingMethod.NATURAL,
        bullId: testBull.id,
        confirmed: false,
      });

      await service.confirm(context.testUser.id, confirmedBreeding.id);

      const result = await service.getPregnantAnimalsByProperty(
        context.testUser.id,
        context.testProperty.id,
      );

      expect(result.animalIds).toContain(testAnimal.id);
    });
  });

  describe('unconfirmMostRecentBreeding', () => {
    it('should unconfirm most recent confirmed breeding', async () => {
      const olderBreeding = await service.create(context.testUser.id, {
        animalId: testAnimal.id,
        date: '2025-01-15',
        method: BreedingMethod.NATURAL,
        bullId: testBull.id,
        confirmed: false,
      });

      const recentBreeding = await service.create(context.testUser.id, {
        animalId: testAnimal.id,
        date: '2025-01-20',
        method: BreedingMethod.NATURAL,
        bullId: testBull.id,
        confirmed: false,
      });

      await service.confirm(context.testUser.id, olderBreeding.id);
      await service.confirm(context.testUser.id, recentBreeding.id);

      const result = await service.unconfirmMostRecentBreeding(
        context.testUser.id,
        testAnimal.id,
      );

      expect(result.id).toBe(recentBreeding.id);
      expect(result.confirmed).toBe(false);

      // Verify older breeding is still confirmed
      const olderResult = await service.findOne(
        context.testUser.id,
        olderBreeding.id,
      );
      expect(olderResult.confirmed).toBe(true);
    });

    it('should throw NotFoundException when no confirmed breeding exists', async () => {
      await service.create(context.testUser.id, {
        animalId: testAnimal.id,
        date: '2025-01-15',
        method: BreedingMethod.NATURAL,
        bullId: testBull.id,
        confirmed: false,
      });

      await expect(
        service.unconfirmMostRecentBreeding(context.testUser.id, testAnimal.id),
      ).rejects.toThrow('No confirmed breeding found');
    });

    it('should throw NotFoundException when animal not found', async () => {
      await expect(
        service.unconfirmMostRecentBreeding(
          context.testUser.id,
          'non-existent-id',
        ),
      ).rejects.toThrow('Animal not found');
    });
  });
});
