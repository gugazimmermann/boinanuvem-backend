import { BankAccountsService } from './bank-accounts.service';
import {
  CreateBankAccountDto,
  UpdateBankAccountDto,
  BankAccountType,
} from './dto';
import {
  describeOrSkip,
  setupIntegrationTest,
  teardownIntegrationTest,
  createServiceTestingModule,
  getServiceFromModule,
  IntegrationTestContext,
} from '../../test/integration-test-helpers';

describeOrSkip('BankAccountsService Integration Tests', () => {
  let service: BankAccountsService;
  let context: IntegrationTestContext;

  beforeAll(async () => {
    context = await setupIntegrationTest({
      cnpj: '11.222.333/0001-12',
      companyName: 'Test Bank Accounts Company',
      email: 'bank@testcompany.com',
      userEmail: 'user-bank@testcompany.com',
    });
  });

  afterAll(async () => {
    await teardownIntegrationTest(context, {
      tables: ['bankAccount'],
    });
  });

  beforeEach(async () => {
    const module = await createServiceTestingModule(
      BankAccountsService,
      context.prisma,
    );
    service = getServiceFromModule(module, BankAccountsService);
  });

  afterEach(async () => {
    await context.prisma.bankAccount.deleteMany({
      where: {
        companyId: context.testCompany.id,
      },
    });
  });

  describe('create', () => {
    it('should create a bank account successfully', async () => {
      const createDto: CreateBankAccountDto = {
        bankName: 'Test Bank',
        bankCode: '001',
        branch: '0001',
        accountNumber: '12345-6',
        accountType: BankAccountType.CHECKING,
        accountHolderName: 'Test Company',
        status: 'active',
      };

      const result = await service.create(context.testUser.id, createDto);

      expect(result).toBeDefined();
      expect(result.bankName).toBe('Test Bank');
      expect(result.bankCode).toBe('001');
      expect(result.accountType).toBe(BankAccountType.CHECKING);
    });

    it('should throw ConflictException if account already exists', async () => {
      await service.create(context.testUser.id, {
        bankName: 'Test Bank',
        bankCode: '001',
        branch: '0001',
        accountNumber: '12345-6',
        accountType: BankAccountType.CHECKING,
      });

      await expect(
        service.create(context.testUser.id, {
          bankName: 'Test Bank',
          bankCode: '001',
          branch: '0001',
          accountNumber: '12345-6',
          accountType: BankAccountType.CHECKING,
        }),
      ).rejects.toThrow('already exists');
    });
  });

  describe('findAll', () => {
    it('should return all bank accounts for company', async () => {
      await service.create(context.testUser.id, {
        bankName: 'Bank 1',
        bankCode: '001',
        branch: '0001',
        accountNumber: '11111-1',
        accountType: BankAccountType.CHECKING,
      });

      await service.create(context.testUser.id, {
        bankName: 'Bank 2',
        bankCode: '002',
        branch: '0002',
        accountNumber: '22222-2',
        accountType: BankAccountType.SAVINGS,
      });

      const result = await service.findAll(context.testUser.id);

      expect(result.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('findOne', () => {
    it('should return bank account by ID', async () => {
      const created = await service.create(context.testUser.id, {
        bankName: 'Test Bank',
        bankCode: '001',
        branch: '0001',
        accountNumber: '12345-6',
        accountType: BankAccountType.CHECKING,
      });

      const result = await service.findOne(context.testUser.id, created.id);

      expect(result).toBeDefined();
      expect(result.id).toBe(created.id);
    });
  });

  describe('update', () => {
    it('should update bank account successfully', async () => {
      const created = await service.create(context.testUser.id, {
        bankName: 'Original Bank',
        bankCode: '001',
        branch: '0001',
        accountNumber: '12345-6',
        accountType: BankAccountType.CHECKING,
        accountHolderName: 'Original Name',
      });

      const updateDto: UpdateBankAccountDto = {
        accountHolderName: 'Updated Name',
      };

      const result = await service.update(
        context.testUser.id,
        created.id,
        updateDto,
      );

      expect(result.accountHolderName).toBe('Updated Name');
    });
  });

  describe('remove', () => {
    it('should soft delete bank account', async () => {
      const created = await service.create(context.testUser.id, {
        bankName: 'Test Bank',
        bankCode: '001',
        branch: '0001',
        accountNumber: '12345-6',
        accountType: BankAccountType.CHECKING,
      });

      await service.remove(context.testUser.id, created.id);

      await expect(
        service.findOne(context.testUser.id, created.id),
      ).rejects.toThrow('Bank account not found');
    });
  });
});
