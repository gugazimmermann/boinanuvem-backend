import { LocationsService } from './locations.service';
import { CreateLocationDto, UpdateLocationDto } from './dto';
import {
  describeOrSkip,
  setupIntegrationTest,
  teardownIntegrationTest,
  createServiceTestingModule,
  getServiceFromModule,
  IntegrationTestContext,
} from '../../test/integration-test-helpers';

describeOrSkip('LocationsService Integration Tests', () => {
  let service: LocationsService;
  let context: IntegrationTestContext;

  beforeAll(async () => {
    context = await setupIntegrationTest({
      cnpj: '11.222.333/0001-55',
      companyName: 'Test Locations Company',
      email: 'locations@testcompany.com',
      userEmail: 'user-locations@testcompany.com',
      createProperty: true,
    });
  });

  afterAll(async () => {
    await teardownIntegrationTest(context, {
      tables: ['location'],
    });
  });

  beforeEach(async () => {
    const module = await createServiceTestingModule(
      LocationsService,
      context.prisma,
    );
    service = getServiceFromModule(module, LocationsService);

    // Clean up existing test data
    await context.prisma.location.deleteMany({
      where: {
        companyId: context.testCompany.id,
      },
    });
  });

  afterEach(async () => {
    await context.prisma.location.deleteMany({
      where: {
        companyId: context.testCompany.id,
      },
    });
  });

  describe('create with real database', () => {
    it('should create a location successfully', async () => {
      const createDto: CreateLocationDto = {
        code: '001',
        name: 'Test Location',
        locationType: 'pasture',
        area: { value: 28.5, type: 'hectares' },
        status: 'active',
        propertyId: context.testProperty.id,
      };

      const result = await service.create(context.testUser.id, createDto);

      expect(result).toMatchObject({
        code: '001',
        name: 'Test Location',
        locationType: 'pasture',
        status: 'active',
        companyId: context.testCompany.id,
        propertyId: context.testProperty.id,
      });
      expect(result.id).toBeDefined();
      expect(result.createdAt).toBeDefined();

      // Verify in database
      const location = await context.prisma.location.findUnique({
        where: { id: result.id },
      });
      expect(location).toBeDefined();
      expect(location?.code).toBe('001');
    });

    it('should fail with duplicate code for same property', async () => {
      const createDto: CreateLocationDto = {
        code: '002',
        name: 'Test Location',
        locationType: 'pasture',
        area: { value: 28.5, type: 'hectares' },
        status: 'active',
        propertyId: context.testProperty.id,
      };

      await service.create(testUser.id, createDto);

      // Try to create duplicate
      await expect(
        service.create(context.testUser.id, createDto),
      ).rejects.toThrow('Location with this code already exists');
    });

    it('should allow same code for different properties', async () => {
      // Create another property
      const otherProperty = await context.prisma.property.create({
        data: {
          code: '002',
          name: 'Other Property',
          area: { value: 200, type: 'hectares' },
          status: 'active',
          companyId: context.testCompany.id,
          street: 'Other Street',
          number: '456',
          neighborhood: 'Other Neighborhood',
          city: 'Other City',
          state: 'SC',
          zipCode: '88395-000',
        },
      });

      const createDto1: CreateLocationDto = {
        code: 'DUPLICATE-001',
        name: 'Test Location',
        locationType: 'pasture',
        area: { value: 28.5, type: 'hectares' },
        status: 'active',
        propertyId: context.testProperty.id,
      };

      const createDto2: CreateLocationDto = {
        ...createDto1,
        propertyId: otherProperty.id,
      };

      // Create in first property
      await service.create(testUser.id, createDto1);

      // Create with same code in second property (should succeed)
      const result = await service.create(testUser.id, createDto2);
      expect(result.code).toBe('DUPLICATE-001');
    });

    it('should fail if property does not exist', async () => {
      const createDto: CreateLocationDto = {
        code: '003',
        name: 'Test Location',
        locationType: 'pasture',
        area: { value: 28.5, type: 'hectares' },
        status: 'active',
        propertyId: 'non-existent-property-id',
      };

      await expect(
        service.create(context.testUser.id, createDto),
      ).rejects.toThrow('Property not found');
    });

    it('should fail if property belongs to different company', async () => {
      // Create another company
      const otherCompany = await context.prisma.company.create({
        data: {
          cnpj: '22.333.444/0001-66',
          companyName: 'Other Test Company',
          email: 'other@testcompany.com',
          phone: '(47) 99999-7777',
          street: 'Other Street',
          number: '456',
          neighborhood: 'Other Neighborhood',
          city: 'Other City',
          state: 'SC',
          zipCode: '88303-030',
          trialStartDate: new Date(),
          trialEndDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
          trialStatus: 'active',
        },
      });

      const otherProperty = await context.prisma.property.create({
        data: {
          code: '001',
          name: 'Other Company Property',
          area: { value: 100, type: 'hectares' },
          status: 'active',
          companyId: otherCompany.id,
          street: 'Other Street',
          number: '123',
          neighborhood: 'Other Neighborhood',
          city: 'Other City',
          state: 'SC',
          zipCode: '88395-000',
        },
      });

      const createDto: CreateLocationDto = {
        code: '004',
        name: 'Test Location',
        locationType: 'pasture',
        area: { value: 28.5, type: 'hectares' },
        status: 'active',
        propertyId: otherProperty.id,
      };

      await expect(
        service.create(context.testUser.id, createDto),
      ).rejects.toThrow('Property not found');

      // Cleanup
      await context.prisma.property.deleteMany({
        where: { companyId: otherCompany.id },
      });
      await context.prisma.company.deleteMany({
        where: { id: otherCompany.id },
      });
    });
  });

  describe('findAll with real database', () => {
    it('should return all locations for company', async () => {
      // Create test locations
      await context.prisma.location.createMany({
        data: [
          {
            code: '001',
            name: 'Location 1',
            locationType: 'pasture',
            area: { value: 28.5, type: 'hectares' },
            status: 'active',
            companyId: context.testCompany.id,
            propertyId: context.testProperty.id,
          },
          {
            code: '002',
            name: 'Location 2',
            locationType: 'barn',
            area: { value: 15.0, type: 'hectares' },
            status: 'active',
            companyId: context.testCompany.id,
            propertyId: context.testProperty.id,
          },
          {
            code: '003',
            name: 'Deleted Location',
            locationType: 'storage',
            area: { value: 10.0, type: 'hectares' },
            status: 'active',
            companyId: context.testCompany.id,
            propertyId: context.testProperty.id,
            deletedAt: new Date(), // Soft deleted
          },
        ],
      });

      const result = await service.findAll(context.testUser.id);

      expect(result.length).toBe(2); // Excludes soft-deleted
      expect(result.every((l) => l.deletedAt === undefined)).toBe(true);
    });
  });

  describe('update with real database', () => {
    let locationId: string;

    beforeEach(async () => {
      const location = await context.prisma.location.create({
        data: {
          code: '001',
          name: 'Test Location',
          locationType: 'pasture',
          area: { value: 28.5, type: 'hectares' },
          status: 'active',
          companyId: context.testCompany.id,
          propertyId: context.testProperty.id,
        },
      });
      locationId = location.id;
    });

    it('should update a location', async () => {
      const updateDto: UpdateLocationDto = {
        name: 'Updated Location Name',
        status: 'inactive',
      };

      const result = await service.update(
        context.testUser.id,
        locationId,
        updateDto,
      );

      expect(result).toMatchObject({
        id: locationId,
        name: 'Updated Location Name',
        status: 'inactive',
      });
    });
  });

  describe('remove with real database', () => {
    let locationId: string;

    beforeEach(async () => {
      const location = await context.prisma.location.create({
        data: {
          code: '001',
          name: 'Test Location',
          locationType: 'pasture',
          area: { value: 28.5, type: 'hectares' },
          status: 'active',
          companyId: context.testCompany.id,
          propertyId: context.testProperty.id,
        },
      });
      locationId = location.id;
    });

    it('should soft delete a location', async () => {
      const result = await service.remove(context.testUser.id, locationId);

      expect(result).toEqual({
        message: 'Location deleted successfully',
      });

      // Verify soft delete
      const deletedLocation = await context.prisma.location.findUnique({
        where: { id: locationId },
      });
      expect(deletedLocation?.deletedAt).toBeDefined();

      // Verify it's excluded from list
      const listResult = await service.findAll(context.testUser.id);
      expect(listResult.find((l) => l.id === locationId)).toBeUndefined();
    });
  });
});
