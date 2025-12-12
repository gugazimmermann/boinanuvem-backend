import { Test, TestingModule } from '@nestjs/testing';
import { ThrottlerModule } from '@nestjs/throttler';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { SalesController } from './sales.controller';
import { SalesService } from './sales.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import {
  CreateSaleDto,
  UpdateSaleDto,
  SaleType,
  PricingMode,
  SalePaymentMethod,
} from './dto';
import type { CurrentUser } from '../auth/decorators/current-user.decorator';

describe('SalesController', () => {
  let controller: SalesController;
  let salesService: jest.Mocked<SalesService>;

  const mockCurrentUser: CurrentUser = {
    id: 'user-1',
    email: 'test@example.com',
    name: 'Test User',
    companyId: 'company-1',
    mainUser: false,
    permissions: {},
    company: {},
  };

  const mockSale = {
    id: 'sale-1',
    propertyId: 'property-1',
    buyerId: 'buyer-1',
    saleDate: new Date('2020-01-15'),
    saleType: SaleType.SLAUGHTERHOUSE,
    pricingMode: PricingMode.INDIVIDUAL,
    paymentMethod: SalePaymentMethod.CASH_FLOW,
    totalPrice: 50000.0,
    transportationFee: 500.0,
    additionalFees: 200.0,
    fees: [{ id: 'fee-1', name: 'Transportation', amount: 150 }],
    observation: 'Test sale',
    companyId: 'company-1',
    createdAt: new Date('2020-01-15'),
    updatedAt: new Date('2020-01-15'),
    saleItems: [
      {
        id: 'item-1',
        animalId: 'animal-1',
        price: 5000.0,
        weight: 350.0,
        carcassWeight: 280.0,
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

  beforeEach(async () => {
    const mockSalesService = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      findByAnimalId: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      imports: [ThrottlerModule.forRoot()],
      controllers: [SalesController],
      providers: [
        {
          provide: SalesService,
          useValue: mockSalesService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(PermissionsGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<SalesController>(SalesController);
    salesService = module.get(SalesService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create a sale successfully', async () => {
      salesService.create.mockResolvedValue(mockSale);

      const result = await controller.create(
        mockCurrentUser,
        mockCreateSaleDto,
      );

      expect(salesService.create).toHaveBeenCalledWith(
        mockCurrentUser.id,
        mockCreateSaleDto,
      );
      expect(result).toEqual(mockSale);
    });

    it('should handle BadRequestException when animal already sold', async () => {
      const error = new BadRequestException('Animal is already sold');
      salesService.create.mockRejectedValue(error);

      await expect(
        controller.create(mockCurrentUser, mockCreateSaleDto),
      ).rejects.toThrow(BadRequestException);
    });

    it('should handle NotFoundException when property not found', async () => {
      const error = new NotFoundException(
        'Property not found or does not belong to your company',
      );
      salesService.create.mockRejectedValue(error);

      await expect(
        controller.create(mockCurrentUser, mockCreateSaleDto),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('findAll', () => {
    it('should return all sales successfully', async () => {
      salesService.findAll.mockResolvedValue([mockSale]);

      const result = await controller.findAll(mockCurrentUser);

      expect(salesService.findAll).toHaveBeenCalledWith(mockCurrentUser.id);
      expect(result).toEqual([mockSale]);
    });

    it('should return empty array when no sales exist', async () => {
      salesService.findAll.mockResolvedValue([]);

      const result = await controller.findAll(mockCurrentUser);

      expect(result).toEqual([]);
    });
  });

  describe('findOne', () => {
    it('should return a sale by id successfully', async () => {
      salesService.findOne.mockResolvedValue(mockSale);

      const result = await controller.findOne(mockCurrentUser, 'sale-1');

      expect(salesService.findOne).toHaveBeenCalledWith(
        mockCurrentUser.id,
        'sale-1',
      );
      expect(result).toEqual(mockSale);
    });

    it('should handle NotFoundException when sale not found', async () => {
      const error = new NotFoundException('Sale record not found');
      salesService.findOne.mockRejectedValue(error);

      await expect(
        controller.findOne(mockCurrentUser, 'non-existent-id'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('findByAnimalId', () => {
    it('should return sales by animal id successfully', async () => {
      salesService.findByAnimalId.mockResolvedValue([mockSale]);

      const result = await controller.findByAnimalId(
        mockCurrentUser,
        'animal-1',
      );

      expect(salesService.findByAnimalId).toHaveBeenCalledWith(
        mockCurrentUser.id,
        'animal-1',
      );
      expect(result).toEqual([mockSale]);
    });

    it('should handle NotFoundException when animal not found', async () => {
      const error = new NotFoundException('Animal not found');
      salesService.findByAnimalId.mockRejectedValue(error);

      await expect(
        controller.findByAnimalId(mockCurrentUser, 'non-existent-animal-id'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    const updateDto: UpdateSaleDto = {
      observation: 'Updated observation',
    };

    it('should update a sale successfully', async () => {
      const updatedSale = { ...mockSale, ...updateDto };
      salesService.update.mockResolvedValue(updatedSale);

      const result = await controller.update(
        mockCurrentUser,
        'sale-1',
        updateDto,
      );

      expect(salesService.update).toHaveBeenCalledWith(
        mockCurrentUser.id,
        'sale-1',
        updateDto,
      );
      expect(result).toEqual(updatedSale);
    });

    it('should handle NotFoundException when sale not found', async () => {
      const error = new NotFoundException('Sale record not found');
      salesService.update.mockRejectedValue(error);

      await expect(
        controller.update(mockCurrentUser, 'non-existent-id', updateDto),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should soft delete a sale successfully', async () => {
      salesService.remove.mockResolvedValue({
        message: 'Sale record deleted successfully',
      });

      const result = await controller.remove(mockCurrentUser, 'sale-1');

      expect(salesService.remove).toHaveBeenCalledWith(
        mockCurrentUser.id,
        'sale-1',
      );
      expect(result).toEqual({
        message: 'Sale record deleted successfully',
      });
    });

    it('should handle NotFoundException when sale not found', async () => {
      const error = new NotFoundException('Sale record not found');
      salesService.remove.mockRejectedValue(error);

      await expect(
        controller.remove(mockCurrentUser, 'non-existent-id'),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
