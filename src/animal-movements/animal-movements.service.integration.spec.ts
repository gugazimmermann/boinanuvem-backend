import { AnimalMovementsService } from './animal-movements.service';
import { CreateAnimalMovementDto, AnimalMovementResponseDto } from './dto';
import {
  describeOrSkip,
  setupIntegrationTest,
  teardownIntegrationTest,
  createServiceTestingModule,
  getServiceFromModule,
  IntegrationTestContext,
} from '../../test/integration-test-helpers';
import { createTestAnimal } from '../../test/test-data-factories';

describeOrSkip('AnimalMovementsService Integration Tests', () => {
  let service: AnimalMovementsService;
  let context: IntegrationTestContext;
  let testAnimal1: any;
  let testAnimal2: any;
  let testLocation1: any;
  let testLocation2: any;
  let testEmployee: any;
  let testServiceProvider: any;

  beforeAll(async () => {
    context = await setupIntegrationTest({
      cnpj: '11.222.333/0001-28',
      companyName: 'Test Animal Movements Company',
      email: 'animal-movements-int@testcompany.com',
      userEmail: 'user-animal-movements@testcompany.com',
      createProperty: true,
      createAnimals: 0,
      createEmployees: 1,
      createServiceProviders: 1,
    });

    testEmployee = context.testEmployees[0];
    testServiceProvider = context.testServiceProviders[0];

    testAnimal1 = await createTestAnimal(context.prisma, {
      code: 'ANM001',
      registrationNumber: 'BR-2020-A001',
      companyId: context.testCompany.id,
      propertyId: context.testProperty!.id,
    });

    testAnimal2 = await createTestAnimal(context.prisma, {
      code: 'ANM002',
      registrationNumber: 'BR-2020-A002',
      companyId: context.testCompany.id,
      propertyId: context.testProperty!.id,
    });

    testLocation1 = await context.prisma.location.create({
      data: {
        code: 'LOC001',
        name: 'Test Pasture 1',
        locationType: 'pasture',
        area: { value: 100, type: 'hectares' },
        status: 'active',
        companyId: context.testCompany.id,
        propertyId: context.testProperty!.id,
      },
    });

    testLocation2 = await context.prisma.location.create({
      data: {
        code: 'LOC002',
        name: 'Test Pasture 2',
        locationType: 'pasture',
        area: { value: 80, type: 'hectares' },
        status: 'active',
        companyId: context.testCompany.id,
        propertyId: context.testProperty!.id,
      },
    });
  });

  afterAll(async () => {
    await teardownIntegrationTest(context, {
      tables: [
        'animalMovement',
        'location',
        'animal',
        'employee',
        'serviceProvider',
      ],
    });
  });

  beforeEach(async () => {
    const module = await createServiceTestingModule(
      AnimalMovementsService,
      context.prisma,
    );
    service = getServiceFromModule(module, AnimalMovementsService);
  });

  afterEach(async () => {
    await context.prisma.animalMovement.deleteMany({
      where: {
        companyId: context.testCompany.id,
      },
    });
  });

  describe('create', () => {
    it('should create a movement with all fields and transform JSON correctly', async () => {
      const createDto: CreateAnimalMovementDto = {
        propertyId: context.testProperty!.id,
        locationId: testLocation1.id,
        animalIds: [testAnimal1.id, testAnimal2.id],
        employeeIds: [testEmployee.id],
        serviceProviderIds: [testServiceProvider.id],
        date: '2025-01-15',
        observation: 'Moved to new pasture',
        fileIds: ['file-1', 'file-2'],
      };

      const result = await service.create(context.testUser.id, createDto);

      expect(result).toBeDefined();
      expect(result.propertyId).toBe(context.testProperty!.id);
      expect(result.locationId).toBe(testLocation1.id);
      expect(result.animalIds).toEqual([testAnimal1.id, testAnimal2.id]);
      expect(result.employeeIds).toContain(testEmployee.id);
      expect(result.serviceProviderIds).toContain(testServiceProvider.id);
      expect(result.fileIds).toContain('file-1');
    });

    it('should fail when property does not belong to company', async () => {
      // Ensure we don't hit unique constraints if tests run multiple times
      await context.prisma.company.deleteMany({
        where: {
          cnpj: '22.333.444/0001-99',
        },
      });

      const otherCompany = await context.prisma.company.create({
        data: {
          cnpj: '22.333.444/0001-99',
          companyName: 'Other Company',
          email: `other-animal-movements+${Date.now()}@testcompany.com`,
          phone: '(11) 11111-1111',
          street: 'Other Street',
          number: '123',
          neighborhood: 'Other',
          city: 'Other City',
          state: 'SC',
          zipCode: '00000-000',
        },
      });

      const otherProperty = await context.prisma.property.create({
        data: {
          code: 'P002',
          name: 'Other Property',
          area: { value: 50, type: 'hectares' },
          status: 'active',
          companyId: otherCompany.id,
          street: 'Other Street',
          number: '123',
          neighborhood: 'Other',
          city: 'Other City',
          state: 'SC',
          zipCode: '00000-000',
        },
      });

      const createDto: CreateAnimalMovementDto = {
        propertyId: otherProperty.id,
        animalIds: [testAnimal1.id],
        date: '2025-01-15',
      };

      await expect(
        service.create(context.testUser.id, createDto),
      ).rejects.toThrow(
        'Property not found or does not belong to your company',
      );
    });

    it('should fail when any animal does not belong to company/property', async () => {
      const otherProperty = await context.prisma.property.create({
        data: {
          code: 'P003',
          name: 'Other Property 2',
          area: { value: 60, type: 'hectares' },
          status: 'active',
          companyId: context.testCompany.id,
          street: 'Other Street',
          number: '123',
          neighborhood: 'Other',
          city: 'Other City',
          state: 'SC',
          zipCode: '00000-000',
        },
      });

      const otherAnimal = await createTestAnimal(context.prisma, {
        code: 'ANM999',
        registrationNumber: 'BR-2020-A999',
        companyId: context.testCompany.id,
        propertyId: otherProperty.id,
      });

      const createDto: CreateAnimalMovementDto = {
        propertyId: context.testProperty!.id,
        animalIds: [testAnimal1.id, otherAnimal.id],
        date: '2025-01-15',
      };

      await expect(
        service.create(context.testUser.id, createDto),
      ).rejects.toThrow(
        'One or more animals not found or do not belong to your company/property',
      );
    });
  });

  describe('findAllForCompany & filters', () => {
    let movement1: AnimalMovementResponseDto;

    beforeEach(async () => {
      movement1 = await service.create(context.testUser.id, {
        propertyId: context.testProperty!.id,
        locationId: testLocation1.id,
        animalIds: [testAnimal1.id],
        employeeIds: [testEmployee.id],
        date: '2025-01-15',
      });

      await service.create(context.testUser.id, {
        propertyId: context.testProperty!.id,
        locationId: testLocation2.id,
        animalIds: [testAnimal2.id],
        serviceProviderIds: [testServiceProvider.id],
        date: '2025-01-16',
      });
    });

    it('should return all movements for company', async () => {
      const result = await service.findAllForCompany(context.testUser.id);
      expect(result.length).toBeGreaterThanOrEqual(2);
    });

    it('should return movement by ID', async () => {
      const found = await service.findOne(context.testUser.id, movement1.id);
      expect(found.id).toBe(movement1.id);
    });

    it('should filter by animalId', async () => {
      const result = await service.findByAnimalId(
        context.testUser.id,
        testAnimal1.id,
      );
      expect(result.every((m) => m.animalIds.includes(testAnimal1.id))).toBe(
        true,
      );
    });

    it('should filter by locationId', async () => {
      const result = await service.findByLocationId(
        context.testUser.id,
        testLocation2.id,
      );
      expect(result.every((m) => m.locationId === testLocation2.id)).toBe(true);
    });

    it('should filter by propertyId', async () => {
      const result = await service.findByPropertyId(
        context.testUser.id,
        context.testProperty!.id,
      );
      expect(
        result.every((m) => m.propertyId === context.testProperty!.id),
      ).toBe(true);
    });

    it('should filter by employeeId', async () => {
      const result = await service.findByEmployeeId(
        context.testUser.id,
        testEmployee.id,
      );
      expect(result.every((m) => m.employeeIds.includes(testEmployee.id))).toBe(
        true,
      );
    });

    it('should filter by serviceProviderId', async () => {
      const result = await service.findByServiceProviderId(
        context.testUser.id,
        testServiceProvider.id,
      );
      expect(
        result.every((m) =>
          m.serviceProviderIds.includes(testServiceProvider.id),
        ),
      ).toBe(true);
    });

    it('should return animals by last movement location', async () => {
      // Create an older movement for testAnimal1 to location2
      await service.create(context.testUser.id, {
        propertyId: context.testProperty!.id,
        locationId: testLocation2.id,
        animalIds: [testAnimal1.id],
        date: '2025-01-10',
      });

      // Create a newer movement for testAnimal1 to location1
      await service.create(context.testUser.id, {
        propertyId: context.testProperty!.id,
        locationId: testLocation1.id,
        animalIds: [testAnimal1.id],
        date: '2025-01-20',
      });

      const result = await service.findAnimalsByLastMovementLocation(
        context.testUser.id,
        testLocation1.id,
      );

      expect(result).toContain(testAnimal1.id);
    });
  });

  describe('remove', () => {
    it('should soft delete movement', async () => {
      const movement = await service.create(context.testUser.id, {
        propertyId: context.testProperty!.id,
        locationId: testLocation1.id,
        animalIds: [testAnimal1.id],
        date: '2025-01-15',
      });

      await service.remove(context.testUser.id, movement.id);

      const deleted = await context.prisma.animalMovement.findUnique({
        where: { id: movement.id },
      });
      expect(deleted?.deletedAt).toBeDefined();
    });
  });
});
