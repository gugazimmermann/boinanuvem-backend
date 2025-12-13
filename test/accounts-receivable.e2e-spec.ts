import request from 'supertest';
import {
  setupE2ETest,
  teardownE2ETest,
  authenticatedRequest,
  E2ETestContext,
} from './e2e-test-helpers';
import { AccountsReceivableStatus } from '../src/accounts-receivable/dto';

describe('Accounts Receivable Management Flow (e2e)', () => {
  let context: E2ETestContext;

  beforeAll(async () => {
    context = await setupE2ETest({
      companyName: 'Accounts Receivable Test Company',
      email: 'ar@testcompany.com',
      cnpj: '11.222.333/0001-11',
      planName: 'Avançado',
      isTrial: true,
    });
  });

  afterAll(async () => {
    await teardownE2ETest(context);
  });

  describe('POST /accounts-receivable', () => {
    it('should create an accounts receivable transaction', async () => {
      const createDto = {
        amount: 5000.0,
        dueDate: '2025-02-15',
        description: 'Test receivable',
        category: 'cattle_sales',
        paymentMethod: 'bank_transfer',
        status: AccountsReceivableStatus.UNPAID,
      };

      const response = await authenticatedRequest(
        context.app,
        context.mainUserToken,
      )
        .post('/accounts-receivable')
        .send(createDto)
        .expect(201);

      expect(response.body).toMatchObject({
        amount: 5000.0,
        status: AccountsReceivableStatus.UNPAID,
      });
      expect(response.body.id).toBeDefined();
    });
  });

  describe('GET /accounts-receivable', () => {
    it('should return all accounts receivable transactions for company', async () => {
      await context.prisma.accountsReceivable.create({
        data: {
          amount: 5000.0,
          dueDate: new Date('2025-02-15'),
          description: 'Receivable 1',
          companyId: context.testCompany.id,
        },
      });

      const response = await authenticatedRequest(
        context.app,
        context.mainUserToken,
      )
        .get('/accounts-receivable')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('GET /accounts-receivable/:id', () => {
    it('should return accounts receivable transaction by ID', async () => {
      const transaction = await context.prisma.accountsReceivable.create({
        data: {
          amount: 5000.0,
          dueDate: new Date('2025-02-15'),
          description: 'Test transaction',
          companyId: context.testCompany.id,
        },
      });

      const response = await authenticatedRequest(
        context.app,
        context.mainUserToken,
      )
        .get(`/accounts-receivable/${transaction.id}`)
        .expect(200);

      expect(response.body.id).toBe(transaction.id);
    });
  });

  describe('PUT /accounts-receivable/:id', () => {
    it('should update accounts receivable transaction successfully', async () => {
      const transaction = await context.prisma.accountsReceivable.create({
        data: {
          amount: 5000.0,
          dueDate: new Date('2025-02-15'),
          description: 'Original description',
          status: AccountsReceivableStatus.UNPAID,
          companyId: context.testCompany.id,
        },
      });

      const updateDto = {
        status: AccountsReceivableStatus.PAID,
        paidDate: '2025-01-20',
        paidAmount: 5000.0,
      };

      const response = await request(context.app.getHttpServer())
        .put(`/accounts-receivable/${transaction.id}`)
        .set('Authorization', `Bearer ${context.mainUserToken}`)
        .send(updateDto)
        .expect(200);

      expect(response.body.status).toBe(AccountsReceivableStatus.PAID);
    });
  });

  describe('DELETE /accounts-receivable/:id', () => {
    it('should soft delete accounts receivable transaction successfully', async () => {
      const transaction = await context.prisma.accountsReceivable.create({
        data: {
          amount: 5000.0,
          dueDate: new Date('2025-02-15'),
          description: 'Test transaction',
          companyId: context.testCompany.id,
        },
      });

      await authenticatedRequest(context.app, context.mainUserToken)
        .delete(`/accounts-receivable/${transaction.id}`)
        .expect(200);

      const deletedTransaction =
        await context.prisma.accountsReceivable.findUnique({
          where: { id: transaction.id },
        });
      expect(deletedTransaction?.deletedAt).toBeDefined();
    });
  });
});
