import { Test, TestingModule } from '@nestjs/testing';
import { LocationMovementsService } from './location-movements.service';
import {
  CreateLocationMovementDto,
  UpdateLocationMovementDto,
  LocationMovementType,
  LocationMovementResponseDto,
} from './dto';
import {
  describeOrSkip,
  setupIntegrationTest,
  teardownIntegrationTest,
  IntegrationTestContext,
} from '../../test/integration-test-helpers';
import { PrismaService } from '../common/services/prisma.service';
import { CompanyEntitiesValidationService } from '../common/services/company-entities-validation.service';

describeOrSkip('LocationMovementsService Integration Tests', () => {
  let service: LocationMovementsService;
  let context: IntegrationTestContext;
  let testLocation1: any;
  let testLocation2: any;
  let testEmployee: any;
  let testServiceProvider: any;

  beforeAll(async () => {
    context = await setupIntegrationTest({
      cnpj: '11.222.333/0001-29',
      companyName: 'Test Location Movements Company',
      email: 'location-movements-int@testcompany.com',
      userEmail: 'user-location-movements@testcompany.com',
      createProperty: true,
      createEmployees: 1,
      createServiceProviders: 1,
    });

    testEmployee = context.testEmployees[0];
    testServiceProvider = context.testServiceProviders[0];

    testLocation1 = await context.prisma.location.create({
      data: {
        code: 'LOC001',
        name: 'Test Pasture',
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
        name: 'Test Barn',
        locationType: 'barn',
        area: { value: 50, type: 'm2' },
        status: 'active',
        companyId: context.testCompany.id,
        propertyId: context.testProperty!.id,
      },
    });
  });

  afterAll(async () => {
    await teardownIntegrationTest(context, {
      tables: ['locationMovement', 'location', 'employee', 'serviceProvider'],
    });
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LocationMovementsService,
        {
          provide: PrismaService,
          useValue: context.prisma,
        },
        CompanyEntitiesValidationService,
      ],
    }).compile();

    service = module.get<LocationMovementsService>(LocationMovementsService);
  });

  afterEach(async () => {
    await context.prisma.locationMovement.deleteMany({
      where: {
        companyId: context.testCompany.id,
      },
    });
  });

  describe('create', () => {
    it('should create a movement with all fields and transform JSON correctly', async () => {
      const createDto: CreateLocationMovementDto = {
        propertyId: context.testProperty!.id,
        locationIds: [testLocation1.id, testLocation2.id],
        employeeIds: [testEmployee.id],
        serviceProviderIds: [testServiceProvider.id],
        type: LocationMovementType.FEED_DELIVERY,
        date: '2025-01-15',
        observation: 'Feed delivered',
        fileIds: ['file-1', 'file-2'],
      };

      const result = await service.create(context.testUser.id, createDto);

      expect(result).toBeDefined();
      expect(result.propertyId).toBe(context.testProperty!.id);
      expect(result.locationIds).toEqual([testLocation1.id, testLocation2.id]);
      expect(result.employeeIds).toContain(testEmployee.id);
      expect(result.serviceProviderIds).toContain(testServiceProvider.id);
      expect(result.fileIds).toContain('file-1');
      expect(result.type).toBe(LocationMovementType.FEED_DELIVERY);
    });

    it('should fail when property does not belong to company', async () => {
      // Ensure we don't hit unique constraints if tests run multiple times
      await context.prisma.company.deleteMany({
        where: {
          cnpj: '22.333.444/0001-98',
        },
      });

      const otherCompany = await context.prisma.company.create({
        data: {
          cnpj: '22.333.444/0001-98',
          companyName: 'Other Company',
          email: `other-location-movements+${Date.now()}@testcompany.com`,
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
          code: 'P010',
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

      const createDto: CreateLocationMovementDto = {
        propertyId: otherProperty.id,
        locationIds: [testLocation1.id],
        type: LocationMovementType.FEED_DELIVERY,
        date: '2025-01-15',
      };

      await expect(
        service.create(context.testUser.id, createDto),
      ).rejects.toThrow(
        'Property not found or does not belong to your company',
      );
    });

    it('should fail when any location does not belong to property/company', async () => {
      const otherProperty = await context.prisma.property.create({
        data: {
          code: 'P011',
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

      const otherLocation = await context.prisma.location.create({
        data: {
          code: 'LOC999',
          name: 'Other Location',
          locationType: 'pasture',
          area: { value: 40, type: 'hectares' },
          status: 'active',
          companyId: context.testCompany.id,
          propertyId: otherProperty.id,
        },
      });

      const createDto: CreateLocationMovementDto = {
        propertyId: context.testProperty!.id,
        locationIds: [testLocation1.id, otherLocation.id],
        type: LocationMovementType.CLEANING,
        date: '2025-01-15',
      };

      await expect(
        service.create(context.testUser.id, createDto),
      ).rejects.toThrow(
        'One or more locations not found, do not belong to your company, or do not belong to the specified property',
      );
    });
  });

  describe('findAllForCompany & filters', () => {
    let movement1: LocationMovementResponseDto;

    beforeEach(async () => {
      movement1 = await service.create(context.testUser.id, {
        propertyId: context.testProperty!.id,
        locationIds: [testLocation1.id],
        employeeIds: [testEmployee.id],
        type: LocationMovementType.CLEANING,
        date: '2025-01-15',
      });

      await service.create(context.testUser.id, {
        propertyId: context.testProperty!.id,
        locationIds: [testLocation2.id],
        serviceProviderIds: [testServiceProvider.id],
        type: LocationMovementType.INSPECTION,
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

    it('should filter by locationId', async () => {
      const result = await service.findByLocationId(
        context.testUser.id,
        testLocation1.id,
      );
      expect(
        result.every((m) => m.locationIds.includes(testLocation1.id)),
      ).toBe(true);
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

    it('should filter by type', async () => {
      const result = await service.findByType(
        context.testUser.id,
        LocationMovementType.CLEANING,
      );
      expect(
        result.every((m) => m.type === LocationMovementType.CLEANING),
      ).toBe(true);
    });
  });

  describe('update', () => {
    it('should update movement successfully', async () => {
      const movement = await service.create(context.testUser.id, {
        propertyId: context.testProperty!.id,
        locationIds: [testLocation1.id],
        type: LocationMovementType.FEED_DELIVERY,
        date: '2025-01-15',
      });

      const updateDto: UpdateLocationMovementDto = {
        observation: 'Updated observation',
      };

      const result = await service.update(
        context.testUser.id,
        movement.id,
        updateDto,
      );

      expect(result.observation).toBe('Updated observation');
    });
  });

  describe('remove', () => {
    it('should soft delete movement', async () => {
      const movement = await service.create(context.testUser.id, {
        propertyId: context.testProperty!.id,
        locationIds: [testLocation1.id],
        type: LocationMovementType.FEED_DELIVERY,
        date: '2025-01-15',
      });

      await service.remove(context.testUser.id, movement.id);

      const deleted = await context.prisma.locationMovement.findUnique({
        where: { id: movement.id },
      });
      expect(deleted?.deletedAt).toBeDefined();
    });
  });
});
