import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PropertiesService } from './properties.service';
import { PrismaService } from '../common/services/prisma.service';
import { CreatePropertyDto, UpdatePropertyDto } from './dto';

// Skip integration tests if database is not available
const describeOrSkip = process.env.SKIP_INTEGRATION_TESTS
  ? describe.skip
  : describe;

describeOrSkip('PropertiesService Integration Tests', () => {
  let service: PropertiesService;
  let prisma: PrismaClient;
  let testCompany: any;
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
        companyName: 'Test Properties Company',
        email: 'properties@testcompany.com',
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

    const hashedPassword = await require('bcrypt').hash('password123', 10);
    testUser = await prisma.user.create({
      data: {
        name: 'Test User',
        email: 'user-properties@testcompany.com',
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
        PropertiesService,
        {
          provide: PrismaService,
          useValue: prisma,
        },
        Logger,
      ],
    }).compile();

    service = module.get<PropertiesService>(PropertiesService);

    // Clean up existing test data
    await prisma.property.deleteMany({
      where: {
        companyId: testCompany.id,
      },
    });
  });

  afterEach(async () => {
    // Clean up test data after each test
    await prisma.property.deleteMany({
      where: {
        companyId: testCompany.id,
      },
    });
  });

  afterAll(async () => {
    // Clean up test company and related data
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

      const result = await service.create(testUser.id, createDto);

      expect(result).toMatchObject({
        code: '001',
        name: 'Test Property',
        status: 'active',
        companyId: testCompany.id,
      });
      expect(result.id).toBeDefined();
      expect(result.createdAt).toBeDefined();

      // Verify in database
      const property = await prisma.property.findUnique({
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

      await service.create(testUser.id, createDto);

      // Try to create duplicate
      await expect(service.create(testUser.id, createDto)).rejects.toThrow(
        'Property with this code already exists',
      );
    });

    it('should allow same code for different companies', async () => {
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

      const hashedPassword = await require('bcrypt').hash('password123', 10);
      const otherUser = await prisma.user.create({
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
      await service.create(testUser.id, createDto1);

      // Create with same code in second company (should succeed)
      const result = await service.create(otherUser.id, createDto2);
      expect(result.code).toBe('DUPLICATE-001');

      // Cleanup
      await prisma.property.deleteMany({
        where: { companyId: otherCompany.id },
      });
      await prisma.user.deleteMany({
        where: { companyId: otherCompany.id },
      });
      await prisma.company.deleteMany({
        where: { id: otherCompany.id },
      });
    });
  });

  describe('findAll with real database', () => {
    it('should return all properties for company', async () => {
      // Create test properties
      await prisma.property.createMany({
        data: [
          {
            code: '001',
            name: 'Property 1',
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
          {
            code: '002',
            name: 'Property 2',
            area: { value: 200, type: 'hectares' },
            status: 'active',
            companyId: testCompany.id,
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
            companyId: testCompany.id,
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

      const result = await service.findAll(testUser.id);

      expect(result.length).toBe(2); // Excludes soft-deleted
      expect(result.every((p) => p.deletedAt === undefined)).toBe(true);
    });
  });

  describe('update with real database', () => {
    let propertyId: string;

    beforeEach(async () => {
      const property = await prisma.property.create({
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
      propertyId = property.id;
    });

    it('should update a property', async () => {
      const updateDto: UpdatePropertyDto = {
        name: 'Updated Property Name',
        status: 'inactive',
      };

      const result = await service.update(testUser.id, propertyId, updateDto);

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
      const property = await prisma.property.create({
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
      propertyId = property.id;
    });

    it('should soft delete a property', async () => {
      const result = await service.remove(testUser.id, propertyId);

      expect(result).toEqual({
        message: 'Property deleted successfully',
      });

      // Verify soft delete
      const deletedProperty = await prisma.property.findUnique({
        where: { id: propertyId },
      });
      expect(deletedProperty?.deletedAt).toBeDefined();

      // Verify it's excluded from list
      const listResult = await service.findAll(testUser.id);
      expect(listResult.find((p) => p.id === propertyId)).toBeUndefined();
    });
  });
});
