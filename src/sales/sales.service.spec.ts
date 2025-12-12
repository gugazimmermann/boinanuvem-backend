import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { SalesService } from './sales.service';
import { PrismaService } from '../common/services/prisma.service';
import {
  CreateSaleDto,
  UpdateSaleDto,
  SaleType,
  PricingMode,
  SalePaymentMethod,
} from './dto';

describe('SalesService', () => {
  let service: SalesService;
  let prismaService: jest.Mocked<PrismaService>;

  const mockUser = {
    id: 'user-1',
    companyId: 'company-1',
  };

  const mockAnimal = {
    id: 'animal-1',
    code: '001',
    registrationNumber: 'BR-2020-FJ0001',
    status: 'active',
    companyId: 'company-1',
    propertyId: 'property-1',
    deletedAt: null,
  };

  const mockSale = {
    id: 'sale-1',
    companyId: 'company-1',
    propertyId: 'property-1',
    buyerId: 'buyer-1',
    saleDate: new Date('2020-01-15'),
    saleType: SaleType.SLAUGHTERHOUSE,
    pricingMode: PricingMode.INDIVIDUAL,
    paymentMethod: SalePaymentMethod.CASH_FLOW,
    totalPrice: { toNumber: () => 50000 },
    fees: [{ id: 'fee-1', name: 'Transportation', amount: 150 }],
    transportationFee: { toNumber: () => 500 },
    additionalFees: { toNumber: () => 200 },
    linkedCashFlowId: null,
    linkedAccountsReceivableId: null,
    observation: 'Test sale',
    deletedAt: null,
    createdAt: new Date('2020-01-15'),
    updatedAt: new Date('2020-01-15'),
    saleItems: [
      {
        id: 'item-1',
        saleId: 'sale-1',
        animalId: 'animal-1',
        price: { toNumber: () => 5000 },
        weight: { toNumber: () => 350 },
        carcassWeight: { toNumber: () => 280 },
        createdAt: new Date('2020-01-15'),
      },
    ],
  };

  const mockCreateSaleDto: CreateSaleDto = {
    propertyId: 'property-1',
    buyerId: 'buyer-1',
    saleDate: '2020-01-15',
    saleType: SaleType.SLAUGHTERHOUSE,
    pricingMode: PricingMode.INDIVIDUAL,
    paymentMethod: SalePaymentMethod.CASH_FLOW,
    totalPrice: 50000,
    fees: [{ id: 'fee-1', name: 'Transportation', amount: 150 }],
    transportationFee: 500,
    additionalFees: 200,
    saleItems: [
      {
        animalId: 'animal-1',
        price: 5000,
        weight: 350,
        carcassWeight: 280,
      },
    ],
    observation: 'Test sale',
  };

  const mockProperty = {
    id: 'property-1',
    companyId: 'company-1',
  };

  const mockBuyer = {
    id: 'buyer-1',
    companyId: 'company-1',
  };

  beforeEach(async () => {
    const mockPrismaService = {
      user: {
        findUnique: jest.fn(),
      },
      animal: {
        findFirst: jest.fn(),
        updateMany: jest.fn(),
      },
      sale: {
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      saleItem: {
        createMany: jest.fn(),
        deleteMany: jest.fn(),
      },
      property: {
        findFirst: jest.fn(),
      },
      buyer: {
        findFirst: jest.fn(),
      },
      $transaction: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SalesService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<SalesService>(SalesService);
    prismaService = module.get(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a sale successfully', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.property.findFirst.mockResolvedValue(mockProperty);
      prismaService.buyer.findFirst.mockResolvedValue(mockBuyer);
      prismaService.animal.findFirst.mockResolvedValue(mockAnimal);

      prismaService.$transaction.mockImplementation(async (callback) => {
        const tx = {
          sale: {
            create: jest.fn().mockResolvedValue(mockSale),
            findUnique: jest.fn().mockResolvedValue(mockSale),
          },
          saleItem: {
            createMany: jest.fn().mockResolvedValue({ count: 1 }),
          },
          animal: {
            updateMany: jest.fn().mockResolvedValue({ count: 1 }),
          },
        };
        return callback(tx);
      });

      const result = await service.create(mockUser.id, mockCreateSaleDto);

      expect(prismaService.$transaction).toHaveBeenCalled();
      expect(result).toBeDefined();
      expect(result.id).toBe(mockSale.id);
    });

    it('should throw NotFoundException if property not found', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.property.findFirst.mockResolvedValue(null);

      await expect(
        service.create(mockUser.id, mockCreateSaleDto),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if buyer not found', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.property.findFirst.mockResolvedValue(mockProperty);
      prismaService.buyer.findFirst.mockResolvedValue(null);

      await expect(
        service.create(mockUser.id, mockCreateSaleDto),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if animal not found', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.property.findFirst.mockResolvedValue(mockProperty);
      prismaService.buyer.findFirst.mockResolvedValue(mockBuyer);
      prismaService.animal.findFirst.mockResolvedValue(null);

      await expect(
        service.create(mockUser.id, mockCreateSaleDto),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if animal is already sold', async () => {
      const soldAnimal = { ...mockAnimal, status: 'sold' };
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.property.findFirst.mockResolvedValue(mockProperty);
      prismaService.buyer.findFirst.mockResolvedValue(mockBuyer);
      prismaService.animal.findFirst.mockResolvedValue(soldAnimal);

      await expect(
        service.create(mockUser.id, mockCreateSaleDto),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if animal is inactive', async () => {
      const inactiveAnimal = { ...mockAnimal, status: 'inactive' };
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.property.findFirst.mockResolvedValue(mockProperty);
      prismaService.buyer.findFirst.mockResolvedValue(mockBuyer);
      prismaService.animal.findFirst.mockResolvedValue(inactiveAnimal);

      await expect(
        service.create(mockUser.id, mockCreateSaleDto),
      ).rejects.toThrow(BadRequestException);
    });

    it('should update animal status to sold', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.property.findFirst.mockResolvedValue(mockProperty);
      prismaService.buyer.findFirst.mockResolvedValue(mockBuyer);
      prismaService.animal.findFirst.mockResolvedValue(mockAnimal);

      let animalUpdateCalled = false;
      prismaService.$transaction.mockImplementation(async (callback) => {
        const tx = {
          sale: {
            create: jest.fn().mockResolvedValue(mockSale),
            findUnique: jest.fn().mockResolvedValue(mockSale),
          },
          saleItem: {
            createMany: jest.fn().mockResolvedValue({ count: 1 }),
          },
          animal: {
            updateMany: jest.fn().mockImplementation(() => {
              animalUpdateCalled = true;
              return Promise.resolve({ count: 1 });
            }),
          },
        };
        return callback(tx);
      });

      await service.create(mockUser.id, mockCreateSaleDto);

      expect(animalUpdateCalled).toBe(true);
    });

    it('should create sale with null fees', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.property.findFirst.mockResolvedValue(mockProperty);
      prismaService.buyer.findFirst.mockResolvedValue(mockBuyer);
      prismaService.animal.findFirst.mockResolvedValue(mockAnimal);

      const dtoWithoutFees = {
        ...mockCreateSaleDto,
        fees: undefined,
      };

      prismaService.$transaction.mockImplementation(async (callback) => {
        const tx = {
          sale: {
            create: jest.fn().mockResolvedValue(mockSale),
            findUnique: jest.fn().mockResolvedValue(mockSale),
          },
          saleItem: {
            createMany: jest.fn().mockResolvedValue({ count: 1 }),
          },
          animal: {
            updateMany: jest.fn().mockResolvedValue({ count: 1 }),
          },
        };
        return callback(tx);
      });

      await service.create(mockUser.id, dtoWithoutFees);

      expect(prismaService.$transaction).toHaveBeenCalled();
    });

    it('should create sale without optional fields', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.property.findFirst.mockResolvedValue(mockProperty);
      prismaService.buyer.findFirst.mockResolvedValue(mockBuyer);
      prismaService.animal.findFirst.mockResolvedValue(mockAnimal);

      const minimalDto: CreateSaleDto = {
        saleDate: '2020-01-15',
        saleType: SaleType.SLAUGHTERHOUSE,
        pricingMode: PricingMode.INDIVIDUAL,
        paymentMethod: SalePaymentMethod.CASH_FLOW,
        totalPrice: 50000,
        saleItems: [
          {
            animalId: 'animal-1',
            price: 5000,
            weight: 350,
          },
        ],
      };

      prismaService.$transaction.mockImplementation(async (callback) => {
        const tx = {
          sale: {
            create: jest.fn().mockResolvedValue(mockSale),
            findUnique: jest.fn().mockResolvedValue(mockSale),
          },
          saleItem: {
            createMany: jest.fn().mockResolvedValue({ count: 1 }),
          },
          animal: {
            updateMany: jest.fn().mockResolvedValue({ count: 1 }),
          },
        };
        return callback(tx);
      });

      await service.create(mockUser.id, minimalDto);

      expect(prismaService.$transaction).toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('should return all sales for company', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.sale.findMany.mockResolvedValue([mockSale]);

      const result = await service.findAll(mockUser.id);

      expect(prismaService.sale.findMany).toHaveBeenCalledWith({
        where: {
          companyId: 'company-1',
          deletedAt: null,
        },
        include: {
          saleItems: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });
      expect(result).toHaveLength(1);
    });
  });

  describe('findOne', () => {
    it('should return sale by ID', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.sale.findFirst.mockResolvedValue(mockSale);

      const result = await service.findOne(mockUser.id, 'sale-1');

      expect(result).toBeDefined();
      expect(result.id).toBe('sale-1');
    });

    it('should throw NotFoundException if sale not found', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.sale.findFirst.mockResolvedValue(null);

      await expect(service.findOne(mockUser.id, 'sale-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException if user not found', async () => {
      prismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.findOne('invalid-user', 'sale-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findByAnimalId', () => {
    it('should return sales for animal', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.animal.findFirst.mockResolvedValue(mockAnimal);
      prismaService.sale.findMany.mockResolvedValue([mockSale]);

      const result = await service.findByAnimalId(mockUser.id, 'animal-1');

      expect(result).toHaveLength(1);
    });

    it('should throw NotFoundException if animal not found', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.animal.findFirst.mockResolvedValue(null);

      await expect(
        service.findByAnimalId(mockUser.id, 'animal-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update sale successfully', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.sale.findFirst.mockResolvedValue(mockSale);
      prismaService.property.findFirst.mockResolvedValue(mockProperty);
      prismaService.buyer.findFirst.mockResolvedValue(mockBuyer);
      prismaService.animal.findFirst.mockResolvedValue(mockAnimal);
      prismaService.saleItem.deleteMany.mockResolvedValue({ count: 1 });
      prismaService.saleItem.createMany.mockResolvedValue({ count: 1 });
      prismaService.animal.updateMany.mockResolvedValue({ count: 1 });
      prismaService.sale.update.mockResolvedValue(mockSale);
      prismaService.sale.findUnique.mockResolvedValue(mockSale);

      const updateDto: UpdateSaleDto = {
        totalPrice: 60000,
      };

      const result = await service.update(mockUser.id, 'sale-1', updateDto);

      expect(prismaService.sale.update).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('should handle animal status changes when sale items updated', async () => {
      const newAnimal = { ...mockAnimal, id: 'animal-2' };
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.sale.findFirst.mockResolvedValue(mockSale);
      prismaService.property.findFirst.mockResolvedValue(mockProperty);
      prismaService.buyer.findFirst.mockResolvedValue(mockBuyer);
      prismaService.animal.findFirst
        .mockResolvedValueOnce(mockAnimal)
        .mockResolvedValueOnce(newAnimal);
      prismaService.saleItem.deleteMany.mockResolvedValue({ count: 1 });
      prismaService.saleItem.createMany.mockResolvedValue({ count: 1 });
      prismaService.animal.updateMany.mockResolvedValue({ count: 1 });
      prismaService.sale.update.mockResolvedValue(mockSale);
      prismaService.sale.findUnique.mockResolvedValue(mockSale);

      const updateDto: UpdateSaleDto = {
        saleItems: [
          {
            animalId: 'animal-2',
            price: 6000,
            weight: 400,
          },
        ],
      };

      await service.update(mockUser.id, 'sale-1', updateDto);

      expect(prismaService.animal.updateMany).toHaveBeenCalledTimes(2); // Remove old, add new
    });

    it('should update sale without saleItems (partial update)', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.sale.findFirst.mockResolvedValue(mockSale);
      prismaService.sale.update.mockResolvedValue(mockSale);
      prismaService.sale.findUnique.mockResolvedValue(mockSale);

      const updateDto: UpdateSaleDto = {
        totalPrice: 60000,
        observation: 'Updated observation',
      };

      const result = await service.update(mockUser.id, 'sale-1', updateDto);

      expect(prismaService.sale.update).toHaveBeenCalled();
      expect(prismaService.saleItem.deleteMany).not.toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('should update sale with same animal IDs (no status changes)', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.sale.findFirst.mockResolvedValue(mockSale);
      prismaService.property.findFirst.mockResolvedValue(mockProperty);
      prismaService.buyer.findFirst.mockResolvedValue(mockBuyer);
      prismaService.animal.findFirst.mockResolvedValue(mockAnimal);
      prismaService.saleItem.deleteMany.mockResolvedValue({ count: 1 });
      prismaService.saleItem.createMany.mockResolvedValue({ count: 1 });
      prismaService.sale.update.mockResolvedValue(mockSale);
      prismaService.sale.findUnique.mockResolvedValue(mockSale);

      const updateDto: UpdateSaleDto = {
        saleItems: [
          {
            animalId: 'animal-1', // Same animal ID
            price: 6000,
            weight: 400,
          },
        ],
      };

      await service.update(mockUser.id, 'sale-1', updateDto);

      // When IDs are the same, removedIds and addedIds are empty arrays
      // but updateMany is still called with empty arrays (which is a no-op)
      expect(prismaService.animal.updateMany).toHaveBeenCalledTimes(2);
      expect(prismaService.animal.updateMany).toHaveBeenCalledWith({
        where: { id: { in: [] } },
        data: { status: 'active' },
      });
      expect(prismaService.animal.updateMany).toHaveBeenCalledWith({
        where: { id: { in: [] } },
        data: { status: 'sold' },
      });
    });

    it('should update sale with empty saleItems array', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.sale.findFirst.mockResolvedValue(mockSale);
      prismaService.saleItem.deleteMany.mockResolvedValue({ count: 0 });
      prismaService.saleItem.createMany.mockResolvedValue({ count: 0 });
      prismaService.animal.updateMany.mockResolvedValue({ count: 1 });
      prismaService.sale.update.mockResolvedValue(mockSale);
      prismaService.sale.findUnique.mockResolvedValue(mockSale);

      const updateDto: UpdateSaleDto = {
        saleItems: [],
      };

      await service.update(mockUser.id, 'sale-1', updateDto);

      expect(prismaService.saleItem.deleteMany).toHaveBeenCalled();
      expect(prismaService.saleItem.createMany).toHaveBeenCalledWith({
        data: [],
      });
    });

    it('should update sale with fees as null', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.sale.findFirst.mockResolvedValue(mockSale);
      prismaService.sale.update.mockResolvedValue(mockSale);
      prismaService.sale.findUnique.mockResolvedValue(mockSale);

      const updateDto: UpdateSaleDto = {
        fees: null,
      };

      await service.update(mockUser.id, 'sale-1', updateDto);

      expect(prismaService.sale.update).toHaveBeenCalled();
    });

    it('should update sale with fees as undefined', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.sale.findFirst.mockResolvedValue(mockSale);
      prismaService.sale.update.mockResolvedValue(mockSale);
      prismaService.sale.findUnique.mockResolvedValue(mockSale);

      const updateDto: UpdateSaleDto = {
        fees: undefined,
      };

      await service.update(mockUser.id, 'sale-1', updateDto);

      expect(prismaService.sale.update).toHaveBeenCalled();
    });

    it('should update sale with all optional fields', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.sale.findFirst.mockResolvedValue(mockSale);
      prismaService.property.findFirst.mockResolvedValue(mockProperty);
      prismaService.buyer.findFirst.mockResolvedValue(mockBuyer);
      prismaService.sale.update.mockResolvedValue(mockSale);
      prismaService.sale.findUnique.mockResolvedValue(mockSale);

      const updateDto: UpdateSaleDto = {
        saleDate: '2020-01-20',
        propertyId: 'property-1',
        buyerId: 'buyer-1',
        saleType: SaleType.DIRECT,
        pricingMode: PricingMode.BULK,
        paymentMethod: SalePaymentMethod.ACCOUNTS_RECEIVABLE,
        totalPrice: 70000,
        fees: [{ id: 'fee-2', name: 'New Fee', amount: 200 }],
        transportationFee: 600,
        additionalFees: 300,
        observation: 'Updated observation',
      };

      await service.update(mockUser.id, 'sale-1', updateDto);

      expect(prismaService.sale.update).toHaveBeenCalled();
    });

    it('should handle update with null transportationFee', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.sale.findFirst.mockResolvedValue(mockSale);
      prismaService.sale.update.mockResolvedValue(mockSale);
      prismaService.sale.findUnique.mockResolvedValue(mockSale);

      const updateDto: UpdateSaleDto = {
        transportationFee: null,
      };

      await service.update(mockUser.id, 'sale-1', updateDto);

      expect(prismaService.sale.update).toHaveBeenCalled();
    });

    it('should handle update with null additionalFees', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.sale.findFirst.mockResolvedValue(mockSale);
      prismaService.sale.update.mockResolvedValue(mockSale);
      prismaService.sale.findUnique.mockResolvedValue(mockSale);

      const updateDto: UpdateSaleDto = {
        additionalFees: null,
      };

      await service.update(mockUser.id, 'sale-1', updateDto);

      expect(prismaService.sale.update).toHaveBeenCalled();
    });

    it('should handle update with null observation', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.sale.findFirst.mockResolvedValue(mockSale);
      prismaService.sale.update.mockResolvedValue(mockSale);
      prismaService.sale.findUnique.mockResolvedValue(mockSale);

      const updateDto: UpdateSaleDto = {
        observation: null,
      };

      await service.update(mockUser.id, 'sale-1', updateDto);

      expect(prismaService.sale.update).toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('should soft delete sale and restore animal status', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.sale.findFirst.mockResolvedValue(mockSale);
      prismaService.animal.updateMany.mockResolvedValue({ count: 1 });
      prismaService.sale.update.mockResolvedValue({
        ...mockSale,
        deletedAt: new Date(),
      });

      const result = await service.remove(mockUser.id, 'sale-1');

      expect(prismaService.animal.updateMany).toHaveBeenCalledWith({
        where: {
          id: {
            in: ['animal-1'],
          },
        },
        data: {
          status: 'active',
        },
      });
      expect(prismaService.sale.update).toHaveBeenCalled();
      expect(result.message).toBe('Sale record deleted successfully');
    });
  });

  describe('transform methods', () => {
    it('should transform sale with null Decimal values', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      const saleWithNulls = {
        ...mockSale,
        transportationFee: null,
        additionalFees: null,
        linkedCashFlowId: null,
        linkedAccountsReceivableId: null,
        observation: null,
      };
      prismaService.sale.findFirst.mockResolvedValue(saleWithNulls);

      const result = await service.findOne(mockUser.id, 'sale-1');

      expect(result.transportationFee).toBeUndefined();
      expect(result.additionalFees).toBeUndefined();
      expect(result.linkedCashFlowId).toBeUndefined();
      expect(result.linkedAccountsReceivableId).toBeUndefined();
      expect(result.observation).toBeUndefined();
    });

    it('should transform sale with number values (not Decimal objects)', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      const saleWithNumbers = {
        ...mockSale,
        totalPrice: 50000,
        transportationFee: 500,
        additionalFees: 200,
        saleItems: [
          {
            ...mockSale.saleItems[0],
            price: 5000,
            weight: 350,
            carcassWeight: 280,
          },
        ],
      };
      prismaService.sale.findFirst.mockResolvedValue(saleWithNumbers);

      const result = await service.findOne(mockUser.id, 'sale-1');

      expect(result.totalPrice).toBe(50000);
      expect(result.saleItems[0].price).toBe(5000);
      expect(result.saleItems[0].weight).toBe(350);
      expect(result.saleItems[0].carcassWeight).toBe(280);
    });

    it('should transform sale with null carcassWeight', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      const saleWithNullCarcass = {
        ...mockSale,
        saleItems: [
          {
            ...mockSale.saleItems[0],
            carcassWeight: null,
          },
        ],
      };
      prismaService.sale.findFirst.mockResolvedValue(saleWithNullCarcass);

      const result = await service.findOne(mockUser.id, 'sale-1');

      expect(result.saleItems[0].carcassWeight).toBeUndefined();
    });

    it('should transform sale item with number carcassWeight', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      const saleWithNumberCarcass = {
        ...mockSale,
        saleItems: [
          {
            ...mockSale.saleItems[0],
            carcassWeight: 280,
          },
        ],
      };
      prismaService.sale.findFirst.mockResolvedValue(saleWithNumberCarcass);

      const result = await service.findOne(mockUser.id, 'sale-1');

      expect(result.saleItems[0].carcassWeight).toBe(280);
    });
  });
});
