import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { BankAccountsService } from './bank-accounts.service';
import { PrismaService } from '../common/services/prisma.service';
import { CreateBankAccountDto, UpdateBankAccountDto } from './dto';

describe('BankAccountsService', () => {
  let service: BankAccountsService;
  let prismaService: jest.Mocked<PrismaService>;

  const mockUser = {
    id: 'user-1',
    companyId: 'company-1',
  };

  const mockBankAccount = {
    id: 'bank-1',
    companyId: 'company-1',
    bankName: 'Test Bank',
    bankCode: '001',
    branch: '0001',
    accountNumber: '12345-6',
    accountType: 'checking',
    accountHolderName: 'Test Company',
    status: 'active',
    deletedAt: null,
    createdAt: new Date('2025-01-15'),
    updatedAt: new Date('2025-01-15'),
  };

  const mockCreateBankAccountDto: CreateBankAccountDto = {
    bankName: 'Test Bank',
    bankCode: '001',
    branch: '0001',
    accountNumber: '12345-6',
    accountType: 'checking',
    accountHolderName: 'Test Company',
    status: 'active',
  };

  beforeEach(async () => {
    const mockPrismaService = {
      user: {
        findUnique: jest.fn(),
      },
      bankAccount: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BankAccountsService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<BankAccountsService>(BankAccountsService);
    prismaService = module.get(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a bank account successfully', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.bankAccount.findFirst.mockResolvedValue(null); // No existing account
      prismaService.bankAccount.create.mockResolvedValue(mockBankAccount);

      const result = await service.create(
        mockUser.id,
        mockCreateBankAccountDto,
      );

      expect(prismaService.bankAccount.create).toHaveBeenCalled();
      expect(result).toBeDefined();
      expect(result.id).toBe('bank-1');
    });

    it('should throw ConflictException if account already exists', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.bankAccount.findFirst.mockResolvedValue(mockBankAccount); // Existing account

      await expect(
        service.create(mockUser.id, mockCreateBankAccountDto),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('findAll', () => {
    it('should return all bank accounts for company', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.bankAccount.findMany.mockResolvedValue([mockBankAccount]);

      const result = await service.findAll(mockUser.id);

      expect(prismaService.bankAccount.findMany).toHaveBeenCalledWith({
        where: {
          companyId: 'company-1',
          deletedAt: null,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });
      expect(result).toHaveLength(1);
    });
  });

  describe('findOne', () => {
    it('should return bank account by ID', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.bankAccount.findFirst.mockResolvedValue(mockBankAccount);

      const result = await service.findOne(mockUser.id, 'bank-1');

      expect(result).toBeDefined();
      expect(result.id).toBe('bank-1');
    });

    it('should throw NotFoundException if account not found', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.bankAccount.findFirst.mockResolvedValue(null);

      await expect(service.findOne(mockUser.id, 'bank-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('should update bank account successfully', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.bankAccount.findFirst.mockResolvedValue(mockBankAccount);
      prismaService.bankAccount.update.mockResolvedValue({
        ...mockBankAccount,
        accountHolderName: 'Updated Name',
      });

      const updateDto: UpdateBankAccountDto = {
        accountHolderName: 'Updated Name',
      };

      const result = await service.update(mockUser.id, 'bank-1', updateDto);

      expect(prismaService.bankAccount.update).toHaveBeenCalled();
      expect(result.accountHolderName).toBe('Updated Name');
    });

    it('should throw ConflictException if account details conflict', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.bankAccount.findFirst
        .mockResolvedValueOnce(mockBankAccount) // Existing account
        .mockResolvedValueOnce({
          ...mockBankAccount,
          id: 'bank-2',
        }); // Conflict account

      const updateDto: UpdateBankAccountDto = {
        bankCode: '001',
        branch: '0001',
        accountNumber: '12345-6',
      };

      await expect(
        service.update(mockUser.id, 'bank-1', updateDto),
      ).rejects.toThrow(ConflictException);
    });

    it('should update with all optional fields', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.bankAccount.findFirst.mockResolvedValue(mockBankAccount);
      prismaService.bankAccount.update.mockResolvedValue(mockBankAccount);

      const updateDto: UpdateBankAccountDto = {
        bankName: 'Updated Bank',
        bankCode: '002',
        branch: '0002',
        accountNumber: '65432-1',
        accountType: 'savings',
        accountHolderName: 'Updated Name',
        status: 'inactive',
      };

      await service.update(mockUser.id, 'bank-1', updateDto);

      expect(prismaService.bankAccount.update).toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('should soft delete bank account', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.bankAccount.findFirst.mockResolvedValue(mockBankAccount);
      prismaService.bankAccount.update.mockResolvedValue({
        ...mockBankAccount,
        deletedAt: new Date(),
      });

      await service.remove(mockUser.id, 'bank-1');

      expect(prismaService.bankAccount.update).toHaveBeenCalledWith({
        where: { id: 'bank-1' },
        data: { deletedAt: expect.any(Date) },
      });
    });
  });
});
