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

describe('Cash Flow Observations Management Flow (e2e)', () => {
  let context: E2ETestContext;
  let testCashFlow: any;

  beforeAll(async () => {
    context = await setupE2ETest({
      companyName: 'Cash Flow Observations Test Company',
      email: 'cf-obs@testcompany.com',
      cnpj: '11.222.333/0001-22',
      planName: 'Avançado',
      isTrial: true,
      createProperty: true,
    });
    testCashFlow = await context.prisma.cashFlow.create({
      data: {
        type: CashFlowType.EXPENSE,
        amount: 1000.0,
        date: new Date('2025-01-15'),
        description: 'Test expense',
        category: CashFlowCategory.FEED,
        paymentMethod: PaymentMethod.CASH,
        status: 'completed',
        companyId: context.testCompany.id,
      },
    });
  });

  afterAll(async () => {
    await teardownE2ETest(context);
  });

  describe('POST /cash-flow-observations', () => {
    it('should create an observation successfully', async () => {
      const response = await authenticatedRequest(
        context.app,
        context.mainUserToken,
      )
        .post('/cash-flow-observations')
        .send({
          cashFlowId: testCashFlow.id,
          observation: 'Test observation',
        })
        .expect(201);

      expect(response.body.cashFlowId).toBe(testCashFlow.id);
      expect(response.body.observation).toBe('Test observation');
    });
  });

  describe('POST /cash-flows/:cashFlowId/observations', () => {
    it('should create an observation via entity route', async () => {
      const response = await authenticatedRequest(
        context.app,
        context.mainUserToken,
      )
        .post(`/cash-flows/${testCashFlow.id}/observations`)
        .send({ observation: 'Test observation' })
        .expect(201);

      expect(response.body.cashFlowId).toBe(testCashFlow.id);
    });
  });

  describe('GET /cash-flow-observations', () => {
    it('should return all observations', async () => {
      await context.prisma.cashFlowObservation.createMany({
        data: [
          {
            cashFlowId: testCashFlow.id,
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
        .get('/cash-flow-observations')
        .expect(200);

      expect(response.body.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('GET /cash-flows/:cashFlowId/observations', () => {
    it('should return observations for cash flow', async () => {
      const response = await authenticatedRequest(
        context.app,
        context.mainUserToken,
      )
        .get(`/cash-flows/${testCashFlow.id}/observations`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  describe('GET /cash-flow-observations/:id', () => {
    it('should return observation by id', async () => {
      const obs = await context.prisma.cashFlowObservation.create({
        data: {
          cashFlowId: testCashFlow.id,
          observation: 'Test',
          companyId: context.testCompany.id,
          createdBy: context.testUser.id,
        },
      });

      const response = await authenticatedRequest(
        context.app,
        context.mainUserToken,
      )
        .get(`/cash-flow-observations/${obs.id}`)
        .expect(200);

      expect(response.body.id).toBe(obs.id);
    });
  });

  describe('PUT /cash-flow-observations/:id', () => {
    it('should update observation', async () => {
      const obs = await context.prisma.cashFlowObservation.create({
        data: {
          cashFlowId: testCashFlow.id,
          observation: 'Original',
          companyId: context.testCompany.id,
          createdBy: context.testUser.id,
        },
      });

      const response = await authenticatedRequest(
        context.app,
        context.mainUserToken,
      )
        .put(`/cash-flow-observations/${obs.id}`)
        .send({ observation: 'Updated' })
        .expect(200);

      expect(response.body.observation).toBe('Updated');
    });
  });

  describe('DELETE /cash-flow-observations/:id', () => {
    it('should delete observation', async () => {
      const obs = await context.prisma.cashFlowObservation.create({
        data: {
          cashFlowId: testCashFlow.id,
          observation: 'To delete',
          companyId: context.testCompany.id,
          createdBy: context.testUser.id,
        },
      });

      await authenticatedRequest(context.app, context.mainUserToken)
        .delete(`/cash-flow-observations/${obs.id}`)
        .expect(200);
    });
  });
});
