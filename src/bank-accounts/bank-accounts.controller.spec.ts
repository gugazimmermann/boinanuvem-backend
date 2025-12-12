import { Test, TestingModule } from '@nestjs/testing';
import { ThrottlerModule } from '@nestjs/throttler';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { BankAccountsController } from './bank-accounts.controller';
import { BankAccountsService } from './bank-accounts.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { CreateBankAccountDto, UpdateBankAccountDto } from './dto';
import type { CurrentUser } from '../auth/decorators/current-user.decorator';

describe('BankAccountsController', () => {
  let controller: BankAccountsController;
  let bankAccountsService: jest.Mocked<BankAccountsService>;

  const mockCurrentUser: CurrentUser = {
    id: 'user-1',
    email: 'test@example.com',
    name: 'Test User',
    companyId: 'company-1',
    mainUser: false,
    permissions: {},
    company: {},
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
    const mockBankAccountsService = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      imports: [ThrottlerModule.forRoot()],
      controllers: [BankAccountsController],
      providers: [
        {
          provide: BankAccountsService,
          useValue: mockBankAccountsService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(PermissionsGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<BankAccountsController>(BankAccountsController);
    bankAccountsService = module.get(BankAccountsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create a bank account successfully', async () => {
      bankAccountsService.create.mockResolvedValue(mockBankAccount);

      const result = await controller.create(
        mockCurrentUser,
        mockCreateBankAccountDto,
      );

      expect(bankAccountsService.create).toHaveBeenCalledWith(
        mockCurrentUser.id,
        mockCreateBankAccountDto,
      );
      expect(result).toEqual(mockBankAccount);
    });

    it('should handle ConflictException when account already exists', async () => {
      const error = new ConflictException(
        'Bank account with these details already exists for your company',
      );
      bankAccountsService.create.mockRejectedValue(error);

      await expect(
        controller.create(mockCurrentUser, mockCreateBankAccountDto),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('findAll', () => {
    it('should return all bank accounts successfully', async () => {
      bankAccountsService.findAll.mockResolvedValue([mockBankAccount]);

      const result = await controller.findAll(mockCurrentUser);

      expect(bankAccountsService.findAll).toHaveBeenCalledWith(
        mockCurrentUser.id,
      );
      expect(result).toEqual([mockBankAccount]);
    });
  });

  describe('findOne', () => {
    it('should return a bank account by id successfully', async () => {
      bankAccountsService.findOne.mockResolvedValue(mockBankAccount);

      const result = await controller.findOne(mockCurrentUser, 'bank-1');

      expect(bankAccountsService.findOne).toHaveBeenCalledWith(
        mockCurrentUser.id,
        'bank-1',
      );
      expect(result).toEqual(mockBankAccount);
    });

    it('should handle NotFoundException when account not found', async () => {
      const error = new NotFoundException('Bank account not found');
      bankAccountsService.findOne.mockRejectedValue(error);

      await expect(
        controller.findOne(mockCurrentUser, 'non-existent-id'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    const updateDto: UpdateBankAccountDto = {
      accountHolderName: 'Updated Name',
    };

    it('should update a bank account successfully', async () => {
      const updated = { ...mockBankAccount, ...updateDto };
      bankAccountsService.update.mockResolvedValue(updated);

      const result = await controller.update(
        mockCurrentUser,
        'bank-1',
        updateDto,
      );

      expect(bankAccountsService.update).toHaveBeenCalledWith(
        mockCurrentUser.id,
        'bank-1',
        updateDto,
      );
      expect(result).toEqual(updated);
    });

    it('should handle ConflictException when account details conflict', async () => {
      const error = new ConflictException(
        'Bank account with these details already exists for your company',
      );
      bankAccountsService.update.mockRejectedValue(error);

      await expect(
        controller.update(mockCurrentUser, 'bank-1', { bankCode: '002' }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('remove', () => {
    it('should soft delete a bank account successfully', async () => {
      bankAccountsService.remove.mockResolvedValue(undefined);

      await controller.remove(mockCurrentUser, 'bank-1');

      expect(bankAccountsService.remove).toHaveBeenCalledWith(
        mockCurrentUser.id,
        'bank-1',
      );
    });
  });
});
