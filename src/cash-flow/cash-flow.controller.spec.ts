import { Test, TestingModule } from '@nestjs/testing';
import { ThrottlerModule } from '@nestjs/throttler';
import { NotFoundException } from '@nestjs/common';
import { CashFlowController } from './cash-flow.controller';
import { CashFlowService } from './cash-flow.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { CreateCashFlowDto, UpdateCashFlowDto } from './dto';
import type { CurrentUser } from '../auth/decorators/current-user.decorator';

describe('CashFlowController', () => {
  let controller: CashFlowController;
  let cashFlowService: jest.Mocked<CashFlowService>;

  const mockCurrentUser: CurrentUser = {
    id: 'user-1',
    email: 'test@example.com',
    name: 'Test User',
    companyId: 'company-1',
    mainUser: false,
    permissions: {},
    company: {},
  };

  const mockCashFlow = {
    id: 'cashflow-1',
    companyId: 'company-1',
    type: 'expense',
    amount: 1000.0,
    date: new Date('2025-01-15'),
    description: 'Test expense',
    category: 'feed',
    paymentMethod: 'cash',
    status: 'completed',
    propertyId: 'property-1',
    createdAt: new Date('2025-01-15'),
    updatedAt: new Date('2025-01-15'),
  };

  const mockCreateCashFlowDto: CreateCashFlowDto = {
    type: 'expense',
    amount: 1000.0,
    date: '2025-01-15',
    description: 'Test expense',
    category: 'feed',
    paymentMethod: 'cash',
    status: 'completed',
  };

  beforeEach(async () => {
    const mockCashFlowService = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      imports: [ThrottlerModule.forRoot()],
      controllers: [CashFlowController],
      providers: [
        {
          provide: CashFlowService,
          useValue: mockCashFlowService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(PermissionsGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<CashFlowController>(CashFlowController);
    cashFlowService = module.get(CashFlowService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create a cash flow transaction successfully', async () => {
      cashFlowService.create.mockResolvedValue(mockCashFlow);

      const result = await controller.create(
        mockCurrentUser,
        mockCreateCashFlowDto,
      );

      expect(cashFlowService.create).toHaveBeenCalledWith(
        mockCurrentUser.id,
        mockCreateCashFlowDto,
      );
      expect(result).toEqual(mockCashFlow);
    });

    it('should handle NotFoundException when property not found', async () => {
      const error = new NotFoundException(
        'Property not found or does not belong to your company',
      );
      cashFlowService.create.mockRejectedValue(error);

      await expect(
        controller.create(mockCurrentUser, mockCreateCashFlowDto),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('findAll', () => {
    it('should return all cash flow transactions successfully', async () => {
      cashFlowService.findAll.mockResolvedValue([mockCashFlow]);

      const result = await controller.findAll(mockCurrentUser);

      expect(cashFlowService.findAll).toHaveBeenCalledWith(mockCurrentUser.id);
      expect(result).toEqual([mockCashFlow]);
    });

    it('should return empty array when no transactions exist', async () => {
      cashFlowService.findAll.mockResolvedValue([]);

      const result = await controller.findAll(mockCurrentUser);

      expect(result).toEqual([]);
    });
  });

  describe('findOne', () => {
    it('should return a cash flow transaction by id successfully', async () => {
      cashFlowService.findOne.mockResolvedValue(mockCashFlow);

      const result = await controller.findOne(mockCurrentUser, 'cashflow-1');

      expect(cashFlowService.findOne).toHaveBeenCalledWith(
        mockCurrentUser.id,
        'cashflow-1',
      );
      expect(result).toEqual(mockCashFlow);
    });

    it('should handle NotFoundException when transaction not found', async () => {
      const error = new NotFoundException('Cash flow transaction not found');
      cashFlowService.findOne.mockRejectedValue(error);

      await expect(
        controller.findOne(mockCurrentUser, 'non-existent-id'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    const updateDto: UpdateCashFlowDto = {
      description: 'Updated description',
    };

    it('should update a cash flow transaction successfully', async () => {
      const updatedCashFlow = { ...mockCashFlow, ...updateDto };
      cashFlowService.update.mockResolvedValue(updatedCashFlow);

      const result = await controller.update(
        mockCurrentUser,
        'cashflow-1',
        updateDto,
      );

      expect(cashFlowService.update).toHaveBeenCalledWith(
        mockCurrentUser.id,
        'cashflow-1',
        updateDto,
      );
      expect(result).toEqual(updatedCashFlow);
    });

    it('should handle NotFoundException when transaction not found', async () => {
      const error = new NotFoundException('Cash flow transaction not found');
      cashFlowService.update.mockRejectedValue(error);

      await expect(
        controller.update(mockCurrentUser, 'non-existent-id', updateDto),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should soft delete a cash flow transaction successfully', async () => {
      cashFlowService.remove.mockResolvedValue(undefined);

      await controller.remove(mockCurrentUser, 'cashflow-1');

      expect(cashFlowService.remove).toHaveBeenCalledWith(
        mockCurrentUser.id,
        'cashflow-1',
      );
    });

    it('should handle NotFoundException when transaction not found', async () => {
      const error = new NotFoundException('Cash flow transaction not found');
      cashFlowService.remove.mockRejectedValue(error);

      await expect(
        controller.remove(mockCurrentUser, 'non-existent-id'),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
