import request from 'supertest';
import {
  setupE2ETest,
  teardownE2ETest,
  authenticatedRequest,
  E2ETestContext,
} from './e2e-test-helpers';
import { AccountsPayableStatus } from '../src/accounts-payable/dto';

describe('Accounts Payable Management Flow (e2e)', () => {
  let context: E2ETestContext;

  beforeAll(async () => {
    context = await setupE2ETest({
      companyName: 'Accounts Payable Test Company',
      email: 'ap@testcompany.com',
      cnpj: '11.222.333/0001-09',
      planName: 'Avançado',
      isTrial: true,
    });
  });

  afterAll(async () => {
    await teardownE2ETest(context);
  });

  describe('POST /accounts-payable', () => {
    it('should create an accounts payable transaction', async () => {
      const createDto = {
        amount: 1000.0,
        dueDate: '2025-02-15',
        description: 'Test payable',
        category: 'feed',
        paymentMethod: 'cash',
        status: AccountsPayableStatus.UNPAID,
      };

      const response = await authenticatedRequest(
        context.app,
        context.mainUserToken,
      )
        .post('/accounts-payable')
        .send(createDto)
        .expect(201);

      expect(response.body).toMatchObject({
        amount: 1000.0,
        status: AccountsPayableStatus.UNPAID,
      });
      expect(response.body.id).toBeDefined();
    });

    it('should return 401 if not authenticated', async () => {
      const createDto = {
        amount: 1000.0,
        dueDate: '2025-02-15',
      };

      await request(context.app.getHttpServer())
        .post('/accounts-payable')
        .send(createDto)
        .expect(401);
    });
  });

  describe('GET /accounts-payable', () => {
    it('should return all accounts payable transactions for company', async () => {
      await context.prisma.accountsPayable.create({
        data: {
          amount: 1000.0,
          dueDate: new Date('2025-02-15'),
          description: 'Payable 1',
          companyId: context.testCompany.id,
        },
      });

      const response = await authenticatedRequest(
        context.app,
        context.mainUserToken,
      )
        .get('/accounts-payable')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('GET /accounts-payable/:id', () => {
    it('should return accounts payable transaction by ID', async () => {
      const transaction = await context.prisma.accountsPayable.create({
        data: {
          amount: 1000.0,
          dueDate: new Date('2025-02-15'),
          description: 'Test transaction',
          companyId: context.testCompany.id,
        },
      });

      const response = await authenticatedRequest(
        context.app,
        context.mainUserToken,
      )
        .get(`/accounts-payable/${transaction.id}`)
        .expect(200);

      expect(response.body.id).toBe(transaction.id);
    });
  });

  describe('PUT /accounts-payable/:id', () => {
    it('should update accounts payable transaction successfully', async () => {
      const transaction = await context.prisma.accountsPayable.create({
        data: {
          amount: 1000.0,
          dueDate: new Date('2025-02-15'),
          description: 'Original description',
          status: AccountsPayableStatus.UNPAID,
          companyId: context.testCompany.id,
        },
      });

      const updateDto = {
        status: AccountsPayableStatus.PAID,
        paidDate: '2025-01-20',
        paidAmount: 1000.0,
      };

      const response = await request(context.app.getHttpServer())
        .put(`/accounts-payable/${transaction.id}`)
        .set('Authorization', `Bearer ${context.mainUserToken}`)
        .send(updateDto)
        .expect(200);

      expect(response.body.status).toBe(AccountsPayableStatus.PAID);
    });
  });

  describe('DELETE /accounts-payable/:id', () => {
    it('should soft delete accounts payable transaction successfully', async () => {
      const transaction = await context.prisma.accountsPayable.create({
        data: {
          amount: 1000.0,
          dueDate: new Date('2025-02-15'),
          description: 'Test transaction',
          companyId: context.testCompany.id,
        },
      });

      await request(context.app.getHttpServer())
        .delete(`/accounts-payable/${transaction.id}`)
        .set('Authorization', `Bearer ${context.mainUserToken}`)
        .expect(200);

      const deletedTransaction =
        await context.prisma.accountsPayable.findUnique({
          where: { id: transaction.id },
        });
      expect(deletedTransaction?.deletedAt).toBeDefined();
    });
  });
});
