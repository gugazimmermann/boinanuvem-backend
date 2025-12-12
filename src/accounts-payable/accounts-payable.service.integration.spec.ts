import { AccountsPayableService } from './accounts-payable.service';
import {
  CreateAccountsPayableDto,
  UpdateAccountsPayableDto,
  AccountsPayableStatus,
} from './dto';
import {
  describeOrSkip,
  setupIntegrationTest,
  teardownIntegrationTest,
  createServiceTestingModule,
  getServiceFromModule,
  IntegrationTestContext,
} from '../../test/integration-test-helpers';

describeOrSkip('AccountsPayableService Integration Tests', () => {
  let service: AccountsPayableService;
  let context: IntegrationTestContext;

  beforeAll(async () => {
    context = await setupIntegrationTest({
      cnpj: '11.222.333/0001-08',
      companyName: 'Test Accounts Payable Company',
      email: 'ap@testcompany.com',
      userEmail: 'user-ap@testcompany.com',
      createProperty: true,
      createSupplier: true,
    });
  });

  afterAll(async () => {
    await teardownIntegrationTest(context, {
      tables: ['accountsPayable', 'supplier'],
    });
  });

  beforeEach(async () => {
    const module = await createServiceTestingModule(
      AccountsPayableService,
      context.prisma,
    );
    service = getServiceFromModule(module, AccountsPayableService);
  });

  afterEach(async () => {
    await context.prisma.accountsPayable.deleteMany({
      where: {
        companyId: context.testCompany.id,
      },
    });
  });

  describe('create', () => {
    it('should create an accounts payable transaction successfully', async () => {
      const createDto: CreateAccountsPayableDto = {
        amount: 1000.0,
        dueDate: '2025-02-15',
        description: 'Test payable',
        category: 'feed',
        paymentMethod: 'cash',
        status: AccountsPayableStatus.UNPAID,
      };

      const result = await service.create(context.testUser.id, createDto);

      expect(result).toBeDefined();
      expect(result.amount).toBe(1000.0);
      expect(result.status).toBe(AccountsPayableStatus.UNPAID);
    });

    it('should create with related entities', async () => {
      const createDto: CreateAccountsPayableDto = {
        amount: 2000.0,
        dueDate: '2025-02-20',
        description: 'Test payable with relations',
        propertyId: context.testProperty.id,
        supplierId: context.testSupplier.id,
      };

      const result = await service.create(context.testUser.id, createDto);

      expect(result).toBeDefined();
      expect(result.propertyId).toBe(context.testProperty.id);
      expect(result.supplierId).toBe(context.testSupplier.id);
    });
  });

  describe('findAll', () => {
    it('should return all accounts payable transactions for company', async () => {
      await service.create(context.testUser.id, {
        amount: 1000.0,
        dueDate: '2025-02-15',
        description: 'Payable 1',
      });

      await service.create(context.testUser.id, {
        amount: 2000.0,
        dueDate: '2025-02-20',
        description: 'Payable 2',
      });

      const result = await service.findAll(context.testUser.id);

      expect(result.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('findOne', () => {
    it('should return accounts payable transaction by ID', async () => {
      const created = await service.create(context.testUser.id, {
        amount: 1000.0,
        dueDate: '2025-02-15',
        description: 'Test transaction',
      });

      const result = await service.findOne(context.testUser.id, created.id);

      expect(result).toBeDefined();
      expect(result.id).toBe(created.id);
    });
  });

  describe('update', () => {
    it('should update accounts payable transaction successfully', async () => {
      const created = await service.create(context.testUser.id, {
        amount: 1000.0,
        dueDate: '2025-02-15',
        description: 'Original description',
        status: AccountsPayableStatus.UNPAID,
      });

      const updateDto: UpdateAccountsPayableDto = {
        status: AccountsPayableStatus.PAID,
        paidDate: '2025-01-20',
        paidAmount: 1000.0,
      };

      const result = await service.update(
        context.testUser.id,
        created.id,
        updateDto,
      );

      expect(result.status).toBe(AccountsPayableStatus.PAID);
      expect(result.paidAmount).toBe(1000.0);
    });
  });

  describe('remove', () => {
    it('should soft delete accounts payable transaction', async () => {
      const created = await service.create(context.testUser.id, {
        amount: 1000.0,
        dueDate: '2025-02-15',
        description: 'Test transaction',
      });

      await service.remove(context.testUser.id, created.id);

      await expect(
        service.findOne(context.testUser.id, created.id),
      ).rejects.toThrow('Accounts payable transaction not found');
    });
  });
});
