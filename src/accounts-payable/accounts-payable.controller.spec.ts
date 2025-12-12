import { Test, TestingModule } from '@nestjs/testing';
import { ThrottlerModule } from '@nestjs/throttler';
import { NotFoundException } from '@nestjs/common';
import { AccountsPayableController } from './accounts-payable.controller';
import { AccountsPayableService } from './accounts-payable.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import {
  CreateAccountsPayableDto,
  UpdateAccountsPayableDto,
  AccountsPayableStatus,
  AccountsPayableResponseDto,
} from './dto';
import type { CurrentUser } from '../auth/decorators/current-user.decorator';

describe('AccountsPayableController', () => {
  let controller: AccountsPayableController;
  let accountsPayableService: jest.Mocked<AccountsPayableService>;

  const mockCurrentUser: CurrentUser = {
    id: 'user-1',
    email: 'test@example.com',
    name: 'Test User',
    companyId: 'company-1',
    mainUser: false,
    permissions: {},
    company: {},
  };

  const mockAccountsPayable: AccountsPayableResponseDto = {
    id: 'ap-1',
    companyId: 'company-1',
    amount: 1000.0,
    dueDate: new Date('2025-02-15'),
    description: 'Test payable',
    category: 'feed',
    paymentMethod: 'cash',
    status: AccountsPayableStatus.UNPAID as string,
    propertyId: 'property-1',
    createdAt: new Date('2025-01-15'),
    updatedAt: new Date('2025-01-15'),
  };

  const mockCreateAccountsPayableDto: CreateAccountsPayableDto = {
    amount: 1000.0,
    dueDate: '2025-02-15',
    description: 'Test payable',
    category: 'feed',
    paymentMethod: 'cash',
    status: AccountsPayableStatus.UNPAID,
  };

  beforeEach(async () => {
    const mockAccountsPayableService = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      imports: [ThrottlerModule.forRoot()],
      controllers: [AccountsPayableController],
      providers: [
        {
          provide: AccountsPayableService,
          useValue: mockAccountsPayableService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(PermissionsGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<AccountsPayableController>(
      AccountsPayableController,
    );
    accountsPayableService = module.get(AccountsPayableService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create an accounts payable transaction successfully', async () => {
      accountsPayableService.create.mockResolvedValue(
        mockAccountsPayable as any,
      );

      const result = await controller.create(
        mockCurrentUser,
        mockCreateAccountsPayableDto,
      );

      expect(accountsPayableService.create).toHaveBeenCalledWith(
        mockCurrentUser.id,
        mockCreateAccountsPayableDto,
      );
      expect(result).toEqual(mockAccountsPayable);
    });

    it('should handle NotFoundException when property not found', async () => {
      const error = new NotFoundException(
        'Property not found or does not belong to your company',
      );
      accountsPayableService.create.mockRejectedValue(error);

      await expect(
        controller.create(mockCurrentUser, mockCreateAccountsPayableDto),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('findAll', () => {
    it('should return all accounts payable transactions successfully', async () => {
      accountsPayableService.findAll.mockResolvedValue([
        mockAccountsPayable,
      ] as any);

      const result = await controller.findAll(mockCurrentUser);

      expect(accountsPayableService.findAll).toHaveBeenCalledWith(
        mockCurrentUser.id,
      );
      expect(result).toEqual([mockAccountsPayable]);
    });
  });

  describe('findOne', () => {
    it('should return an accounts payable transaction by id successfully', async () => {
      accountsPayableService.findOne.mockResolvedValue(
        mockAccountsPayable as any,
      );

      const result = await controller.findOne(mockCurrentUser, 'ap-1');

      expect(accountsPayableService.findOne).toHaveBeenCalledWith(
        mockCurrentUser.id,
        'ap-1',
      );
      expect(result).toEqual(mockAccountsPayable);
    });

    it('should handle NotFoundException when transaction not found', async () => {
      const error = new NotFoundException(
        'Accounts payable transaction not found',
      );
      accountsPayableService.findOne.mockRejectedValue(error);

      await expect(
        controller.findOne(mockCurrentUser, 'non-existent-id'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    const updateDto: UpdateAccountsPayableDto = {
      status: AccountsPayableStatus.PAID,
      paidDate: '2025-01-20',
      paidAmount: 1000.0,
    };

    it('should update an accounts payable transaction successfully', async () => {
      const updated = {
        ...mockAccountsPayable,
        ...updateDto,
        status: updateDto.status as string,
        dueDate: mockAccountsPayable.dueDate, // Ensure dueDate is Date, not string
      } as AccountsPayableResponseDto;
      accountsPayableService.update.mockResolvedValue(updated as any);

      const result = await controller.update(
        mockCurrentUser,
        'ap-1',
        updateDto,
      );

      expect(accountsPayableService.update).toHaveBeenCalledWith(
        mockCurrentUser.id,
        'ap-1',
        updateDto,
      );
      expect(result).toEqual(updated);
    });
  });

  describe('remove', () => {
    it('should soft delete an accounts payable transaction successfully', async () => {
      accountsPayableService.remove.mockResolvedValue(undefined);

      await controller.remove(mockCurrentUser, 'ap-1');

      expect(accountsPayableService.remove).toHaveBeenCalledWith(
        mockCurrentUser.id,
        'ap-1',
      );
    });
  });
});
