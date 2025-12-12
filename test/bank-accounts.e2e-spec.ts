import {
  setupE2ETest,
  teardownE2ETest,
  authenticatedRequest,
  E2ETestContext,
} from './e2e-test-helpers';
import { BankAccountType } from '../src/bank-accounts/dto';

describe('Bank Accounts Management Flow (e2e)', () => {
  let context: E2ETestContext;

  beforeAll(async () => {
    context = await setupE2ETest({
      companyName: 'Bank Accounts Test Company',
      email: 'bank@testcompany.com',
      cnpj: '11.222.333/0001-13',
      planName: 'Avançado',
      isTrial: true,
    });
  });

  afterAll(async () => {
    await teardownE2ETest(context);
  });

  describe('POST /bank-accounts', () => {
    it('should create a bank account', async () => {
      const createDto = {
        bankName: 'Test Bank',
        bankCode: '001',
        branch: '0001',
        accountNumber: '12345-6',
        accountType: BankAccountType.CHECKING,
        accountHolderName: 'Test Company',
        status: 'active',
      };

      const response = authenticatedRequest(context.app, context.mainUserToken)
        .post('/bank-accounts')
        .send(createDto)
        .expect(201);

      expect(response.body).toMatchObject({
        bankName: 'Test Bank',
        bankCode: '001',
        accountType: BankAccountType.CHECKING,
      });
      expect(response.body.id).toBeDefined();
    });

    it('should return 409 if account already exists', async () => {
      await context.prisma.bankAccount.create({
        data: {
          bankName: 'Test Bank',
          bankCode: '001',
          branch: '0001',
          accountNumber: '12345-6',
          accountType: BankAccountType.CHECKING,
          companyId: context.testCompany.id,
        },
      });

      const createDto = {
        bankName: 'Test Bank',
        bankCode: '001',
        branch: '0001',
        accountNumber: '12345-6',
        accountType: BankAccountType.CHECKING,
      };

      await authenticatedRequest(context.app, context.mainUserToken)
        .post('/bank-accounts')
        .send(createDto)
        .expect(409);
    });
  });

  describe('GET /bank-accounts', () => {
    it('should return all bank accounts for company', async () => {
      await context.prisma.bankAccount.create({
        data: {
          bankName: 'Bank 1',
          bankCode: '001',
          branch: '0001',
          accountNumber: '11111-1',
          accountType: BankAccountType.CHECKING,
          companyId: context.testCompany.id,
        },
      });

      const response = authenticatedRequest(context.app, context.mainUserToken)
        .get('/bank-accounts')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('GET /bank-accounts/:id', () => {
    it('should return bank account by ID', async () => {
      const account = await context.prisma.bankAccount.create({
        data: {
          bankName: 'Test Bank',
          bankCode: '001',
          branch: '0001',
          accountNumber: '12345-6',
          accountType: BankAccountType.CHECKING,
          companyId: context.testCompany.id,
        },
      });

      const response = await request(app.getHttpServer())
        .get(`/bank-accounts/${account.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.id).toBe(account.id);
    });
  });

  describe('PUT /bank-accounts/:id', () => {
    it('should update bank account successfully', async () => {
      const account = await context.prisma.bankAccount.create({
        data: {
          bankName: 'Original Bank',
          bankCode: '001',
          branch: '0001',
          accountNumber: '12345-6',
          accountType: BankAccountType.CHECKING,
          accountHolderName: 'Original Name',
          companyId: context.testCompany.id,
        },
      });

      const updateDto = {
        accountHolderName: 'Updated Name',
      };

      const response = await request(app.getHttpServer())
        .put(`/bank-accounts/${account.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateDto)
        .expect(200);

      expect(response.body.accountHolderName).toBe('Updated Name');
    });
  });

  describe('DELETE /bank-accounts/:id', () => {
    it('should soft delete bank account successfully', async () => {
      const account = await context.prisma.bankAccount.create({
        data: {
          bankName: 'Test Bank',
          bankCode: '001',
          branch: '0001',
          accountNumber: '12345-6',
          accountType: BankAccountType.CHECKING,
          companyId: context.testCompany.id,
        },
      });

      await request(app.getHttpServer())
        .delete(`/bank-accounts/${account.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const deletedAccount = await prisma.bankAccount.findUnique({
        where: { id: account.id },
      });
      expect(deletedAccount?.deletedAt).toBeDefined();
    });
  });
});
