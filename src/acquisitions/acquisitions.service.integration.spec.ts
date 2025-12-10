import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { AcquisitionsService } from './acquisitions.service';
import { PrismaService } from '../common/services/prisma.service';
import { CreateAcquisitionDto, UpdateAcquisitionDto, PricingMode } from './dto';

// Skip integration tests if database is not available
const describeOrSkip = process.env.SKIP_INTEGRATION_TESTS
  ? describe.skip
  : describe;

describeOrSkip('AcquisitionsService Integration Tests', () => {
  let service: AcquisitionsService;
  let prisma: PrismaClient;
  let testCompany: any;
  let testProperty: any;
  let testSupplier: any;
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

    // Create test company and property
    testCompany = await prisma.company.create({
      data: {
        cnpj: '11.222.333/0001-55',
        companyName: 'Test Acquisitions Company',
        email: 'acquisitions@testcompany.com',
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

    testSupplier = await prisma.supplier.create({
      data: {
        code: '001',
        name: 'Test Supplier',
        companyId: testCompany.id,
        properties: {
          create: {
            propertyId: testProperty.id,
          },
        },
      },
    });

    const hashedPassword = await require('bcrypt').hash('password123', 10);
    testUser = await prisma.user.create({
      data: {
        name: 'Test User',
        email: 'user-acquisitions@testcompany.com',
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
        AcquisitionsService,
        {
          provide: PrismaService,
          useValue: prisma,
        },
        Logger,
      ],
    }).compile();

    service = module.get<AcquisitionsService>(AcquisitionsService);

    // Clean up existing test data
    await prisma.acquisitionItem.deleteMany({
      where: {
        acquisition: {
          companyId: testCompany.id,
        },
      },
    });
    await prisma.acquisition.deleteMany({
      where: {
        companyId: testCompany.id,
      },
    });
    await prisma.animal.deleteMany({
      where: {
        companyId: testCompany.id,
      },
    });
  });

  afterEach(async () => {
    // Clean up test data after each test
    await prisma.acquisitionItem.deleteMany({
      where: {
        acquisition: {
          companyId: testCompany.id,
        },
      },
    });
    await prisma.acquisition.deleteMany({
      where: {
        companyId: testCompany.id,
      },
    });
    await prisma.animal.deleteMany({
      where: {
        companyId: testCompany.id,
      },
    });
  });

  afterAll(async () => {
    // Clean up test company and related data
    await prisma.acquisitionItem.deleteMany({
      where: {
        acquisition: {
          companyId: testCompany.id,
        },
      },
    });
    await prisma.acquisition.deleteMany({
      where: {
        companyId: testCompany.id,
      },
    });
    await prisma.animal.deleteMany({
      where: {
        companyId: testCompany.id,
      },
    });
    await prisma.supplier.deleteMany({
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
    it('should create an acquisition with items and create animals', async () => {
      const createDto: CreateAcquisitionDto = {
        propertyId: testProperty.id,
        supplierId: testSupplier.id,
        acquisitionDate: '2020-01-15',
        pricingMode: PricingMode.INDIVIDUAL,
        paymentMethod: 'cash_flow',
        totalPrice: 10000.0,
        acquisitionItems: [
          {
            code: '001',
            registrationNumber: 'BR-2020-FJ0001',
            price: 5000.0,
            weight: 350.0,
          },
          {
            code: '002',
            registrationNumber: 'BR-2020-FJ0002',
            price: 5000.0,
            weight: 380.0,
          },
        ],
      };

      const result = await service.create(testUser.id, createDto);

      expect(result).toMatchObject({
        propertyId: testProperty.id,
        supplierId: testSupplier.id,
        acquisitionDate: new Date('2020-01-15'),
        pricingMode: PricingMode.INDIVIDUAL,
        paymentMethod: 'cash_flow',
        totalPrice: 10000.0,
        companyId: testCompany.id,
      });
      expect(result.id).toBeDefined();
      expect(result.acquisitionItems).toBeDefined();
      expect(result.acquisitionItems.length).toBe(2);

      // Verify animals were created
      const animals = await prisma.animal.findMany({
        where: {
          code: { in: ['001', '002'] },
          companyId: testCompany.id,
        },
      });
      expect(animals.length).toBe(2);

      // Verify cost per arroba calculation (30kg = 1 arroba)
      const item1 = result.acquisitionItems.find(
        (item: any) => item.weight === 350.0,
      );
      expect(item1).toBeDefined();
      // 350kg / 30 = 11.67 arrobas, 5000 / 11.67 ≈ 428.57
      expect(item1?.costPerArroba).toBeGreaterThan(400);
      expect(item1?.costPerArroba).toBeLessThan(450);
    });

    it('should create acquisition with TOTAL pricing mode', async () => {
      const createDto: CreateAcquisitionDto = {
        propertyId: testProperty.id,
        supplierId: testSupplier.id,
        acquisitionDate: '2020-01-15',
        pricingMode: PricingMode.TOTAL,
        paymentMethod: 'cash_flow',
        totalPrice: 15000.0,
        acquisitionItems: [
          {
            code: '003',
            registrationNumber: 'BR-2020-FJ0003',
            price: 0, // Price ignored in TOTAL mode
            weight: 350.0,
          },
          {
            code: '004',
            registrationNumber: 'BR-2020-FJ0004',
            price: 0, // Price ignored in TOTAL mode
            weight: 380.0,
          },
        ],
      };

      const result = await service.create(testUser.id, createDto);

      expect(result.pricingMode).toBe(PricingMode.TOTAL);
      expect(result.totalPrice).toBe(15000.0);

      // In TOTAL mode, price per animal should be totalPrice / itemCount
      const items = result.acquisitionItems;
      expect(items.length).toBe(2);
      // Each item should have price = 15000 / 2 = 7500
      items.forEach((item: any) => {
        expect(item.price).toBe(7500.0);
      });
    });

    it('should calculate fees correctly', async () => {
      const createDto: CreateAcquisitionDto = {
        propertyId: testProperty.id,
        supplierId: testSupplier.id,
        acquisitionDate: '2020-01-15',
        pricingMode: PricingMode.INDIVIDUAL,
        paymentMethod: 'cash_flow',
        totalPrice: 10000.0,
        fees: [
          { id: 'fee-001', name: 'Transportation', amount: 500.0 },
          { id: 'fee-002', name: 'Insurance', amount: 200.0 },
        ],
        transportationFee: 300.0,
        handlingFee: 150.0,
        acquisitionItems: [
          {
            code: '005',
            registrationNumber: 'BR-2020-FJ0005',
            price: 5000.0,
            weight: 350.0,
          },
        ],
      };

      const result = await service.create(testUser.id, createDto);

      expect(result.fees).toBeDefined();
      expect(Array.isArray(result.fees)).toBe(true);
      expect(result.fees?.length).toBe(2);
      expect(result.transportationFee).toBe(300.0);
      expect(result.handlingFee).toBe(150.0);
    });

    it('should create acquisition with existing animals', async () => {
      // Create existing animals
      const animal1 = await prisma.animal.create({
        data: {
          code: 'EXISTING-001',
          registrationNumber: 'BR-2019-EX0001',
          status: 'active',
          companyId: testCompany.id,
          propertyId: testProperty.id,
        },
      });

      const animal2 = await prisma.animal.create({
        data: {
          code: 'EXISTING-002',
          registrationNumber: 'BR-2019-EX0002',
          status: 'active',
          companyId: testCompany.id,
          propertyId: testProperty.id,
        },
      });

      const createDto: CreateAcquisitionDto = {
        propertyId: testProperty.id,
        supplierId: testSupplier.id,
        acquisitionDate: '2020-01-15',
        pricingMode: PricingMode.INDIVIDUAL,
        paymentMethod: 'cash_flow',
        totalPrice: 10000.0,
        acquisitionItems: [
          {
            animalId: animal1.id,
            price: 5000.0,
            weight: 350.0,
          },
          {
            animalId: animal2.id,
            price: 5000.0,
            weight: 380.0,
          },
        ],
      };

      const result = await service.create(testUser.id, createDto);

      expect(result.acquisitionItems.length).toBe(2);
      expect(
        result.acquisitionItems.some(
          (item: any) => item.animalId === animal1.id,
        ),
      ).toBe(true);
      expect(
        result.acquisitionItems.some(
          (item: any) => item.animalId === animal2.id,
        ),
      ).toBe(true);
    });

    it('should fail with duplicate animal code', async () => {
      // Create animal with code 001
      await prisma.animal.create({
        data: {
          code: '001',
          registrationNumber: 'BR-2020-FJ0001',
          status: 'active',
          companyId: testCompany.id,
          propertyId: testProperty.id,
        },
      });

      const createDto: CreateAcquisitionDto = {
        propertyId: testProperty.id,
        supplierId: testSupplier.id,
        acquisitionDate: '2020-01-15',
        pricingMode: PricingMode.INDIVIDUAL,
        paymentMethod: 'cash_flow',
        totalPrice: 5000.0,
        acquisitionItems: [
          {
            code: '001', // Duplicate code
            registrationNumber: 'BR-2020-FJ0001-DUP',
            price: 5000.0,
            weight: 350.0,
          },
        ],
      };

      await expect(service.create(testUser.id, createDto)).rejects.toThrow(
        'Animal with code 001 already exists',
      );
    });

    it('should fail if property does not exist', async () => {
      const createDto: CreateAcquisitionDto = {
        propertyId: 'non-existent-property-id',
        supplierId: testSupplier.id,
        acquisitionDate: '2020-01-15',
        pricingMode: PricingMode.INDIVIDUAL,
        paymentMethod: 'cash_flow',
        totalPrice: 10000.0,
        acquisitionItems: [
          {
            code: '006',
            registrationNumber: 'BR-2020-FJ0006',
            price: 5000.0,
            weight: 350.0,
          },
        ],
      };

      await expect(service.create(testUser.id, createDto)).rejects.toThrow(
        'Property not found',
      );
    });

    it('should fail if supplier does not exist', async () => {
      const createDto: CreateAcquisitionDto = {
        propertyId: testProperty.id,
        supplierId: 'non-existent-supplier-id',
        acquisitionDate: '2020-01-15',
        pricingMode: PricingMode.INDIVIDUAL,
        paymentMethod: 'cash_flow',
        totalPrice: 10000.0,
        acquisitionItems: [
          {
            code: '007',
            registrationNumber: 'BR-2020-FJ0007',
            price: 5000.0,
            weight: 350.0,
          },
        ],
      };

      await expect(service.create(testUser.id, createDto)).rejects.toThrow(
        'Supplier not found',
      );
    });
  });

  describe('update with real database', () => {
    let acquisitionId: string;
    let animalId: string;

    beforeEach(async () => {
      const acquisition = await prisma.acquisition.create({
        data: {
          companyId: testCompany.id,
          propertyId: testProperty.id,
          supplierId: testSupplier.id,
          acquisitionDate: new Date('2020-01-15'),
          pricingMode: PricingMode.INDIVIDUAL,
          paymentMethod: 'cash_flow',
          totalPrice: 10000.0,
        },
      });
      acquisitionId = acquisition.id;

      const animal = await prisma.animal.create({
        data: {
          code: '001',
          registrationNumber: 'BR-2020-FJ0001',
          status: 'active',
          companyId: testCompany.id,
          propertyId: testProperty.id,
        },
      });

      await prisma.acquisitionItem.create({
        data: {
          acquisitionId: acquisition.id,
          animalId: animal.id,
          price: 5000.0,
          weight: 350.0,
          costPerArroba: 500.0,
        },
      });
    });

    it('should update an acquisition', async () => {
      const updateDto: UpdateAcquisitionDto = {
        totalPrice: 12000.0,
        observation: 'Updated observation',
      };

      const result = await service.update(
        testUser.id,
        acquisitionId,
        updateDto,
      );

      expect(result).toMatchObject({
        id: acquisitionId,
        totalPrice: 12000.0,
        observation: 'Updated observation',
      });
    });

    it('should update acquisition items', async () => {
      const newAnimal = await prisma.animal.create({
        data: {
          code: '002',
          registrationNumber: 'BR-2020-FJ0002',
          status: 'active',
          companyId: testCompany.id,
          propertyId: testProperty.id,
        },
      });

      const updateDto: UpdateAcquisitionDto = {
        totalPrice: 15000.0,
        acquisitionItems: [
          {
            animalId: animalId,
            price: 8000.0,
            weight: 400.0,
          },
          {
            animalId: newAnimal.id,
            price: 7000.0,
            weight: 380.0,
          },
        ],
      };

      const result = await service.update(
        testUser.id,
        acquisitionId,
        updateDto,
      );

      expect(result.acquisitionItems.length).toBe(2);
      expect(result.totalPrice).toBe(15000.0);
    });
  });

  describe('findByAnimalId with real database', () => {
    let acquisitionId: string;
    let animalId: string;

    beforeEach(async () => {
      const acquisition = await prisma.acquisition.create({
        data: {
          companyId: testCompany.id,
          propertyId: testProperty.id,
          supplierId: testSupplier.id,
          acquisitionDate: new Date('2020-01-15'),
          pricingMode: PricingMode.INDIVIDUAL,
          paymentMethod: 'cash_flow',
          totalPrice: 10000.0,
        },
      });
      acquisitionId = acquisition.id;

      const animal = await prisma.animal.create({
        data: {
          code: '001',
          registrationNumber: 'BR-2020-FJ0001',
          status: 'active',
          companyId: testCompany.id,
          propertyId: testProperty.id,
        },
      });

      await prisma.acquisitionItem.create({
        data: {
          acquisitionId: acquisition.id,
          animalId: animal.id,
          price: 5000.0,
          weight: 350.0,
          costPerArroba: 500.0,
        },
      });
    });

    it('should return acquisition by animal id', async () => {
      const result = await service.findByAnimalId(testUser.id, animalId);

      expect(result).toMatchObject({
        id: acquisitionId,
        propertyId: testProperty.id,
        supplierId: testSupplier.id,
      });
    });

    it('should fail for animal without acquisition record', async () => {
      const animalWithoutAcquisition = await prisma.animal.create({
        data: {
          code: '002',
          registrationNumber: 'BR-2020-FJ0002',
          status: 'active',
          companyId: testCompany.id,
          propertyId: testProperty.id,
        },
      });

      await expect(
        service.findByAnimalId(testUser.id, animalWithoutAcquisition.id),
      ).rejects.toThrow('Acquisition record not found');
    });
  });

  describe('remove with real database', () => {
    let acquisitionId: string;

    beforeEach(async () => {
      const acquisition = await prisma.acquisition.create({
        data: {
          companyId: testCompany.id,
          propertyId: testProperty.id,
          supplierId: testSupplier.id,
          acquisitionDate: new Date('2020-01-15'),
          pricingMode: PricingMode.INDIVIDUAL,
          paymentMethod: 'cash_flow',
          totalPrice: 10000.0,
        },
      });
      acquisitionId = acquisition.id;

      const animal = await prisma.animal.create({
        data: {
          code: '001',
          registrationNumber: 'BR-2020-FJ0001',
          status: 'active',
          companyId: testCompany.id,
          propertyId: testProperty.id,
        },
      });

      await prisma.acquisitionItem.create({
        data: {
          acquisitionId: acquisition.id,
          animalId: animal.id,
          price: 5000.0,
          weight: 350.0,
          costPerArroba: 500.0,
        },
      });
    });

    it('should soft delete an acquisition', async () => {
      const result = await service.remove(testUser.id, acquisitionId);

      expect(result).toEqual({
        message: 'Acquisition record deleted successfully',
      });

      // Verify soft delete
      const deletedAcquisition = await prisma.acquisition.findUnique({
        where: { id: acquisitionId },
      });
      expect(deletedAcquisition?.deletedAt).toBeDefined();

      // Verify it's excluded from list
      const listResult = await service.findAll(testUser.id);
      expect(listResult.find((a) => a.id === acquisitionId)).toBeUndefined();
    });
  });
});
