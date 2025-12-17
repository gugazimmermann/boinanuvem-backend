import { PropertiesService } from './properties.service';
import { CreatePropertyDto, UpdatePropertyDto } from './dto';
import { GeocodingService } from '../common/services/geocoding.service';
import { PasturePlanningService } from './services/pasture-planning.service';
import {
  describeOrSkip,
  setupIntegrationTest,
  teardownIntegrationTest,
  createServiceTestingModule,
  getServiceFromModule,
  IntegrationTestContext,
} from '../../test/integration-test-helpers';

describeOrSkip('PropertiesService Integration Tests', () => {
  let service: PropertiesService;
  let context: IntegrationTestContext;

  beforeAll(async () => {
    context = await setupIntegrationTest({
      cnpj: '11.222.333/0001-55',
      companyName: 'Test Properties Company',
      email: 'properties@testcompany.com',
      userEmail: 'user-properties@testcompany.com',
    });
  });

  afterAll(async () => {
    await teardownIntegrationTest(context, {
      tables: ['property'],
    });
  });

  beforeEach(async () => {
    const module = await createServiceTestingModule(
      PropertiesService,
      context.prisma,
      [
        {
          provide: GeocodingService,
          useValue: {
            geocodeNominatim: jest.fn().mockResolvedValue(null),
          },
        },
        {
          provide: PasturePlanningService,
          useValue: {
            computeFromLatLng: jest
              .fn()
              .mockResolvedValue({ pasturePlanning: [], breedingMonths: [] }),
          },
        },
      ],
    );
    service = getServiceFromModule(module, PropertiesService);

    // Clean up existing test data
    await context.prisma.property.deleteMany({
      where: {
        companyId: context.testCompany.id,
      },
    });
  });

  afterEach(async () => {
    await context.prisma.property.deleteMany({
      where: {
        companyId: context.testCompany.id,
      },
    });
  });

  describe('create with real database', () => {
    it('should create a property successfully', async () => {
      const createDto: CreatePropertyDto = {
        code: '001',
        name: 'Test Property',
        area: { value: 100, type: 'hectares' },
        status: 'active',
        street: 'Test Street',
        number: '123',
        neighborhood: 'Test Neighborhood',
        city: 'Test City',
        state: 'SC',
        zipCode: '88395-000',
      };

      const result = await service.create(context.testUser.id, createDto);

      expect(result).toMatchObject({
        code: '001',
        name: 'Test Property',
        status: 'active',
        companyId: context.testCompany.id,
      });
      expect(result.id).toBeDefined();
      expect(result.createdAt).toBeDefined();

      // Verify in database
      const property = await context.prisma.property.findUnique({
        where: { id: result.id },
      });
      expect(property).toBeDefined();
      expect(property?.code).toBe('001');
    });

    it('should fail with duplicate code for same company', async () => {
      const createDto: CreatePropertyDto = {
        code: '002',
        name: 'Test Property',
        area: { value: 100, type: 'hectares' },
        status: 'active',
        street: 'Test Street',
        number: '123',
        neighborhood: 'Test Neighborhood',
        city: 'Test City',
        state: 'SC',
        zipCode: '88395-000',
      };

      await service.create(context.testUser.id, createDto);

      // Try to create duplicate
      await expect(
        service.create(context.testUser.id, createDto),
      ).rejects.toThrow('Property with this code already exists');
    });

    it('should allow same code for different companies', async () => {
      // Create another company (ensure we don't hit unique constraints)
      await context.prisma.company.deleteMany({
        where: {
          cnpj: '22.333.444/0001-66',
        },
      });

      const otherCompany = await context.prisma.company.create({
        data: {
          cnpj: '22.333.444/0001-66',
          companyName: 'Other Test Company',
          email: `other-properties-int+${Date.now()}@testcompany.com`,
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

      const hashedPassword = await require('bcrypt').hash('password123', 10);
      const otherUser = await context.prisma.user.create({
        data: {
          name: 'Other User',
          email: 'other-user@testcompany.com',
          phone: '(47) 99999-6666',
          password: hashedPassword,
          companyId: otherCompany.id,
          mainUser: true,
          status: 'active',
          emailVerifiedAt: new Date(),
          permissions: {},
        },
      });

      const createDto1: CreatePropertyDto = {
        code: 'DUPLICATE-001',
        name: 'Test Property',
        area: { value: 100, type: 'hectares' },
        status: 'active',
        street: 'Test Street',
        number: '123',
        neighborhood: 'Test Neighborhood',
        city: 'Test City',
        state: 'SC',
        zipCode: '88395-000',
      };

      const createDto2: CreatePropertyDto = {
        ...createDto1,
        name: 'Other Property',
      };

      // Create in first company
      await service.create(context.testUser.id, createDto1);

      // Create with same code in second company (should succeed)
      const result = await service.create(otherUser.id, createDto2);
      expect(result.code).toBe('DUPLICATE-001');

      // Cleanup
      await context.prisma.property.deleteMany({
        where: { companyId: otherCompany.id },
      });
      await context.prisma.user.deleteMany({
        where: { companyId: otherCompany.id },
      });
      await context.prisma.company.deleteMany({
        where: { id: otherCompany.id },
      });
    });
  });

  describe('findAll with real database', () => {
    it('should return all properties for company', async () => {
      // Create test properties
      await context.prisma.property.createMany({
        data: [
          {
            code: '001',
            name: 'Property 1',
            area: { value: 100, type: 'hectares' },
            status: 'active',
            companyId: context.testCompany.id,
            street: 'Test Street',
            number: '123',
            neighborhood: 'Test Neighborhood',
            city: 'Test City',
            state: 'SC',
            zipCode: '88395-000',
          },
          {
            code: '002',
            name: 'Property 2',
            area: { value: 200, type: 'hectares' },
            status: 'active',
            companyId: context.testCompany.id,
            street: 'Test Street',
            number: '123',
            neighborhood: 'Test Neighborhood',
            city: 'Test City',
            state: 'SC',
            zipCode: '88395-000',
          },
          {
            code: '003',
            name: 'Deleted Property',
            area: { value: 300, type: 'hectares' },
            status: 'active',
            companyId: context.testCompany.id,
            street: 'Test Street',
            number: '123',
            neighborhood: 'Test Neighborhood',
            city: 'Test City',
            state: 'SC',
            zipCode: '88395-000',
            deletedAt: new Date(), // Soft deleted
          },
        ],
      });

      const result = await service.findAll(context.testUser.id);

      expect(result.length).toBe(2); // Excludes soft-deleted
      expect(result.every((p) => p.deletedAt === undefined)).toBe(true);
    });
  });

  describe('update with real database', () => {
    let propertyId: string;

    beforeEach(async () => {
      const property = await context.prisma.property.create({
        data: {
          code: '001',
          name: 'Test Property',
          area: { value: 100, type: 'hectares' },
          status: 'active',
          companyId: context.testCompany.id,
          street: 'Test Street',
          number: '123',
          neighborhood: 'Test Neighborhood',
          city: 'Test City',
          state: 'SC',
          zipCode: '88395-000',
        },
      });
      propertyId = property.id;
    });

    it('should update a property', async () => {
      const updateDto: UpdatePropertyDto = {
        name: 'Updated Property Name',
        status: 'inactive',
      };

      const result = await service.update(
        context.testUser.id,
        propertyId,
        updateDto,
      );

      expect(result).toMatchObject({
        id: propertyId,
        name: 'Updated Property Name',
        status: 'inactive',
      });
    });
  });

  describe('remove with real database', () => {
    let propertyId: string;

    beforeEach(async () => {
      const property = await context.prisma.property.create({
        data: {
          code: '001',
          name: 'Test Property',
          area: { value: 100, type: 'hectares' },
          status: 'active',
          companyId: context.testCompany.id,
          street: 'Test Street',
          number: '123',
          neighborhood: 'Test Neighborhood',
          city: 'Test City',
          state: 'SC',
          zipCode: '88395-000',
        },
      });
      propertyId = property.id;
    });

    it('should soft delete a property', async () => {
      const result = await service.remove(context.testUser.id, propertyId);

      expect(result).toEqual({
        message: 'Property deleted successfully',
      });

      // Verify soft delete
      const deletedProperty = await context.prisma.property.findUnique({
        where: { id: propertyId },
      });
      expect(deletedProperty?.deletedAt).toBeDefined();

      // Verify it's excluded from list
      const listResult = await service.findAll(context.testUser.id);
      expect(listResult.find((p) => p.id === propertyId)).toBeUndefined();
    });
  });
});
