import {
  setupE2ETest,
  teardownE2ETest,
  authenticatedRequest,
  E2ETestContext,
} from './e2e-test-helpers';
import { AccountsReceivableStatus } from '../src/accounts-receivable/dto';

describe('Accounts Receivable Observations Management Flow (e2e)', () => {
  let context: E2ETestContext;
  let testAccountsReceivable: any;

  beforeAll(async () => {
    context = await setupE2ETest({
      companyName: 'Accounts Receivable Observations Test Company',
      email: 'ar-obs@testcompany.com',
      cnpj: '11.222.333/0001-24',
      planName: 'Avançado',
      isTrial: true,
      createProperty: true,
    });
    testAccountsReceivable = await context.prisma.accountsReceivable.create({
      data: {
        amount: 5000.0,
        dueDate: new Date('2025-02-15'),
        description: 'Test receivable',
        status: AccountsReceivableStatus.UNPAID,
        companyId: context.testCompany.id,
      },
    });
  });

  afterAll(async () => {
    await teardownE2ETest(context);
  });

  describe('POST /accounts-receivable-observations', () => {
    it('should create an observation successfully', async () => {
      const response = await authenticatedRequest(
        context.app,
        context.mainUserToken,
      )
        .post('/accounts-receivable-observations')
        .send({
          accountsReceivableId: testAccountsReceivable.id,
          observation: 'Test observation',
        })
        .expect(201);

      expect(response.body.accountsReceivableId).toBe(
        testAccountsReceivable.id,
      );
    });
  });

  describe('POST /accounts-receivable/:accountsReceivableId/observations', () => {
    it('should create an observation via entity route', async () => {
      const response = await authenticatedRequest(
        context.app,
        context.mainUserToken,
      )
        .post(`/accounts-receivable/${testAccountsReceivable.id}/observations`)
        .send({ observation: 'Test observation' })
        .expect(201);

      expect(response.body.accountsReceivableId).toBe(
        testAccountsReceivable.id,
      );
    });
  });

  describe('GET /accounts-receivable-observations', () => {
    it('should return all observations', async () => {
      await context.prisma.accountsReceivableObservation.createMany({
        data: [
          {
            accountsReceivableId: testAccountsReceivable.id,
            observation: 'Obs 1',
            companyId: context.testCompany.id,
            createdBy: context.testUser.id,
          },
        ],
      });

      const response = await authenticatedRequest(
        context.app,
        context.mainUserToken,
      )
        .get('/accounts-receivable-observations')
        .expect(200);

      expect(response.body.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('GET /accounts-receivable/:accountsReceivableId/observations', () => {
    it('should return observations for accounts receivable', async () => {
      const response = await authenticatedRequest(
        context.app,
        context.mainUserToken,
      )
        .get(`/accounts-receivable/${testAccountsReceivable.id}/observations`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  describe('GET /accounts-receivable-observations/:id', () => {
    it('should return observation by id', async () => {
      const obs = await context.prisma.accountsReceivableObservation.create({
        data: {
          accountsReceivableId: testAccountsReceivable.id,
          observation: 'Test',
          companyId: context.testCompany.id,
          createdBy: context.testUser.id,
        },
      });

      const response = await authenticatedRequest(
        context.app,
        context.mainUserToken,
      )
        .get(`/accounts-receivable-observations/${obs.id}`)
        .expect(200);

      expect(response.body.id).toBe(obs.id);
    });
  });

  describe('PUT /accounts-receivable-observations/:id', () => {
    it('should update observation', async () => {
      const obs = await context.prisma.accountsReceivableObservation.create({
        data: {
          accountsReceivableId: testAccountsReceivable.id,
          observation: 'Original',
          companyId: context.testCompany.id,
          createdBy: context.testUser.id,
        },
      });

      const response = await authenticatedRequest(
        context.app,
        context.mainUserToken,
      )
        .put(`/accounts-receivable-observations/${obs.id}`)
        .send({ observation: 'Updated' })
        .expect(200);

      expect(response.body.observation).toBe('Updated');
    });
  });

  describe('DELETE /accounts-receivable-observations/:id', () => {
    it('should delete observation', async () => {
      const obs = await context.prisma.accountsReceivableObservation.create({
        data: {
          accountsReceivableId: testAccountsReceivable.id,
          observation: 'To delete',
          companyId: context.testCompany.id,
          createdBy: context.testUser.id,
        },
      });

      await authenticatedRequest(context.app, context.mainUserToken)
        .delete(`/accounts-receivable-observations/${obs.id}`)
        .expect(200);
    });
  });
});
