import { Test, TestingModule } from '@nestjs/testing';
import { ThrottlerModule } from '@nestjs/throttler';
import { NotFoundException } from '@nestjs/common';
import { AccountsReceivableController } from './accounts-receivable.controller';
import { AccountsReceivableService } from './accounts-receivable.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import {
  CreateAccountsReceivableDto,
  UpdateAccountsReceivableDto,
  AccountsReceivableStatus,
  AccountsReceivableResponseDto,
} from './dto';
import type { CurrentUser } from '../auth/decorators/current-user.decorator';

describe('AccountsReceivableController', () => {
  let controller: AccountsReceivableController;
  let accountsReceivableService: jest.Mocked<AccountsReceivableService>;

  const mockCurrentUser: CurrentUser = {
    id: 'user-1',
    email: 'test@example.com',
    name: 'Test User',
    companyId: 'company-1',
    mainUser: false,
    permissions: {},
    company: {},
  };

  const mockAccountsReceivable: AccountsReceivableResponseDto = {
    id: 'ar-1',
    companyId: 'company-1',
    amount: 5000.0,
    dueDate: new Date('2025-02-15'),
    description: 'Test receivable',
    category: 'cattle_sales',
    paymentMethod: 'bank_transfer',
    status: AccountsReceivableStatus.UNPAID as string,
    propertyId: 'property-1',
    buyerId: 'buyer-1',
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
    const mockAccountsReceivableService = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      imports: [ThrottlerModule.forRoot()],
      controllers: [AccountsReceivableController],
      providers: [
        {
          provide: AccountsReceivableService,
          useValue: mockAccountsReceivableService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(PermissionsGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<AccountsReceivableController>(
      AccountsReceivableController,
    );
    accountsReceivableService = module.get(AccountsReceivableService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create an accounts receivable transaction successfully', async () => {
      accountsReceivableService.create.mockResolvedValue(
        mockAccountsReceivable as any,
      );

      const result = await controller.create(
        mockCurrentUser,
        mockCreateAccountsReceivableDto,
      );

      expect(accountsReceivableService.create).toHaveBeenCalledWith(
        mockCurrentUser.id,
        mockCreateAccountsReceivableDto,
      );
      expect(result).toEqual(mockAccountsReceivable);
    });
  });

  describe('findAll', () => {
    it('should return all accounts receivable transactions successfully', async () => {
      accountsReceivableService.findAll.mockResolvedValue([
        mockAccountsReceivable,
      ] as any);

      const result = await controller.findAll(mockCurrentUser);

      expect(accountsReceivableService.findAll).toHaveBeenCalledWith(
        mockCurrentUser.id,
      );
      expect(result).toEqual([mockAccountsReceivable]);
    });
  });

  describe('findOne', () => {
    it('should return an accounts receivable transaction by id successfully', async () => {
      accountsReceivableService.findOne.mockResolvedValue(
        mockAccountsReceivable as any,
      );

      const result = await controller.findOne(mockCurrentUser, 'ar-1');

      expect(accountsReceivableService.findOne).toHaveBeenCalledWith(
        mockCurrentUser.id,
        'ar-1',
      );
      expect(result).toEqual(mockAccountsReceivable);
    });

    it('should handle NotFoundException when transaction not found', async () => {
      const error = new NotFoundException(
        'Accounts receivable transaction not found',
      );
      accountsReceivableService.findOne.mockRejectedValue(error);

      await expect(
        controller.findOne(mockCurrentUser, 'non-existent-id'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    const updateDto: UpdateAccountsReceivableDto = {
      status: AccountsReceivableStatus.PAID,
      paidDate: '2025-01-20',
      paidAmount: 5000.0,
    };

    it('should update an accounts receivable transaction successfully', async () => {
      const updated = {
        ...mockAccountsReceivable,
        ...updateDto,
        status: updateDto.status as string,
        dueDate: mockAccountsReceivable.dueDate, // Ensure dueDate is Date, not string
      } as AccountsReceivableResponseDto;
      accountsReceivableService.update.mockResolvedValue(updated as any);

      const result = await controller.update(
        mockCurrentUser,
        'ar-1',
        updateDto,
      );

      expect(accountsReceivableService.update).toHaveBeenCalledWith(
        mockCurrentUser.id,
        'ar-1',
        updateDto,
      );
      expect(result).toEqual(updated);
    });
  });

  describe('remove', () => {
    it('should soft delete an accounts receivable transaction successfully', async () => {
      accountsReceivableService.remove.mockResolvedValue(undefined);

      await controller.remove(mockCurrentUser, 'ar-1');

      expect(accountsReceivableService.remove).toHaveBeenCalledWith(
        mockCurrentUser.id,
        'ar-1',
      );
    });
  });
});
