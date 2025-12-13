import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { AccountsReceivableService } from './accounts-receivable.service';
import { PrismaService } from '../common/services/prisma.service';
import {
  CreateAccountsReceivableDto,
  UpdateAccountsReceivableDto,
  AccountsReceivableStatus,
} from './dto';

describe('AccountsReceivableService', () => {
  let service: AccountsReceivableService;
  let prismaService: jest.Mocked<PrismaService>;

  const mockUser = {
    id: 'user-1',
    companyId: 'company-1',
  };

  const mockAccountsReceivable = {
    id: 'ar-1',
    companyId: 'company-1',
    amount: { toNumber: () => 5000.0 },
    dueDate: new Date('2025-02-15'),
    description: 'Test receivable',
    category: 'cattle_sales',
    paymentMethod: 'bank_transfer',
    status: AccountsReceivableStatus.UNPAID,
    bankAccountId: null,
    deletedAt: null,
    createdAt: new Date('2025-01-15'),
    updatedAt: new Date('2025-01-15'),
  };

  const mockCreateAccountsReceivableDto: CreateAccountsReceivableDto = {
    amount: 5000.0,
    dueDate: '2025-02-15',
    description: 'Test receivable',
    category: 'cattle_sales',
    paymentMethod: 'bank_transfer',
    status: AccountsReceivableStatus.UNPAID,
  };

  beforeEach(async () => {
    const mockPrismaService = {
      user: {
        findUnique: jest.fn(),
      },
      property: {
        findFirst: jest.fn(),
      },
      buyer: {
        findFirst: jest.fn(),
      },
      bankAccount: {
        findFirst: jest.fn(),
      },
      accountsReceivable: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AccountsReceivableService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<AccountsReceivableService>(AccountsReceivableService);
    prismaService = module.get(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create an accounts receivable transaction successfully', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.accountsReceivable.create.mockResolvedValue(
        mockAccountsReceivable,
      );

      const result = await service.create(
        mockUser.id,
        mockCreateAccountsReceivableDto,
      );

      expect(prismaService.accountsReceivable.create).toHaveBeenCalled();
      expect(result).toBeDefined();
      expect(result.id).toBe('ar-1');
    });

    it('should create with all optional fields', async () => {
      const mockProperty = { id: 'property-1', companyId: 'company-1' };
      const mockBuyer = { id: 'buyer-1', companyId: 'company-1' };
      const mockBankAccount = {
        id: 'bank-account-1',
        companyId: 'company-1',
        deletedAt: null,
      };

      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.property.findFirst.mockResolvedValue(mockProperty);
      prismaService.buyer.findFirst.mockResolvedValue(mockBuyer);
      prismaService.bankAccount.findFirst.mockResolvedValue(mockBankAccount);
      prismaService.accountsReceivable.create.mockResolvedValue(
        mockAccountsReceivable,
      );

      const dtoWithAllFields: CreateAccountsReceivableDto = {
        ...mockCreateAccountsReceivableDto,
        propertyId: 'property-1',
        buyerId: 'buyer-1',
        bankAccountId: 'bank-account-1',
        paidDate: '2025-01-20',
        paidAmount: 5000.0,
        referenceNumber: 'REF123',
        observation: 'Test observation',
      };

      await service.create(mockUser.id, dtoWithAllFields);

      expect(prismaService.accountsReceivable.create).toHaveBeenCalled();
    });

    it('should validate bank account if provided', async () => {
      const mockBankAccount = {
        id: 'bank-account-1',
        companyId: 'company-1',
        deletedAt: null,
      };

      const dtoWithBankAccount = {
        ...mockCreateAccountsReceivableDto,
        bankAccountId: 'bank-account-1',
      };

      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.bankAccount.findFirst.mockResolvedValue(mockBankAccount);
      prismaService.accountsReceivable.create.mockResolvedValue(
        mockAccountsReceivable,
      );

      await service.create(mockUser.id, dtoWithBankAccount);

      expect(prismaService.bankAccount.findFirst).toHaveBeenCalled();
    });

    it('should throw NotFoundException if bank account not found', async () => {
      const dtoWithBankAccount = {
        ...mockCreateAccountsReceivableDto,
        bankAccountId: 'bank-account-1',
      };

      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.bankAccount.findFirst.mockResolvedValue(null);

      await expect(
        service.create(mockUser.id, dtoWithBankAccount),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('findAll', () => {
    it('should return all accounts receivable transactions for company', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.accountsReceivable.findMany.mockResolvedValue([
        mockAccountsReceivable,
      ]);

      const result = await service.findAll(mockUser.id);

      expect(prismaService.accountsReceivable.findMany).toHaveBeenCalledWith({
        where: {
          companyId: 'company-1',
          deletedAt: null,
        },
        orderBy: {
          dueDate: 'asc',
        },
      });
      expect(result).toHaveLength(1);
    });
  });

  describe('findOne', () => {
    it('should return accounts receivable transaction by ID', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.accountsReceivable.findFirst.mockResolvedValue(
        mockAccountsReceivable,
      );

      const result = await service.findOne(mockUser.id, 'ar-1');

      expect(result).toBeDefined();
      expect(result.id).toBe('ar-1');
    });

    it('should throw NotFoundException if transaction not found', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.accountsReceivable.findFirst.mockResolvedValue(null);

      await expect(service.findOne(mockUser.id, 'ar-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('should update accounts receivable transaction successfully', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.accountsReceivable.findFirst.mockResolvedValue(
        mockAccountsReceivable,
      );
      prismaService.accountsReceivable.update.mockResolvedValue({
        ...mockAccountsReceivable,
        status: AccountsReceivableStatus.PAID,
      });

      const updateDto: UpdateAccountsReceivableDto = {
        status: AccountsReceivableStatus.PAID,
        paidDate: '2025-01-20',
        paidAmount: 5000.0,
      };

      const result = await service.update(mockUser.id, 'ar-1', updateDto);

      expect(prismaService.accountsReceivable.update).toHaveBeenCalled();
      expect(result.status).toBe(AccountsReceivableStatus.PAID);
    });

    it('should update with all optional fields', async () => {
      const mockProperty = { id: 'property-1', companyId: 'company-1' };
      const mockBuyer = { id: 'buyer-1', companyId: 'company-1' };
      const mockBankAccount = {
        id: 'bank-account-1',
        companyId: 'company-1',
        deletedAt: null,
      };

      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.accountsReceivable.findFirst.mockResolvedValue(
        mockAccountsReceivable,
      );
      prismaService.property.findFirst.mockResolvedValue(mockProperty);
      prismaService.buyer.findFirst.mockResolvedValue(mockBuyer);
      prismaService.bankAccount.findFirst.mockResolvedValue(mockBankAccount);
      prismaService.accountsReceivable.update.mockResolvedValue(
        mockAccountsReceivable,
      );

      const updateDto: UpdateAccountsReceivableDto = {
        amount: 6000.0,
        dueDate: '2025-03-15',
        description: 'Updated',
        category: 'other',
        paymentMethod: 'cash',
        status: AccountsReceivableStatus.PAID,
        propertyId: 'property-1',
        buyerId: 'buyer-1',
        bankAccountId: 'bank-account-1',
        paidDate: '2025-01-20',
        paidAmount: 6000.0,
        referenceNumber: 'REF456',
        observation: 'Updated observation',
      };

      await service.update(mockUser.id, 'ar-1', updateDto);

      expect(prismaService.accountsReceivable.update).toHaveBeenCalled();
    });

    it('should validate bank account on update if provided', async () => {
      const mockBankAccount = {
        id: 'bank-account-1',
        companyId: 'company-1',
        deletedAt: null,
      };

      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.accountsReceivable.findFirst.mockResolvedValue(
        mockAccountsReceivable,
      );
      prismaService.bankAccount.findFirst.mockResolvedValue(mockBankAccount);
      prismaService.accountsReceivable.update.mockResolvedValue(
        mockAccountsReceivable,
      );

      const updateDto: UpdateAccountsReceivableDto = {
        bankAccountId: 'bank-account-1',
      };

      await service.update(mockUser.id, 'ar-1', updateDto);

      expect(prismaService.bankAccount.findFirst).toHaveBeenCalled();
    });

    it('should throw NotFoundException if bank account not found on update', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.accountsReceivable.findFirst.mockResolvedValue(
        mockAccountsReceivable,
      );
      prismaService.bankAccount.findFirst.mockResolvedValue(null);

      const updateDto: UpdateAccountsReceivableDto = {
        bankAccountId: 'bank-account-1',
      };

      await expect(
        service.update(mockUser.id, 'ar-1', updateDto),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should soft delete accounts receivable transaction', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.accountsReceivable.findFirst.mockResolvedValue(
        mockAccountsReceivable,
      );
      prismaService.accountsReceivable.update.mockResolvedValue({
        ...mockAccountsReceivable,
        deletedAt: new Date(),
      });

      await service.remove(mockUser.id, 'ar-1');

      expect(prismaService.accountsReceivable.update).toHaveBeenCalledWith({
        where: { id: 'ar-1' },
        data: { deletedAt: expect.any(Date) },
      });
    });
  });

  describe('transform methods', () => {
    it('should transform with number amount (not Decimal)', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      const arWithNumber = {
        ...mockAccountsReceivable,
        amount: 5000.0,
      };
      prismaService.accountsReceivable.findFirst.mockResolvedValue(
        arWithNumber,
      );

      const result = await service.findOne(mockUser.id, 'ar-1');

      expect(result.amount).toBe(5000.0);
    });
  });
});
