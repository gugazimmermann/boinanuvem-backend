import { CashFlowService } from './cash-flow.service';
import {
  CreateCashFlowDto,
  UpdateCashFlowDto,
  CashFlowType,
  CashFlowCategory,
  PaymentMethod,
} from './dto';
import {
  describeOrSkip,
  setupIntegrationTest,
  teardownIntegrationTest,
  createServiceTestingModule,
  getServiceFromModule,
  IntegrationTestContext,
} from '../../test/integration-test-helpers';

describeOrSkip('CashFlowService Integration Tests', () => {
  let service: CashFlowService;
  let context: IntegrationTestContext;
  let testEmployee: any;
  let testServiceProvider: any;
  let testSupplier: any;
  let testBuyer: any;
  let testBankAccount: any;

  beforeAll(async () => {
    context = await setupIntegrationTest({
      cnpj: '11.222.333/0001-06',
      companyName: 'Test Cash Flow Company',
      email: 'cashflow@testcompany.com',
      userEmail: 'user-cashflow@testcompany.com',
      createProperty: true,
      createEmployees: 1,
      createServiceProviders: 1,
      createSupplier: true,
      createBuyer: true,
    });
    testEmployee = context.testEmployees[0];
    testServiceProvider = context.testServiceProviders[0];
    testSupplier = context.testSupplier;
    testBuyer = context.testBuyer;

    // Create a test bank account
    testBankAccount = await context.prisma.bankAccount.create({
      data: {
        companyId: context.testCompany.id,
        bankName: 'Test Bank',
        bankCode: '001',
        branch: '0001',
        accountNumber: '12345-6',
        accountType: 'checking',
        status: 'active',
      },
    });
  });

  afterAll(async () => {
    await teardownIntegrationTest(context, {
      tables: [
        'cashFlow',
        'bankAccount',
        'buyer',
        'supplier',
        'serviceProvider',
        'employee',
      ],
    });
  });

  beforeEach(async () => {
    const module = await createServiceTestingModule(
      CashFlowService,
      context.prisma,
    );
    service = getServiceFromModule(module, CashFlowService);
  });

  afterEach(async () => {
    await context.prisma.cashFlow.deleteMany({
      where: {
        companyId: context.testCompany.id,
      },
    });
  });

  describe('create', () => {
    it('should create an expense transaction successfully', async () => {
      const createDto: CreateCashFlowDto = {
        type: CashFlowType.EXPENSE,
        amount: 1000.0,
        date: '2025-01-15',
        description: 'Test expense',
        category: CashFlowCategory.FEED,
        paymentMethod: PaymentMethod.CASH,
        status: 'completed',
      };

      const result = await service.create(context.testUser.id, createDto);

      expect(result).toBeDefined();
      expect(result.type).toBe(CashFlowType.EXPENSE);
      expect(result.amount).toBe(1000.0);
    });

    it('should create an income transaction successfully', async () => {
      const createDto: CreateCashFlowDto = {
        type: CashFlowType.INCOME,
        amount: 5000.0,
        date: '2025-01-16',
        description: 'Test income',
        category: CashFlowCategory.CATTLE_SALES,
        paymentMethod: PaymentMethod.BANK_TRANSFER,
        status: 'completed',
      };

      const result = await service.create(context.testUser.id, createDto);

      expect(result).toBeDefined();
      expect(result.type).toBe(CashFlowType.INCOME);
      expect(result.amount).toBe(5000.0);
    });

    it('should create transaction with related entities', async () => {
      const createDto: CreateCashFlowDto = {
        type: CashFlowType.EXPENSE,
        amount: 2000.0,
        date: '2025-01-17',
        description: 'Test expense with relations',
        category: CashFlowCategory.FEED,
        paymentMethod: PaymentMethod.CASH,
        propertyId: context.testProperty.id,
        employeeId: testEmployee.id,
        serviceProviderId: testServiceProvider.id,
        supplierId: testSupplier.id,
        buyerId: testBuyer.id,
      };

      const result = await service.create(context.testUser.id, createDto);

      expect(result).toBeDefined();
      expect(result.propertyId).toBe(context.testProperty.id);
      expect(result.employeeId).toBe(testEmployee.id);
    });

    it('should throw NotFoundException if property not found', async () => {
      const createDto: CreateCashFlowDto = {
        type: CashFlowType.EXPENSE,
        amount: 1000.0,
        date: '2025-01-15',
        propertyId: 'non-existent-id',
      };

      await expect(
        service.create(context.testUser.id, createDto),
      ).rejects.toThrow('not found');
    });

    it('should create transaction with bank account', async () => {
      const createDto: CreateCashFlowDto = {
        type: CashFlowType.EXPENSE,
        amount: 1000.0,
        date: '2025-01-15',
        description: 'Test expense with bank account',
        bankAccountId: testBankAccount.id,
      };

      const result = await service.create(context.testUser.id, createDto);

      expect(result).toBeDefined();
      expect(result.bankAccountId).toBe(testBankAccount.id);
    });

    it('should throw NotFoundException if bank account not found', async () => {
      const createDto: CreateCashFlowDto = {
        type: CashFlowType.EXPENSE,
        amount: 1000.0,
        date: '2025-01-15',
        bankAccountId: 'non-existent-bank-account-id',
      };

      await expect(
        service.create(context.testUser.id, createDto),
      ).rejects.toThrow('Bank account not found');
    });
  });

  describe('findAll', () => {
    it('should return all cash flow transactions for company', async () => {
      await service.create(context.testUser.id, {
        type: CashFlowType.EXPENSE,
        amount: 1000.0,
        date: '2025-01-15',
        description: 'Expense 1',
      });

      await service.create(context.testUser.id, {
        type: CashFlowType.INCOME,
        amount: 5000.0,
        date: '2025-01-16',
        description: 'Income 1',
      });

      const result = await service.findAll(context.testUser.id);

      expect(result.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('findOne', () => {
    it('should return cash flow transaction by ID', async () => {
      const created = await service.create(context.testUser.id, {
        type: CashFlowType.EXPENSE,
        amount: 1000.0,
        date: '2025-01-15',
        description: 'Test transaction',
      });

      const result = await service.findOne(context.testUser.id, created.id);

      expect(result).toBeDefined();
      expect(result.id).toBe(created.id);
    });

    it('should throw NotFoundException if transaction not found', async () => {
      await expect(
        service.findOne(context.testUser.id, 'non-existent-id'),
      ).rejects.toThrow('Cash flow transaction not found');
    });
  });

  describe('update', () => {
    it('should update cash flow transaction successfully', async () => {
      const created = await service.create(context.testUser.id, {
        type: CashFlowType.EXPENSE,
        amount: 1000.0,
        date: '2025-01-15',
        description: 'Original description',
      });

      const updateDto: UpdateCashFlowDto = {
        description: 'Updated description',
        amount: 1500.0,
      };

      const result = await service.update(
        context.testUser.id,
        created.id,
        updateDto,
      );

      expect(result.description).toBe('Updated description');
      expect(result.amount).toBe(1500.0);
    });

    it('should update transaction with bank account', async () => {
      const created = await service.create(context.testUser.id, {
        type: CashFlowType.EXPENSE,
        amount: 1000.0,
        date: '2025-01-15',
        description: 'Original transaction',
      });

      const updateDto: UpdateCashFlowDto = {
        bankAccountId: testBankAccount.id,
      };

      const result = await service.update(
        context.testUser.id,
        created.id,
        updateDto,
      );

      expect(result.bankAccountId).toBe(testBankAccount.id);
    });

    it('should throw NotFoundException if bank account not found on update', async () => {
      const created = await service.create(context.testUser.id, {
        type: CashFlowType.EXPENSE,
        amount: 1000.0,
        date: '2025-01-15',
        description: 'Original transaction',
      });

      const updateDto: UpdateCashFlowDto = {
        bankAccountId: 'non-existent-bank-account-id',
      };

      await expect(
        service.update(context.testUser.id, created.id, updateDto),
      ).rejects.toThrow('Bank account not found');
    });
  });

  describe('remove', () => {
    it('should soft delete cash flow transaction', async () => {
      const created = await service.create(context.testUser.id, {
        type: CashFlowType.EXPENSE,
        amount: 1000.0,
        date: '2025-01-15',
        description: 'Test transaction',
      });

      await service.remove(context.testUser.id, created.id);

      // Should not find the transaction after soft delete
      await expect(
        service.findOne(context.testUser.id, created.id),
      ).rejects.toThrow('Cash flow transaction not found');
    });
  });
});
