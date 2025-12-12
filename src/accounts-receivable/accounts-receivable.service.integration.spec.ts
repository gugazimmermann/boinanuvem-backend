import { AccountsReceivableService } from './accounts-receivable.service';
import {
  CreateAccountsReceivableDto,
  UpdateAccountsReceivableDto,
  AccountsReceivableStatus,
} from './dto';
import {
  describeOrSkip,
  setupIntegrationTest,
  teardownIntegrationTest,
  createServiceTestingModule,
  getServiceFromModule,
  IntegrationTestContext,
} from '../../test/integration-test-helpers';

describeOrSkip('AccountsReceivableService Integration Tests', () => {
  let service: AccountsReceivableService;
  let context: IntegrationTestContext;

  beforeAll(async () => {
    context = await setupIntegrationTest({
      cnpj: '11.222.333/0001-10',
      companyName: 'Test Accounts Receivable Company',
      email: 'ar@testcompany.com',
      userEmail: 'user-ar@testcompany.com',
      createProperty: true,
      createBuyer: true,
    });
  });

  afterAll(async () => {
    await teardownIntegrationTest(context, {
      tables: ['accountsReceivable', 'buyer'],
    });
  });

  beforeEach(async () => {
    const module = await createServiceTestingModule(
      AccountsReceivableService,
      context.prisma,
    );
    service = getServiceFromModule(module, AccountsReceivableService);
  });

  afterEach(async () => {
    await context.prisma.accountsReceivable.deleteMany({
      where: {
        companyId: context.testCompany.id,
      },
    });
  });

  describe('create', () => {
    it('should create an accounts receivable transaction successfully', async () => {
      const createDto: CreateAccountsReceivableDto = {
        amount: 5000.0,
        dueDate: '2025-02-15',
        description: 'Test receivable',
        category: 'cattle_sales',
        paymentMethod: 'bank_transfer',
        status: AccountsReceivableStatus.UNPAID,
      };

      const result = await service.create(context.testUser.id, createDto);

      expect(result).toBeDefined();
      expect(result.amount).toBe(5000.0);
      expect(result.status).toBe(AccountsReceivableStatus.UNPAID);
    });

    it('should create with related entities', async () => {
      const createDto: CreateAccountsReceivableDto = {
        amount: 10000.0,
        dueDate: '2025-02-20',
        description: 'Test receivable with relations',
        propertyId: context.testProperty.id,
        buyerId: context.testBuyer.id,
      };

      const result = await service.create(context.testUser.id, createDto);

      expect(result).toBeDefined();
      expect(result.propertyId).toBe(context.testProperty.id);
      expect(result.buyerId).toBe(context.testBuyer.id);
    });
  });

  describe('findAll', () => {
    it('should return all accounts receivable transactions for company', async () => {
      await service.create(context.testUser.id, {
        amount: 5000.0,
        dueDate: '2025-02-15',
        description: 'Receivable 1',
      });

      await service.create(context.testUser.id, {
        amount: 10000.0,
        dueDate: '2025-02-20',
        description: 'Receivable 2',
      });

      const result = await service.findAll(context.testUser.id);

      expect(result.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('findOne', () => {
    it('should return accounts receivable transaction by ID', async () => {
      const created = await service.create(context.testUser.id, {
        amount: 5000.0,
        dueDate: '2025-02-15',
        description: 'Test transaction',
      });

      const result = await service.findOne(context.testUser.id, created.id);

      expect(result).toBeDefined();
      expect(result.id).toBe(created.id);
    });
  });

  describe('update', () => {
    it('should update accounts receivable transaction successfully', async () => {
      const created = await service.create(context.testUser.id, {
        amount: 5000.0,
        dueDate: '2025-02-15',
        description: 'Original description',
        status: AccountsReceivableStatus.UNPAID,
      });

      const updateDto: UpdateAccountsReceivableDto = {
        status: AccountsReceivableStatus.PAID,
        paidDate: '2025-01-20',
        paidAmount: 5000.0,
      };

      const result = await service.update(
        context.testUser.id,
        created.id,
        updateDto,
      );

      expect(result.status).toBe(AccountsReceivableStatus.PAID);
      expect(result.paidAmount).toBe(5000.0);
    });
  });

  describe('remove', () => {
    it('should soft delete accounts receivable transaction', async () => {
      const created = await service.create(context.testUser.id, {
        amount: 5000.0,
        dueDate: '2025-02-15',
        description: 'Test transaction',
      });

      await service.remove(context.testUser.id, created.id);

      await expect(
        service.findOne(context.testUser.id, created.id),
      ).rejects.toThrow('Accounts receivable transaction not found');
    });
  });
});
