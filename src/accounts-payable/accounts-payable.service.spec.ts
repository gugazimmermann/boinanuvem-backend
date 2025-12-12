import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { AccountsPayableService } from './accounts-payable.service';
import { PrismaService } from '../common/services/prisma.service';
import {
  CreateAccountsPayableDto,
  UpdateAccountsPayableDto,
  AccountsPayableStatus,
} from './dto';

describe('AccountsPayableService', () => {
  let service: AccountsPayableService;
  let prismaService: jest.Mocked<PrismaService>;

  const mockUser = {
    id: 'user-1',
    companyId: 'company-1',
  };

  const mockAccountsPayable = {
    id: 'ap-1',
    companyId: 'company-1',
    amount: { toNumber: () => 1000.0 },
    dueDate: new Date('2025-02-15'),
    description: 'Test payable',
    category: 'feed',
    paymentMethod: 'cash',
    status: AccountsPayableStatus.UNPAID,
    deletedAt: null,
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
    const mockPrismaService = {
      user: {
        findUnique: jest.fn(),
      },
      property: {
        findFirst: jest.fn(),
      },
      supplier: {
        findFirst: jest.fn(),
      },
      employee: {
        findFirst: jest.fn(),
      },
      serviceProvider: {
        findFirst: jest.fn(),
      },
      accountsPayable: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AccountsPayableService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<AccountsPayableService>(AccountsPayableService);
    prismaService = module.get(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create an accounts payable transaction successfully', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.accountsPayable.create.mockResolvedValue(
        mockAccountsPayable,
      );

      const result = await service.create(
        mockUser.id,
        mockCreateAccountsPayableDto,
      );

      expect(prismaService.accountsPayable.create).toHaveBeenCalled();
      expect(result).toBeDefined();
      expect(result.id).toBe('ap-1');
    });

    it('should create with all optional fields', async () => {
      const mockProperty = { id: 'property-1', companyId: 'company-1' };
      const mockSupplier = { id: 'supplier-1', companyId: 'company-1' };
      const mockEmployee = { id: 'employee-1', companyId: 'company-1' };
      const mockServiceProvider = {
        id: 'sp-1',
        companyId: 'company-1',
      };

      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.property.findFirst.mockResolvedValue(mockProperty);
      prismaService.supplier.findFirst.mockResolvedValue(mockSupplier);
      prismaService.employee.findFirst.mockResolvedValue(mockEmployee);
      prismaService.serviceProvider.findFirst.mockResolvedValue(
        mockServiceProvider,
      );
      prismaService.accountsPayable.create.mockResolvedValue(
        mockAccountsPayable,
      );

      const dtoWithAllFields: CreateAccountsPayableDto = {
        ...mockCreateAccountsPayableDto,
        propertyId: 'property-1',
        supplierId: 'supplier-1',
        employeeId: 'employee-1',
        serviceProviderId: 'sp-1',
        paidDate: '2025-01-20',
        paidAmount: 1000.0,
        referenceNumber: 'REF123',
        observation: 'Test observation',
      };

      await service.create(mockUser.id, dtoWithAllFields);

      expect(prismaService.accountsPayable.create).toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('should return all accounts payable transactions for company', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.accountsPayable.findMany.mockResolvedValue([
        mockAccountsPayable,
      ]);

      const result = await service.findAll(mockUser.id);

      expect(prismaService.accountsPayable.findMany).toHaveBeenCalledWith({
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
    it('should return accounts payable transaction by ID', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.accountsPayable.findFirst.mockResolvedValue(
        mockAccountsPayable,
      );

      const result = await service.findOne(mockUser.id, 'ap-1');

      expect(result).toBeDefined();
      expect(result.id).toBe('ap-1');
    });

    it('should throw NotFoundException if transaction not found', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.accountsPayable.findFirst.mockResolvedValue(null);

      await expect(service.findOne(mockUser.id, 'ap-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('should update accounts payable transaction successfully', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.accountsPayable.findFirst.mockResolvedValue(
        mockAccountsPayable,
      );
      prismaService.accountsPayable.update.mockResolvedValue({
        ...mockAccountsPayable,
        status: AccountsPayableStatus.PAID,
      });

      const updateDto: UpdateAccountsPayableDto = {
        status: AccountsPayableStatus.PAID,
        paidDate: '2025-01-20',
        paidAmount: 1000.0,
      };

      const result = await service.update(mockUser.id, 'ap-1', updateDto);

      expect(prismaService.accountsPayable.update).toHaveBeenCalled();
      expect(result.status).toBe(AccountsPayableStatus.PAID);
    });

    it('should update with all optional fields', async () => {
      const mockProperty = { id: 'property-1', companyId: 'company-1' };
      const mockSupplier = { id: 'supplier-1', companyId: 'company-1' };
      const mockEmployee = { id: 'employee-1', companyId: 'company-1' };
      const mockServiceProvider = {
        id: 'sp-1',
        companyId: 'company-1',
      };

      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.accountsPayable.findFirst.mockResolvedValue(
        mockAccountsPayable,
      );
      prismaService.property.findFirst.mockResolvedValue(mockProperty);
      prismaService.supplier.findFirst.mockResolvedValue(mockSupplier);
      prismaService.employee.findFirst.mockResolvedValue(mockEmployee);
      prismaService.serviceProvider.findFirst.mockResolvedValue(
        mockServiceProvider,
      );
      prismaService.accountsPayable.update.mockResolvedValue(
        mockAccountsPayable,
      );

      const updateDto: UpdateAccountsPayableDto = {
        amount: 2000.0,
        dueDate: '2025-03-15',
        description: 'Updated',
        category: 'supplies',
        paymentMethod: 'card',
        status: AccountsPayableStatus.PAID,
        propertyId: 'property-1',
        supplierId: 'supplier-1',
        employeeId: 'employee-1',
        serviceProviderId: 'sp-1',
        paidDate: '2025-01-20',
        paidAmount: 2000.0,
        referenceNumber: 'REF456',
        observation: 'Updated observation',
      };

      await service.update(mockUser.id, 'ap-1', updateDto);

      expect(prismaService.accountsPayable.update).toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('should soft delete accounts payable transaction', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.accountsPayable.findFirst.mockResolvedValue(
        mockAccountsPayable,
      );
      prismaService.accountsPayable.update.mockResolvedValue({
        ...mockAccountsPayable,
        deletedAt: new Date(),
      });

      await service.remove(mockUser.id, 'ap-1');

      expect(prismaService.accountsPayable.update).toHaveBeenCalledWith({
        where: { id: 'ap-1' },
        data: { deletedAt: expect.any(Date) },
      });
    });
  });

  describe('transform methods', () => {
    it('should transform with number amount (not Decimal)', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      const apWithNumber = {
        ...mockAccountsPayable,
        amount: 1000.0,
      };
      prismaService.accountsPayable.findFirst.mockResolvedValue(apWithNumber);

      const result = await service.findOne(mockUser.id, 'ap-1');

      expect(result.amount).toBe(1000.0);
    });
  });
});
