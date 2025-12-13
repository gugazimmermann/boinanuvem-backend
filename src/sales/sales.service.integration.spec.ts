import { SalesService } from './sales.service';
import {
  CreateSaleDto,
  UpdateSaleDto,
  SaleType,
  PricingMode,
  SalePaymentMethod,
} from './dto';
import {
  describeOrSkip,
  setupIntegrationTest,
  teardownIntegrationTest,
  createServiceTestingModule,
  getServiceFromModule,
  IntegrationTestContext,
} from '../../test/integration-test-helpers';
import { createTestAnimals } from '../../test/test-data-factories';

describeOrSkip('SalesService Integration Tests', () => {
  let service: SalesService;
  let context: IntegrationTestContext;
  let testAnimals: any[];

  beforeAll(async () => {
    context = await setupIntegrationTest({
      cnpj: '11.222.333/0001-01',
      companyName: 'Test Sales Company',
      email: 'sales@testcompany.com',
      userEmail: 'user-sales@testcompany.com',
      createProperty: true,
      createBuyer: true,
    });
  });

  beforeEach(async () => {
    const module = await createServiceTestingModule(
      SalesService,
      context.prisma,
    );
    service = getServiceFromModule(module, SalesService);

    // Clean up existing test data
    try {
      await context.prisma.saleItem.deleteMany({
        where: {
          sale: {
            companyId: context.testCompany.id,
          },
        },
      });
    } catch {
      // Ignore if table doesn't exist
    }
    try {
      await context.prisma.sale.deleteMany({
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

    // Create test animals
    testAnimals = await createTestAnimals(context.prisma, 2, {
      companyId: context.testCompany.id,
      propertyId: context.testProperty.id,
    });
    // Override the second animal with specific code
    testAnimals[1] = await context.prisma.animal.update({
      where: { id: testAnimals[1].id },
      data: {
        code: 'SALE-002',
        registrationNumber: 'BR-2020-SL0002',
      },
    });
  });

  afterEach(async () => {
    try {
      await context.prisma.saleItem.deleteMany({
        where: {
          sale: {
            companyId: context.testCompany.id,
          },
        },
      });
    } catch {
      // Ignore if table doesn't exist
    }
    try {
      await context.prisma.sale.deleteMany({
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
  });

  afterAll(async () => {
    await teardownIntegrationTest(context, {
      tables: ['saleItem', 'sale', 'animal', 'buyer'],
    });
  });

  describe('create with real database', () => {
    it('should create a sale with items and update animal status', async () => {
      const createDto: CreateSaleDto = {
        propertyId: context.testProperty.id,
        buyerId: context.testBuyer.id,
        saleDate: '2020-01-15',
        saleType: SaleType.SLAUGHTERHOUSE,
        pricingMode: PricingMode.INDIVIDUAL,
        paymentMethod: SalePaymentMethod.CASH_FLOW,
        totalPrice: 10000.0,
        saleItems: [
          {
            animalId: testAnimals[0].id,
            price: 5000.0,
            weight: 350.0,
            carcassWeight: 280.0,
          },
          {
            animalId: testAnimals[1].id,
            price: 5000.0,
            weight: 380.0,
          },
        ],
      };

      const result = await service.create(context.testUser.id, createDto);

      expect(result).toMatchObject({
        propertyId: context.testProperty.id,
        buyerId: context.testBuyer.id,
        saleType: SaleType.SLAUGHTERHOUSE,
        pricingMode: PricingMode.INDIVIDUAL,
        paymentMethod: SalePaymentMethod.CASH_FLOW,
        totalPrice: 10000.0,
        companyId: context.testCompany.id,
      });
      expect(result.id).toBeDefined();
      expect(result.saleItems).toBeDefined();
      expect(result.saleItems.length).toBe(2);

      // Verify animals status changed to sold
      const animals = await context.prisma.animal.findMany({
        where: {
          id: { in: testAnimals.map((a) => a.id) },
        },
      });
      animals.forEach((animal) => {
        expect(animal.status).toBe('sold');
      });
    });

    it('should create sale with fees', async () => {
      const createDto: CreateSaleDto = {
        propertyId: context.testProperty.id,
        buyerId: context.testBuyer.id,
        saleDate: '2020-01-15',
        saleType: SaleType.OTHER_FARM,
        pricingMode: PricingMode.INDIVIDUAL,
        paymentMethod: SalePaymentMethod.ACCOUNTS_RECEIVABLE,
        totalPrice: 10000.0,
        fees: [
          { id: 'fee-001', name: 'Transportation', amount: 500.0 },
          { id: 'fee-002', name: 'Insurance', amount: 200.0 },
        ],
        transportationFee: 300.0,
        additionalFees: 150.0,
        saleItems: [
          {
            animalId: testAnimals[0].id,
            price: 10000.0,
            weight: 350.0,
          },
        ],
      };

      const result = await service.create(context.testUser.id, createDto);

      expect(result.fees).toBeDefined();
      expect(Array.isArray(result.fees)).toBe(true);
      expect(result.fees?.length).toBe(2);
      expect(result.transportationFee).toBe(300.0);
      expect(result.additionalFees).toBe(150.0);
    });

    it('should throw BadRequestException if animal is already sold', async () => {
      // First, create a sale for the animal
      await context.prisma.animal.update({
        where: { id: testAnimals[0].id },
        data: { status: 'sold' },
      });

      const createDto: CreateSaleDto = {
        propertyId: context.testProperty.id,
        buyerId: context.testBuyer.id,
        saleDate: '2020-01-15',
        saleType: SaleType.SLAUGHTERHOUSE,
        pricingMode: PricingMode.INDIVIDUAL,
        paymentMethod: SalePaymentMethod.CASH_FLOW,
        totalPrice: 5000.0,
        saleItems: [
          {
            animalId: testAnimals[0].id,
            price: 5000.0,
            weight: 350.0,
          },
        ],
      };

      await expect(
        service.create(context.testUser.id, createDto),
      ).rejects.toThrow('already sold');
    });

    it('should throw BadRequestException if animal is inactive', async () => {
      await context.prisma.animal.update({
        where: { id: testAnimals[0].id },
        data: { status: 'inactive' },
      });

      const createDto: CreateSaleDto = {
        propertyId: context.testProperty.id,
        buyerId: context.testBuyer.id,
        saleDate: '2020-01-15',
        saleType: SaleType.SLAUGHTERHOUSE,
        pricingMode: PricingMode.INDIVIDUAL,
        paymentMethod: SalePaymentMethod.CASH_FLOW,
        totalPrice: 5000.0,
        saleItems: [
          {
            animalId: testAnimals[0].id,
            price: 5000.0,
            weight: 350.0,
          },
        ],
      };

      await expect(
        service.create(context.testUser.id, createDto),
      ).rejects.toThrow('inactive');
    });
  });

  describe('findAll', () => {
    it('should return all sales for company', async () => {
      // Create a sale
      const createDto: CreateSaleDto = {
        propertyId: context.testProperty.id,
        buyerId: context.testBuyer.id,
        saleDate: '2020-01-15',
        saleType: SaleType.SLAUGHTERHOUSE,
        pricingMode: PricingMode.INDIVIDUAL,
        paymentMethod: SalePaymentMethod.CASH_FLOW,
        totalPrice: 5000.0,
        saleItems: [
          {
            animalId: testAnimals[0].id,
            price: 5000.0,
            weight: 350.0,
          },
        ],
      };

      await service.create(context.testUser.id, createDto);

      const result = await service.findAll(context.testUser.id);

      expect(result.length).toBeGreaterThan(0);
      expect(result[0].companyId).toBe(context.testCompany.id);
    });
  });

  describe('findOne', () => {
    it('should return sale by ID', async () => {
      const createDto: CreateSaleDto = {
        propertyId: context.testProperty.id,
        buyerId: context.testBuyer.id,
        saleDate: '2020-01-15',
        saleType: SaleType.SLAUGHTERHOUSE,
        pricingMode: PricingMode.INDIVIDUAL,
        paymentMethod: SalePaymentMethod.CASH_FLOW,
        totalPrice: 5000.0,
        saleItems: [
          {
            animalId: testAnimals[0].id,
            price: 5000.0,
            weight: 350.0,
          },
        ],
      };

      const created = await service.create(context.testUser.id, createDto);
      const result = await service.findOne(context.testUser.id, created.id);

      expect(result.id).toBe(created.id);
      expect(result.companyId).toBe(context.testCompany.id);
    });
  });

  describe('findByAnimalId', () => {
    it('should return sales for animal', async () => {
      const createDto: CreateSaleDto = {
        propertyId: context.testProperty.id,
        buyerId: context.testBuyer.id,
        saleDate: '2020-01-15',
        saleType: SaleType.SLAUGHTERHOUSE,
        pricingMode: PricingMode.INDIVIDUAL,
        paymentMethod: SalePaymentMethod.CASH_FLOW,
        totalPrice: 5000.0,
        saleItems: [
          {
            animalId: testAnimals[0].id,
            price: 5000.0,
            weight: 350.0,
          },
        ],
      };

      await service.create(context.testUser.id, createDto);
      const result = await service.findByAnimalId(
        context.testUser.id,
        testAnimals[0].id,
      );

      expect(result.length).toBeGreaterThan(0);
      expect(
        result[0].saleItems.some((item) => item.animalId === testAnimals[0].id),
      ).toBe(true);
    });
  });

  describe('update', () => {
    it('should update sale and handle animal status changes', async () => {
      const createDto: CreateSaleDto = {
        propertyId: context.testProperty.id,
        buyerId: context.testBuyer.id,
        saleDate: '2020-01-15',
        saleType: SaleType.SLAUGHTERHOUSE,
        pricingMode: PricingMode.INDIVIDUAL,
        paymentMethod: SalePaymentMethod.CASH_FLOW,
        totalPrice: 5000.0,
        saleItems: [
          {
            animalId: testAnimals[0].id,
            price: 5000.0,
            weight: 350.0,
          },
        ],
      };

      const created = await service.create(context.testUser.id, createDto);

      // Create a new animal for the update
      const newAnimal = await context.prisma.animal.create({
        data: {
          code: 'SALE-003',
          registrationNumber: 'BR-2020-SL0003',
          status: 'active',
          companyId: context.testCompany.id,
          propertyId: context.testProperty.id,
        },
      });

      const updateDto: UpdateSaleDto = {
        saleItems: [
          {
            animalId: newAnimal.id,
            price: 6000.0,
            weight: 400.0,
          },
        ],
      };

      await service.update(context.testUser.id, created.id, updateDto);

      // Verify old animal status restored
      const oldAnimal = await context.prisma.animal.findUnique({
        where: { id: testAnimals[0].id },
      });
      expect(oldAnimal?.status).toBe('active');

      // Verify new animal status changed to sold
      const updatedNewAnimal = await context.prisma.animal.findUnique({
        where: { id: newAnimal.id },
      });
      expect(updatedNewAnimal?.status).toBe('sold');
    });
  });

  describe('remove', () => {
    it('should soft delete sale and restore animal status', async () => {
      const createDto: CreateSaleDto = {
        propertyId: context.testProperty.id,
        buyerId: context.testBuyer.id,
        saleDate: '2020-01-15',
        saleType: SaleType.SLAUGHTERHOUSE,
        pricingMode: PricingMode.INDIVIDUAL,
        paymentMethod: SalePaymentMethod.CASH_FLOW,
        totalPrice: 5000.0,
        saleItems: [
          {
            animalId: testAnimals[0].id,
            price: 5000.0,
            weight: 350.0,
          },
        ],
      };

      const created = await service.create(context.testUser.id, createDto);

      // Verify animal is sold
      let animal = await context.prisma.animal.findUnique({
        where: { id: testAnimals[0].id },
      });
      expect(animal?.status).toBe('sold');

      await service.remove(context.testUser.id, created.id);

      // Verify sale is soft deleted
      const sale = await context.prisma.sale.findUnique({
        where: { id: created.id },
      });
      expect(sale?.deletedAt).toBeDefined();

      // Verify animal status restored
      animal = await context.prisma.animal.findUnique({
        where: { id: testAnimals[0].id },
      });
      expect(animal?.status).toBe('active');
    });
  });

  describe('company isolation', () => {
    it('should not allow access to other company sales', async () => {
      // Clean up any existing test company first
      await context.prisma.company
        .deleteMany({
          where: { cnpj: '99.888.777/0001-66' },
        })
        .catch(() => {});

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

      const otherBuyer = await context.prisma.buyer.create({
        data: {
          code: '001',
          name: 'Other Buyer',
          companyId: otherCompany.id,
        },
      });

      await context.prisma.animal.create({
        data: {
          code: 'OTHER-001',
          registrationNumber: 'BR-2020-OT0001',
          status: 'active',
          companyId: otherCompany.id,
          propertyId: otherProperty.id,
        },
      });

      const otherSale = await context.prisma.sale.create({
        data: {
          companyId: otherCompany.id,
          propertyId: otherProperty.id,
          buyerId: otherBuyer.id,
          saleDate: new Date('2020-01-15'),
          saleType: SaleType.SLAUGHTERHOUSE,
          pricingMode: PricingMode.INDIVIDUAL,
          paymentMethod: SalePaymentMethod.CASH_FLOW,
          totalPrice: 5000.0,
        },
      });

      // Try to access other company's sale
      await expect(
        service.findOne(context.testUser.id, otherSale.id),
      ).rejects.toThrow('not found');

      // Cleanup
      try {
        await context.prisma.saleItem.deleteMany({
          where: { saleId: otherSale.id },
        });
      } catch {
        // Ignore if table doesn't exist
      }
      try {
        await context.prisma.sale.deleteMany({
          where: { companyId: otherCompany.id },
        });
      } catch {
        // Ignore if table doesn't exist
      }
      await context.prisma.animal.deleteMany({
        where: { companyId: otherCompany.id },
      });
      await context.prisma.buyer.deleteMany({
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
