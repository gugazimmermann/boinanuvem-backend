import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { CashFlowService } from './cash-flow.service';
import { PrismaService } from '../common/services/prisma.service';
import { CreateCashFlowDto, UpdateCashFlowDto } from './dto';

describe('CashFlowService', () => {
  let service: CashFlowService;
  let prismaService: jest.Mocked<PrismaService>;

  const mockUser = {
    id: 'user-1',
    companyId: 'company-1',
  };

  const mockProperty = {
    id: 'property-1',
    companyId: 'company-1',
    deletedAt: null,
  };

  const mockCashFlow = {
    id: 'cashflow-1',
    companyId: 'company-1',
    type: 'expense',
    amount: { toNumber: () => 1000.0 },
    date: new Date('2025-01-15'),
    description: 'Test expense',
    category: 'feed',
    paymentMethod: 'cash',
    status: 'completed',
    bankAccountId: null,
    propertyId: 'property-1',
    deletedAt: null,
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
    const mockPrismaService = {
      user: {
        findUnique: jest.fn(),
      },
      property: {
        findFirst: jest.fn(),
      },
      employee: {
        findFirst: jest.fn(),
      },
      serviceProvider: {
        findFirst: jest.fn(),
      },
      supplier: {
        findFirst: jest.fn(),
      },
      buyer: {
        findFirst: jest.fn(),
      },
      bankAccount: {
        findFirst: jest.fn(),
      },
      cashFlow: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CashFlowService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<CashFlowService>(CashFlowService);
    prismaService = module.get(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a cash flow transaction successfully', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.cashFlow.create.mockResolvedValue(mockCashFlow);

      const result = await service.create(mockUser.id, mockCreateCashFlowDto);

      expect(prismaService.cashFlow.create).toHaveBeenCalled();
      expect(result).toBeDefined();
      expect(result.id).toBe('cashflow-1');
    });

    it('should validate property if provided', async () => {
      const dtoWithProperty = {
        ...mockCreateCashFlowDto,
        propertyId: 'property-1',
      };

      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.property.findFirst.mockResolvedValue(mockProperty);
      prismaService.cashFlow.create.mockResolvedValue(mockCashFlow);

      await service.create(mockUser.id, dtoWithProperty);

      expect(prismaService.property.findFirst).toHaveBeenCalled();
    });

    it('should throw NotFoundException if property not found', async () => {
      const dtoWithProperty = {
        ...mockCreateCashFlowDto,
        propertyId: 'property-1',
      };

      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.property.findFirst.mockResolvedValue(null);

      await expect(
        service.create(mockUser.id, dtoWithProperty),
      ).rejects.toThrow(NotFoundException);
    });

    it('should create with all optional fields as null', async () => {
      const dtoWithNulls: CreateCashFlowDto = {
        type: 'expense',
        amount: 1000.0,
        date: '2025-01-15',
        description: null,
        category: null,
        paymentMethod: null,
        status: null,
        bankAccountId: null,
        propertyId: null,
        employeeId: null,
        serviceProviderId: null,
        supplierId: null,
        buyerId: null,
        paymentDate: null,
        referenceNumber: null,
        observation: null,
      };

      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.cashFlow.create.mockResolvedValue(mockCashFlow);

      await service.create(mockUser.id, dtoWithNulls);

      expect(prismaService.cashFlow.create).toHaveBeenCalled();
    });

    it('should create with all optional fields as undefined', async () => {
      const dtoWithUndefined: CreateCashFlowDto = {
        type: 'expense',
        amount: 1000.0,
        date: '2025-01-15',
      };

      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.cashFlow.create.mockResolvedValue(mockCashFlow);

      await service.create(mockUser.id, dtoWithUndefined);

      expect(prismaService.cashFlow.create).toHaveBeenCalled();
    });

    it('should validate employee if provided', async () => {
      const mockEmployee = {
        id: 'employee-1',
        companyId: 'company-1',
        deletedAt: null,
      };

      const dtoWithEmployee = {
        ...mockCreateCashFlowDto,
        employeeId: 'employee-1',
      };

      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.employee.findFirst.mockResolvedValue(mockEmployee);
      prismaService.cashFlow.create.mockResolvedValue(mockCashFlow);

      await service.create(mockUser.id, dtoWithEmployee);

      expect(prismaService.employee.findFirst).toHaveBeenCalled();
    });

    it('should throw NotFoundException if employee not found', async () => {
      const dtoWithEmployee = {
        ...mockCreateCashFlowDto,
        employeeId: 'employee-1',
      };

      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.employee.findFirst.mockResolvedValue(null);

      await expect(
        service.create(mockUser.id, dtoWithEmployee),
      ).rejects.toThrow(NotFoundException);
    });

    it('should validate serviceProvider if provided', async () => {
      const mockServiceProvider = {
        id: 'service-provider-1',
        companyId: 'company-1',
        deletedAt: null,
      };

      const dtoWithServiceProvider = {
        ...mockCreateCashFlowDto,
        serviceProviderId: 'service-provider-1',
      };

      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.serviceProvider.findFirst.mockResolvedValue(
        mockServiceProvider,
      );
      prismaService.cashFlow.create.mockResolvedValue(mockCashFlow);

      await service.create(mockUser.id, dtoWithServiceProvider);

      expect(prismaService.serviceProvider.findFirst).toHaveBeenCalled();
    });

    it('should throw NotFoundException if serviceProvider not found', async () => {
      const dtoWithServiceProvider = {
        ...mockCreateCashFlowDto,
        serviceProviderId: 'service-provider-1',
      };

      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.serviceProvider.findFirst.mockResolvedValue(null);

      await expect(
        service.create(mockUser.id, dtoWithServiceProvider),
      ).rejects.toThrow(NotFoundException);
    });

    it('should validate supplier if provided', async () => {
      const mockSupplier = {
        id: 'supplier-1',
        companyId: 'company-1',
        deletedAt: null,
      };

      const dtoWithSupplier = {
        ...mockCreateCashFlowDto,
        supplierId: 'supplier-1',
      };

      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.supplier.findFirst.mockResolvedValue(mockSupplier);
      prismaService.cashFlow.create.mockResolvedValue(mockCashFlow);

      await service.create(mockUser.id, dtoWithSupplier);

      expect(prismaService.supplier.findFirst).toHaveBeenCalled();
    });

    it('should throw NotFoundException if supplier not found', async () => {
      const dtoWithSupplier = {
        ...mockCreateCashFlowDto,
        supplierId: 'supplier-1',
      };

      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.supplier.findFirst.mockResolvedValue(null);

      await expect(
        service.create(mockUser.id, dtoWithSupplier),
      ).rejects.toThrow(NotFoundException);
    });

    it('should validate buyer if provided', async () => {
      const mockBuyer = {
        id: 'buyer-1',
        companyId: 'company-1',
        deletedAt: null,
      };

      const dtoWithBuyer = {
        ...mockCreateCashFlowDto,
        buyerId: 'buyer-1',
      };

      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.buyer.findFirst.mockResolvedValue(mockBuyer);
      prismaService.cashFlow.create.mockResolvedValue(mockCashFlow);

      await service.create(mockUser.id, dtoWithBuyer);

      expect(prismaService.buyer.findFirst).toHaveBeenCalled();
    });

    it('should throw NotFoundException if buyer not found', async () => {
      const dtoWithBuyer = {
        ...mockCreateCashFlowDto,
        buyerId: 'buyer-1',
      };

      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.buyer.findFirst.mockResolvedValue(null);

      await expect(service.create(mockUser.id, dtoWithBuyer)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should validate bank account if provided', async () => {
      const mockBankAccount = {
        id: 'bank-account-1',
        companyId: 'company-1',
        deletedAt: null,
      };

      const dtoWithBankAccount = {
        ...mockCreateCashFlowDto,
        bankAccountId: 'bank-account-1',
      };

      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.bankAccount.findFirst.mockResolvedValue(mockBankAccount);
      prismaService.cashFlow.create.mockResolvedValue(mockCashFlow);

      await service.create(mockUser.id, dtoWithBankAccount);

      expect(prismaService.bankAccount.findFirst).toHaveBeenCalled();
    });

    it('should throw NotFoundException if bank account not found', async () => {
      const dtoWithBankAccount = {
        ...mockCreateCashFlowDto,
        bankAccountId: 'bank-account-1',
      };

      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.bankAccount.findFirst.mockResolvedValue(null);

      await expect(
        service.create(mockUser.id, dtoWithBankAccount),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if bank account belongs to different company', async () => {
      const dtoWithBankAccount = {
        ...mockCreateCashFlowDto,
        bankAccountId: 'bank-account-1',
      };

      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.bankAccount.findFirst.mockResolvedValue(null);

      await expect(
        service.create(mockUser.id, dtoWithBankAccount),
      ).rejects.toThrow(NotFoundException);
    });

    it('should create with bankAccountId set to null', async () => {
      const dtoWithNullBankAccount: CreateCashFlowDto = {
        ...mockCreateCashFlowDto,
        bankAccountId: null,
      };

      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.cashFlow.create.mockResolvedValue(mockCashFlow);

      await service.create(mockUser.id, dtoWithNullBankAccount);

      expect(prismaService.cashFlow.create).toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('should return all cash flow transactions for company', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.cashFlow.findMany.mockResolvedValue([mockCashFlow]);

      const result = await service.findAll(mockUser.id);

      expect(prismaService.cashFlow.findMany).toHaveBeenCalledWith({
        where: {
          companyId: 'company-1',
          deletedAt: null,
        },
        orderBy: {
          date: 'desc',
        },
      });
      expect(result).toHaveLength(1);
    });
  });

  describe('findOne', () => {
    it('should return cash flow transaction by ID', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.cashFlow.findFirst.mockResolvedValue(mockCashFlow);

      const result = await service.findOne(mockUser.id, 'cashflow-1');

      expect(result).toBeDefined();
      expect(result.id).toBe('cashflow-1');
    });

    it('should throw NotFoundException if transaction not found', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.cashFlow.findFirst.mockResolvedValue(null);

      await expect(service.findOne(mockUser.id, 'cashflow-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('should update cash flow transaction successfully', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.cashFlow.findFirst.mockResolvedValue(mockCashFlow);
      prismaService.cashFlow.update.mockResolvedValue({
        ...mockCashFlow,
        description: 'Updated description',
      });

      const updateDto: UpdateCashFlowDto = {
        description: 'Updated description',
      };

      const result = await service.update(mockUser.id, 'cashflow-1', updateDto);

      expect(prismaService.cashFlow.update).toHaveBeenCalled();
      expect(result.description).toBe('Updated description');
    });

    it('should update with all optional fields', async () => {
      const mockBankAccount = {
        id: 'bank-account-1',
        companyId: 'company-1',
        deletedAt: null,
      };
      const mockEmployee = {
        id: 'employee-1',
        companyId: 'company-1',
        deletedAt: null,
      };
      const mockServiceProvider = {
        id: 'service-provider-1',
        companyId: 'company-1',
        deletedAt: null,
      };
      const mockSupplier = {
        id: 'supplier-1',
        companyId: 'company-1',
        deletedAt: null,
      };
      const mockBuyer = {
        id: 'buyer-1',
        companyId: 'company-1',
        deletedAt: null,
      };

      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.cashFlow.findFirst.mockResolvedValue(mockCashFlow);
      prismaService.bankAccount.findFirst.mockResolvedValue(mockBankAccount);
      prismaService.property.findFirst.mockResolvedValue(mockProperty);
      prismaService.employee.findFirst.mockResolvedValue(mockEmployee);
      prismaService.serviceProvider.findFirst.mockResolvedValue(
        mockServiceProvider,
      );
      prismaService.supplier.findFirst.mockResolvedValue(mockSupplier);
      prismaService.buyer.findFirst.mockResolvedValue(mockBuyer);
      prismaService.cashFlow.update.mockResolvedValue(mockCashFlow);

      const updateDto: UpdateCashFlowDto = {
        type: 'income',
        amount: 2000.0,
        date: '2025-01-20',
        description: 'Updated',
        category: 'sales',
        paymentMethod: 'card',
        status: 'pending',
        propertyId: 'property-1',
        employeeId: 'employee-1',
        serviceProviderId: 'service-provider-1',
        supplierId: 'supplier-1',
        buyerId: 'buyer-1',
        paymentDate: '2025-01-21',
        referenceNumber: 'REF123',
        bankAccountId: 'bank-account-1',
        observation: 'Updated observation',
      };

      await service.update(mockUser.id, 'cashflow-1', updateDto);

      expect(prismaService.cashFlow.update).toHaveBeenCalled();
    });

    it('should update with null values for optional fields', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.cashFlow.findFirst.mockResolvedValue(mockCashFlow);
      prismaService.cashFlow.update.mockResolvedValue(mockCashFlow);

      const updateDto: UpdateCashFlowDto = {
        description: null,
        category: null,
        paymentMethod: null,
        propertyId: null,
        employeeId: null,
        serviceProviderId: null,
        supplierId: null,
        buyerId: null,
        paymentDate: null,
        referenceNumber: null,
        bankAccountId: null,
        observation: null,
      };

      await service.update(mockUser.id, 'cashflow-1', updateDto);

      expect(prismaService.cashFlow.update).toHaveBeenCalled();
    });

    it('should validate property on update if provided', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.cashFlow.findFirst.mockResolvedValue(mockCashFlow);
      prismaService.property.findFirst.mockResolvedValue(mockProperty);
      prismaService.cashFlow.update.mockResolvedValue(mockCashFlow);

      const updateDto: UpdateCashFlowDto = {
        propertyId: 'property-1',
      };

      await service.update(mockUser.id, 'cashflow-1', updateDto);

      expect(prismaService.property.findFirst).toHaveBeenCalled();
    });

    it('should throw NotFoundException if property not found on update', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.cashFlow.findFirst.mockResolvedValue(mockCashFlow);
      prismaService.property.findFirst.mockResolvedValue(null);

      const updateDto: UpdateCashFlowDto = {
        propertyId: 'property-1',
      };

      await expect(
        service.update(mockUser.id, 'cashflow-1', updateDto),
      ).rejects.toThrow(NotFoundException);
    });

    it('should validate bank account on update if provided', async () => {
      const mockBankAccount = {
        id: 'bank-account-1',
        companyId: 'company-1',
        deletedAt: null,
      };

      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.cashFlow.findFirst.mockResolvedValue(mockCashFlow);
      prismaService.bankAccount.findFirst.mockResolvedValue(mockBankAccount);
      prismaService.cashFlow.update.mockResolvedValue(mockCashFlow);

      const updateDto: UpdateCashFlowDto = {
        bankAccountId: 'bank-account-1',
      };

      await service.update(mockUser.id, 'cashflow-1', updateDto);

      expect(prismaService.bankAccount.findFirst).toHaveBeenCalled();
    });

    it('should throw NotFoundException if bank account not found on update', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.cashFlow.findFirst.mockResolvedValue(mockCashFlow);
      prismaService.bankAccount.findFirst.mockResolvedValue(null);

      const updateDto: UpdateCashFlowDto = {
        bankAccountId: 'bank-account-1',
      };

      await expect(
        service.update(mockUser.id, 'cashflow-1', updateDto),
      ).rejects.toThrow(NotFoundException);
    });

    it('should update with bankAccountId set to null', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.cashFlow.findFirst.mockResolvedValue(mockCashFlow);
      prismaService.cashFlow.update.mockResolvedValue(mockCashFlow);

      const updateDto: UpdateCashFlowDto = {
        bankAccountId: null,
      };

      await service.update(mockUser.id, 'cashflow-1', updateDto);

      expect(prismaService.cashFlow.update).toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('should soft delete cash flow transaction', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.cashFlow.findFirst.mockResolvedValue(mockCashFlow);
      prismaService.cashFlow.update.mockResolvedValue({
        ...mockCashFlow,
        deletedAt: new Date(),
      });

      await service.remove(mockUser.id, 'cashflow-1');

      expect(prismaService.cashFlow.update).toHaveBeenCalledWith({
        where: { id: 'cashflow-1' },
        data: { deletedAt: expect.any(Date) },
      });
    });
  });

  describe('transform methods', () => {
    it('should transform cash flow with number amount (not Decimal)', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      const cashFlowWithNumber = {
        ...mockCashFlow,
        amount: 1000.0,
      };
      prismaService.cashFlow.findFirst.mockResolvedValue(cashFlowWithNumber);

      const result = await service.findOne(mockUser.id, 'cashflow-1');

      expect(result.amount).toBe(1000.0);
    });

    it('should transform cash flow with null values', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      const cashFlowWithNulls = {
        ...mockCashFlow,
        description: null,
        category: null,
        paymentMethod: null,
        bankAccountId: null,
        propertyId: null,
        employeeId: null,
        serviceProviderId: null,
        supplierId: null,
        buyerId: null,
        paymentDate: null,
        referenceNumber: null,
        observation: null,
      };
      prismaService.cashFlow.findFirst.mockResolvedValue(cashFlowWithNulls);

      const result = await service.findOne(mockUser.id, 'cashflow-1');

      expect(result.description).toBeNull();
      expect(result.category).toBeNull();
      expect(result.paymentMethod).toBeNull();
      expect(result.bankAccountId).toBeNull();
    });
  });
});
