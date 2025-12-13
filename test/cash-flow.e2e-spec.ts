import request from 'supertest';
import {
  setupE2ETest,
  teardownE2ETest,
  authenticatedRequest,
  E2ETestContext,
} from './e2e-test-helpers';
import {
  CashFlowType,
  CashFlowCategory,
  PaymentMethod,
} from '../src/cash-flow/dto';
import { BankAccountType } from '../src/bank-accounts/dto';

describe('Cash Flow Management Flow (e2e)', () => {
  let context: E2ETestContext;
  let testBankAccount: any;

  beforeAll(async () => {
    context = await setupE2ETest({
      companyName: 'Cash Flow Test Company',
      email: 'cashflow@testcompany.com',
      cnpj: '11.222.333/0001-07',
      planName: 'Avançado',
      isTrial: true,
    });

    // Create test bank account
    testBankAccount = await context.prisma.bankAccount.create({
      data: {
        companyId: context.testCompany.id,
        bankName: 'Test Bank',
        bankCode: '001',
        branch: '0001',
        accountNumber: '12345-6',
        accountType: BankAccountType.CHECKING,
        status: 'active',
      },
    });
  });

  afterAll(async () => {
    await teardownE2ETest(context);
  });

  describe('POST /cash-flow', () => {
    it('should create an expense transaction', async () => {
      const createDto = {
        type: CashFlowType.EXPENSE,
        amount: 1000.0,
        date: '2025-01-15',
        description: 'Test expense',
        category: CashFlowCategory.FEED,
        paymentMethod: PaymentMethod.CASH,
        status: 'completed',
      };

      const response = await authenticatedRequest(
        context.app,
        context.mainUserToken,
      )
        .post('/cash-flow')
        .send(createDto)
        .expect(201);

      expect(response.body).toMatchObject({
        type: CashFlowType.EXPENSE,
        amount: 1000.0,
        status: 'completed',
      });
      expect(response.body.id).toBeDefined();
    });

    it('should create an income transaction', async () => {
      const createDto = {
        type: CashFlowType.INCOME,
        amount: 5000.0,
        date: '2025-01-16',
        description: 'Test income',
        category: CashFlowCategory.CATTLE_SALES,
        paymentMethod: PaymentMethod.BANK_TRANSFER,
      };

      const response = await authenticatedRequest(
        context.app,
        context.mainUserToken,
      )
        .post('/cash-flow')
        .send(createDto)
        .expect(201);

      expect(response.body.type).toBe(CashFlowType.INCOME);
      expect(response.body.amount).toBe(5000.0);
    });

    it('should return 401 if not authenticated', async () => {
      const createDto = {
        type: CashFlowType.EXPENSE,
        amount: 1000.0,
        date: '2025-01-15',
      };

      await request(context.app.getHttpServer())
        .post('/cash-flow')
        .send(createDto)
        .expect(401);
    });

    it('should create expense transaction with bankAccountId', async () => {
      const createDto = {
        type: CashFlowType.EXPENSE,
        amount: 1000.0,
        date: '2025-01-15',
        description: 'Test expense with bank account',
        category: CashFlowCategory.FEED,
        paymentMethod: PaymentMethod.CASH,
        status: 'completed',
        bankAccountId: testBankAccount.id,
      };

      const response = await authenticatedRequest(
        context.app,
        context.mainUserToken,
      )
        .post('/cash-flow')
        .send(createDto)
        .expect(201);

      expect(response.body).toMatchObject({
        type: CashFlowType.EXPENSE,
        amount: 1000.0,
        bankAccountId: testBankAccount.id,
      });
    });

    it('should create income transaction with bankAccountId', async () => {
      const createDto = {
        type: CashFlowType.INCOME,
        amount: 5000.0,
        date: '2025-01-16',
        description: 'Test income with bank account',
        category: CashFlowCategory.CATTLE_SALES,
        paymentMethod: PaymentMethod.BANK_TRANSFER,
        bankAccountId: testBankAccount.id,
      };

      const response = await authenticatedRequest(
        context.app,
        context.mainUserToken,
      )
        .post('/cash-flow')
        .send(createDto)
        .expect(201);

      expect(response.body.type).toBe(CashFlowType.INCOME);
      expect(response.body.bankAccountId).toBe(testBankAccount.id);
    });

    it('should return 404 if bank account not found when creating transaction', async () => {
      const createDto = {
        type: CashFlowType.EXPENSE,
        amount: 1000.0,
        date: '2025-01-15',
        description: 'Test expense',
        bankAccountId: 'non-existent-bank-account-id',
      };

      await authenticatedRequest(context.app, context.mainUserToken)
        .post('/cash-flow')
        .send(createDto)
        .expect(404);
    });
  });

  describe('GET /cash-flow', () => {
    it('should return all cash flow transactions for company', async () => {
      await context.prisma.cashFlow.create({
        data: {
          type: CashFlowType.EXPENSE,
          amount: 1000.0,
          date: new Date('2025-01-15'),
          description: 'Expense 1',
          companyId: context.testCompany.id,
        },
      });

      await context.prisma.cashFlow.create({
        data: {
          type: CashFlowType.INCOME,
          amount: 5000.0,
          date: new Date('2025-01-16'),
          description: 'Income 1',
          companyId: context.testCompany.id,
        },
      });

      const response = await authenticatedRequest(
        context.app,
        context.mainUserToken,
      )
        .get('/cash-flow')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('GET /cash-flow/:id', () => {
    it('should return cash flow transaction by ID', async () => {
      const transaction = await context.prisma.cashFlow.create({
        data: {
          type: CashFlowType.EXPENSE,
          amount: 1000.0,
          date: new Date('2025-01-15'),
          description: 'Test transaction',
          companyId: context.testCompany.id,
        },
      });

      const response = await authenticatedRequest(
        context.app,
        context.mainUserToken,
      )
        .get(`/cash-flow/${transaction.id}`)
        .expect(200);

      expect(response.body.id).toBe(transaction.id);
    });

    it('should return 404 if transaction not found', async () => {
      await request(context.app.getHttpServer())
        .get('/cash-flow/non-existent-id')
        .set('Authorization', `Bearer ${context.mainUserToken}`)
        .expect(404);
    });
  });

  describe('PUT /cash-flow/:id', () => {
    it('should update cash flow transaction successfully', async () => {
      const transaction = await context.prisma.cashFlow.create({
        data: {
          type: CashFlowType.EXPENSE,
          amount: 1000.0,
          date: new Date('2025-01-15'),
          description: 'Original description',
          companyId: context.testCompany.id,
        },
      });

      const updateDto = {
        description: 'Updated description',
        amount: 1500.0,
      };

      const response = await request(context.app.getHttpServer())
        .put(`/cash-flow/${transaction.id}`)
        .set('Authorization', `Bearer ${context.mainUserToken}`)
        .send(updateDto)
        .expect(200);

      expect(response.body.description).toBe('Updated description');
      expect(response.body.amount).toBe(1500.0);
    });

    it('should update transaction with bankAccountId', async () => {
      const transaction = await context.prisma.cashFlow.create({
        data: {
          type: CashFlowType.EXPENSE,
          amount: 1000.0,
          date: new Date('2025-01-15'),
          description: 'Original transaction',
          companyId: context.testCompany.id,
        },
      });

      const updateDto = {
        bankAccountId: testBankAccount.id,
      };

      const response = await request(context.app.getHttpServer())
        .put(`/cash-flow/${transaction.id}`)
        .set('Authorization', `Bearer ${context.mainUserToken}`)
        .send(updateDto)
        .expect(200);

      expect(response.body.bankAccountId).toBe(testBankAccount.id);
    });

    it('should return 404 if bank account not found when updating transaction', async () => {
      const transaction = await context.prisma.cashFlow.create({
        data: {
          type: CashFlowType.EXPENSE,
          amount: 1000.0,
          date: new Date('2025-01-15'),
          description: 'Original transaction',
          companyId: context.testCompany.id,
        },
      });

      const updateDto = {
        bankAccountId: 'non-existent-bank-account-id',
      };

      await request(context.app.getHttpServer())
        .put(`/cash-flow/${transaction.id}`)
        .set('Authorization', `Bearer ${context.mainUserToken}`)
        .send(updateDto)
        .expect(404);
    });
  });

  describe('DELETE /cash-flow/:id', () => {
    it('should soft delete cash flow transaction successfully', async () => {
      const transaction = await context.prisma.cashFlow.create({
        data: {
          type: CashFlowType.EXPENSE,
          amount: 1000.0,
          date: new Date('2025-01-15'),
          description: 'Test transaction',
          companyId: context.testCompany.id,
        },
      });

      await request(context.app.getHttpServer())
        .delete(`/cash-flow/${transaction.id}`)
        .set('Authorization', `Bearer ${context.mainUserToken}`)
        .expect(200);

      // Verify transaction is soft deleted
      const deletedTransaction = await context.prisma.cashFlow.findUnique({
        where: { id: transaction.id },
      });
      expect(deletedTransaction?.deletedAt).toBeDefined();
    });
  });
});
