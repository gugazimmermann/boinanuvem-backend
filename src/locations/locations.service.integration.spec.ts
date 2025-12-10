import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { LocationsService } from './locations.service';
import { PrismaService } from '../common/services/prisma.service';
import { CreateLocationDto, UpdateLocationDto } from './dto';

// Skip integration tests if database is not available
const describeOrSkip = process.env.SKIP_INTEGRATION_TESTS
  ? describe.skip
  : describe;

describeOrSkip('LocationsService Integration Tests', () => {
  let service: LocationsService;
  let prisma: PrismaClient;
  let testCompany: any;
  let testProperty: any;
  let testUser: any;

  beforeAll(async () => {
    // Use test database URL or in-memory database for testing
    const testDatabaseUrl =
      process.env.TEST_DATABASE_URL ??
      process.env.DATABASE_URL ??
      'postgresql://postgres:postgres@localhost:5432/boinanuvem_test';

    prisma = new PrismaClient({
      datasources: {
        db: {
          url: testDatabaseUrl,
        },
      },
    });

    // Ensure database connection
    await prisma.$connect();

    // Create test company
    testCompany = await prisma.company.create({
      data: {
        cnpj: '11.222.333/0001-55',
        companyName: 'Test Locations Company',
        email: 'locations@testcompany.com',
        phone: '(47) 99999-9999',
        street: 'Test Street',
        number: '123',
        neighborhood: 'Test Neighborhood',
        city: 'Test City',
        state: 'SC',
        zipCode: '88303-030',
        trialStartDate: new Date(),
        trialEndDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        trialStatus: 'active',
      },
    });

    testProperty = await prisma.property.create({
      data: {
        code: '001',
        name: 'Test Property',
        area: { value: 100, type: 'hectares' },
        status: 'active',
        companyId: testCompany.id,
        street: 'Test Street',
        number: '123',
        neighborhood: 'Test Neighborhood',
        city: 'Test City',
        state: 'SC',
        zipCode: '88395-000',
      },
    });

    const hashedPassword = await require('bcrypt').hash('password123', 10);
    testUser = await prisma.user.create({
      data: {
        name: 'Test User',
        email: 'user-locations@testcompany.com',
        phone: '(47) 99999-8888',
        password: hashedPassword,
        companyId: testCompany.id,
        mainUser: true,
        status: 'active',
        emailVerifiedAt: new Date(),
        permissions: {},
      },
    });
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LocationsService,
        {
          provide: PrismaService,
          useValue: prisma,
        },
        Logger,
      ],
    }).compile();

    service = module.get<LocationsService>(LocationsService);

    // Clean up existing test data
    await prisma.location.deleteMany({
      where: {
        companyId: testCompany.id,
      },
    });
  });

  afterEach(async () => {
    // Clean up test data after each test
    await prisma.location.deleteMany({
      where: {
        companyId: testCompany.id,
      },
    });
  });

  afterAll(async () => {
    // Clean up test company and related data
    await prisma.location.deleteMany({
      where: {
        companyId: testCompany.id,
      },
    });
    await prisma.property.deleteMany({
      where: {
        companyId: testCompany.id,
      },
    });
    await prisma.user.deleteMany({
      where: {
        companyId: testCompany.id,
      },
    });
    await prisma.company.deleteMany({
      where: {
        id: testCompany.id,
      },
    });

    if (prisma) {
      await prisma.$disconnect();
    }
  });

  describe('create with real database', () => {
    it('should create a location successfully', async () => {
      const createDto: CreateLocationDto = {
        code: '001',
        name: 'Test Location',
        locationType: 'pasture',
        area: { value: 28.5, type: 'hectares' },
        status: 'active',
        propertyId: testProperty.id,
      };

      const result = await service.create(testUser.id, createDto);

      expect(result).toMatchObject({
        code: '001',
        name: 'Test Location',
        locationType: 'pasture',
        status: 'active',
        companyId: testCompany.id,
        propertyId: testProperty.id,
      });
      expect(result.id).toBeDefined();
      expect(result.createdAt).toBeDefined();

      // Verify in database
      const location = await prisma.location.findUnique({
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
        propertyId: testProperty.id,
      };

      await service.create(testUser.id, createDto);

      // Try to create duplicate
      await expect(service.create(testUser.id, createDto)).rejects.toThrow(
        'Location with this code already exists',
      );
    });

    it('should allow same code for different properties', async () => {
      // Create another property
      const otherProperty = await prisma.property.create({
        data: {
          code: '002',
          name: 'Other Property',
          area: { value: 200, type: 'hectares' },
          status: 'active',
          companyId: testCompany.id,
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
        propertyId: testProperty.id,
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

      await expect(service.create(testUser.id, createDto)).rejects.toThrow(
        'Property not found',
      );
    });

    it('should fail if property belongs to different company', async () => {
      // Create another company
      const otherCompany = await prisma.company.create({
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

      const otherProperty = await prisma.property.create({
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

      await expect(service.create(testUser.id, createDto)).rejects.toThrow(
        'Property not found',
      );

      // Cleanup
      await prisma.property.deleteMany({
        where: { companyId: otherCompany.id },
      });
      await prisma.company.deleteMany({
        where: { id: otherCompany.id },
      });
    });
  });

  describe('findAll with real database', () => {
    it('should return all locations for company', async () => {
      // Create test locations
      await prisma.location.createMany({
        data: [
          {
            code: '001',
            name: 'Location 1',
            locationType: 'pasture',
            area: { value: 28.5, type: 'hectares' },
            status: 'active',
            companyId: testCompany.id,
            propertyId: testProperty.id,
          },
          {
            code: '002',
            name: 'Location 2',
            locationType: 'barn',
            area: { value: 15.0, type: 'hectares' },
            status: 'active',
            companyId: testCompany.id,
            propertyId: testProperty.id,
          },
          {
            code: '003',
            name: 'Deleted Location',
            locationType: 'storage',
            area: { value: 10.0, type: 'hectares' },
            status: 'active',
            companyId: testCompany.id,
            propertyId: testProperty.id,
            deletedAt: new Date(), // Soft deleted
          },
        ],
      });

      const result = await service.findAll(testUser.id);

      expect(result.length).toBe(2); // Excludes soft-deleted
      expect(result.every((l) => l.deletedAt === undefined)).toBe(true);
    });
  });

  describe('update with real database', () => {
    let locationId: string;

    beforeEach(async () => {
      const location = await prisma.location.create({
        data: {
          code: '001',
          name: 'Test Location',
          locationType: 'pasture',
          area: { value: 28.5, type: 'hectares' },
          status: 'active',
          companyId: testCompany.id,
          propertyId: testProperty.id,
        },
      });
      locationId = location.id;
    });

    it('should update a location', async () => {
      const updateDto: UpdateLocationDto = {
        name: 'Updated Location Name',
        status: 'inactive',
      };

      const result = await service.update(testUser.id, locationId, updateDto);

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
      const location = await prisma.location.create({
        data: {
          code: '001',
          name: 'Test Location',
          locationType: 'pasture',
          area: { value: 28.5, type: 'hectares' },
          status: 'active',
          companyId: testCompany.id,
          propertyId: testProperty.id,
        },
      });
      locationId = location.id;
    });

    it('should soft delete a location', async () => {
      const result = await service.remove(testUser.id, locationId);

      expect(result).toEqual({
        message: 'Location deleted successfully',
      });

      // Verify soft delete
      const deletedLocation = await prisma.location.findUnique({
        where: { id: locationId },
      });
      expect(deletedLocation?.deletedAt).toBeDefined();

      // Verify it's excluded from list
      const listResult = await service.findAll(testUser.id);
      expect(listResult.find((l) => l.id === locationId)).toBeUndefined();
    });
  });
});
