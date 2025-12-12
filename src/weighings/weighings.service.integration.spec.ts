import { WeighingsService } from './weighings.service';
import { CreateWeighingDto, UpdateWeighingDto } from './dto';
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
  createTestEmployees,
  createTestServiceProviders,
} from '../../test/test-data-factories';

describeOrSkip('WeighingsService Integration Tests', () => {
  let service: WeighingsService;
  let context: IntegrationTestContext;
  let testAnimal: any;
  let testEmployees: any[];
  let testServiceProviders: any[];

  beforeAll(async () => {
    context = await setupIntegrationTest({
      cnpj: '11.222.333/0001-03',
      companyName: 'Test Weighings Company',
      email: 'weighings@testcompany.com',
      userEmail: 'user-weighings@testcompany.com',
      createProperty: true,
      createEmployees: 2,
      createServiceProviders: 1,
    });
    testEmployees = context.testEmployees;
    testServiceProviders = context.testServiceProviders;
  });

  beforeEach(async () => {
    const module = await createServiceTestingModule(
      WeighingsService,
      context.prisma,
    );
    service = getServiceFromModule(module, WeighingsService);

    // Clean up existing test data
    try {
      await context.prisma.weighing.deleteMany({
        where: {
          companyId: context.testCompany.id,
        },
      });
    } catch {
      // Ignore if table doesn't exist
    }
    await context.prisma.animal.deleteMany({
      where: {
        companyId: context.testCompany.id,
      },
    });
    await context.prisma.employee.deleteMany({
      where: {
        companyId: context.testCompany.id,
      },
    });
    await context.prisma.serviceProvider.deleteMany({
      where: {
        companyId: context.testCompany.id,
      },
    });

    // Recreate employees and service providers
    testEmployees = await createTestEmployees(context.prisma, 2, {
      companyId: context.testCompany.id,
    });
    testServiceProviders = await createTestServiceProviders(context.prisma, 1, {
      companyId: context.testCompany.id,
    });

    // Create test animal
    testAnimal = await createTestAnimal(context.prisma, {
      code: 'WEIGH-001',
      registrationNumber: 'BR-2020-WG0001',
      status: 'active',
      companyId: context.testCompany.id,
      propertyId: context.testProperty.id,
    });
  });

  afterEach(async () => {
    try {
      await context.prisma.weighing.deleteMany({
        where: {
          companyId: context.testCompany.id,
        },
      });
    } catch {
      // Ignore if table doesn't exist
    }
    await context.prisma.animal.deleteMany({
      where: {
        companyId: context.testCompany.id,
      },
    });
    await context.prisma.employee.deleteMany({
      where: {
        companyId: context.testCompany.id,
      },
    });
    await context.prisma.serviceProvider.deleteMany({
      where: {
        companyId: context.testCompany.id,
      },
    });
  });

  afterAll(async () => {
    await teardownIntegrationTest(context, {
      tables: ['weighing', 'animal', 'employee', 'serviceProvider'],
    });
  });

  describe('create with real database', () => {
    it('should create a weighing successfully', async () => {
      const createDto: CreateWeighingDto = {
        animalId: testAnimal.id,
        date: '2020-01-15',
        weight: 350.0,
        employeeIds: testEmployees.map((e) => e.id),
        serviceProviderIds: testServiceProviders.map((sp) => sp.id),
        appliedMedicines: [
          {
            itemId: 'medicine-1',
            quantity: 10,
            calculatedDosage: 5.5,
          },
        ],
        observation: 'Test weighing',
      };

      const result = await service.create(context.testUser.id, createDto);

      expect(result).toMatchObject({
        animalId: testAnimal.id,
        weighingDate: new Date('2020-01-15'),
        weight: 350.0,
        observation: 'Test weighing',
        companyId: context.testCompany.id,
      });
      expect(result.id).toBeDefined();
      expect(Array.isArray(result.employeeIds)).toBe(true);
      expect(result.employeeIds.length).toBe(2);
      expect(Array.isArray(result.serviceProviderIds)).toBe(true);
      expect(result.serviceProviderIds.length).toBe(1);
      expect(result.appliedMedicines).toBeDefined();
    });

    it('should create weighing without service providers', async () => {
      const createDto: CreateWeighingDto = {
        animalId: testAnimal.id,
        date: '2020-01-15',
        weight: 350.0,
        employeeIds: testEmployees.map((e) => e.id),
        observation: 'Test weighing',
      };

      const result = await service.create(context.testUser.id, createDto);

      expect(result.serviceProviderIds).toEqual([]);
    });

    it('should throw BadRequestException if employee not found', async () => {
      const createDto: CreateWeighingDto = {
        animalId: testAnimal.id,
        date: '2020-01-15',
        weight: 350.0,
        employeeIds: ['non-existent-employee'],
      };

      await expect(
        service.create(context.testUser.id, createDto),
      ).rejects.toThrow('not found');
    });

    it('should throw BadRequestException if service provider not found', async () => {
      const createDto: CreateWeighingDto = {
        animalId: testAnimal.id,
        date: '2020-01-15',
        weight: 350.0,
        employeeIds: testEmployees.map((e) => e.id),
        serviceProviderIds: ['non-existent-provider'],
      };

      await expect(
        service.create(context.testUser.id, createDto),
      ).rejects.toThrow('not found');
    });
  });

  describe('findAll', () => {
    it('should return all weighings for company', async () => {
      const createDto: CreateWeighingDto = {
        animalId: testAnimal.id,
        date: '2020-01-15',
        weight: 350.0,
        employeeIds: testEmployees.map((e) => e.id),
      };

      await service.create(context.testUser.id, createDto);

      const result = await service.findAll(context.testUser.id);

      expect(result.length).toBeGreaterThan(0);
      expect(result[0].companyId).toBe(context.testCompany.id);
    });
  });

  describe('findOne', () => {
    it('should return weighing by ID', async () => {
      const createDto: CreateWeighingDto = {
        animalId: testAnimal.id,
        date: '2020-01-15',
        weight: 350.0,
        employeeIds: testEmployees.map((e) => e.id),
      };

      const created = await service.create(context.testUser.id, createDto);
      const result = await service.findOne(context.testUser.id, created.id);

      expect(result.id).toBe(created.id);
      expect(result.companyId).toBe(context.testCompany.id);
    });
  });

  describe('findByAnimalId', () => {
    it('should return all weighings for animal', async () => {
      const createDto1: CreateWeighingDto = {
        animalId: testAnimal.id,
        date: '2020-01-15',
        weight: 350.0,
        employeeIds: testEmployees.map((e) => e.id),
      };

      const createDto2: CreateWeighingDto = {
        animalId: testAnimal.id,
        date: '2020-02-15',
        weight: 380.0,
        employeeIds: testEmployees.map((e) => e.id),
      };

      await service.create(context.testUser.id, createDto1);
      await service.create(context.testUser.id, createDto2);

      const result = await service.findByAnimalId(
        context.testUser.id,
        testAnimal.id,
      );

      expect(result.length).toBe(2);
      expect(result.every((w) => w.animalId === testAnimal.id)).toBe(true);
    });
  });

  describe('update', () => {
    it('should update weighing successfully', async () => {
      const createDto: CreateWeighingDto = {
        animalId: testAnimal.id,
        date: '2020-01-15',
        weight: 350.0,
        employeeIds: testEmployees.map((e) => e.id),
      };

      const created = await service.create(context.testUser.id, createDto);

      const updateDto: UpdateWeighingDto = {
        weight: 400.0,
        observation: 'Updated observation',
      };

      const result = await service.update(
        context.testUser.id,
        created.id,
        updateDto,
      );

      expect(result.weight).toBe(400.0);
      expect(result.observation).toBe('Updated observation');
    });

    it('should update employee IDs', async () => {
      const createDto: CreateWeighingDto = {
        animalId: testAnimal.id,
        date: '2020-01-15',
        weight: 350.0,
        employeeIds: [testEmployees[0].id],
      };

      const created = await service.create(context.testUser.id, createDto);

      const updateDto: UpdateWeighingDto = {
        employeeIds: testEmployees.map((e) => e.id),
      };

      const result = await service.update(
        context.testUser.id,
        created.id,
        updateDto,
      );

      expect(result.employeeIds.length).toBe(2);
    });
  });

  describe('remove', () => {
    it('should soft delete weighing', async () => {
      const createDto: CreateWeighingDto = {
        animalId: testAnimal.id,
        date: '2020-01-15',
        weight: 350.0,
        employeeIds: testEmployees.map((e) => e.id),
      };

      const created = await service.create(context.testUser.id, createDto);

      await service.remove(context.testUser.id, created.id);

      // Verify weighing is soft deleted
      const weighing = await context.prisma.weighing.findUnique({
        where: { id: created.id },
      });
      expect(weighing?.deletedAt).toBeDefined();
    });
  });

  describe('company isolation', () => {
    it('should not allow access to other company weighings', async () => {
      // Create another company
      const otherCompany = await context.prisma.company.create({
        data: {
          cnpj: '99.888.777/0001-66',
          companyName: 'Other Company',
          email: 'other@company.com',
          phone: '(47) 88888-8888',
          street: 'Other Street',
          number: '456',
          neighborhood: 'Other Neighborhood',
          city: 'Other City',
          state: 'SC',
          zipCode: '88303-030',
        },
      });

      const otherProperty = await context.prisma.property.create({
        data: {
          code: '001',
          name: 'Other Property',
          area: { value: 50, type: 'hectares' },
          status: 'active',
          companyId: otherCompany.id,
          street: 'Other Street',
          number: '456',
          neighborhood: 'Other Neighborhood',
          city: 'Other City',
          state: 'SC',
          zipCode: '88395-000',
        },
      });

      const otherAnimal = await context.prisma.animal.create({
        data: {
          code: 'OTHER-001',
          registrationNumber: 'BR-2020-OT0001',
          status: 'active',
          companyId: otherCompany.id,
          propertyId: otherProperty.id,
        },
      });

      const otherWeighing = await context.prisma.weighing.create({
        data: {
          animalId: otherAnimal.id,
          weighingDate: new Date('2020-01-15'),
          weight: 350.0,
          employeeIds: [],
          serviceProviderIds: [],
          companyId: otherCompany.id,
        },
      });

      // Try to access other company's weighing
      await expect(
        service.findOne(context.testUser.id, otherWeighing.id),
      ).rejects.toThrow('not found');

      // Cleanup
      try {
        await context.prisma.weighing.deleteMany({
          where: { companyId: otherCompany.id },
        });
      } catch {
        // Ignore if table doesn't exist
      }
      await context.prisma.animal.deleteMany({
        where: { companyId: otherCompany.id },
      });
      await context.prisma.property.deleteMany({
        where: { companyId: otherCompany.id },
      });
      await context.prisma.company.deleteMany({
        where: { id: otherCompany.id },
      });
    });
  });
});
