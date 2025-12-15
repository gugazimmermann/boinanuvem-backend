import {
  setupE2ETest,
  teardownE2ETest,
  authenticatedRequest,
  E2ETestContext,
} from './e2e-test-helpers';
import { AccountsPayableStatus } from '../src/accounts-payable/dto';

describe('Accounts Payable Observations Management Flow (e2e)', () => {
  let context: E2ETestContext;
  let testAccountsPayable: any;

  beforeAll(async () => {
    context = await setupE2ETest({
      companyName: 'Accounts Payable Observations Test Company',
      email: 'ap-obs@testcompany.com',
      cnpj: '11.222.333/0001-23',
      planName: 'Avançado',
      isTrial: true,
      createProperty: true,
    });
    testAccountsPayable = await context.prisma.accountsPayable.create({
      data: {
        amount: 1000.0,
        dueDate: new Date('2025-02-15'),
        description: 'Test payable',
        status: AccountsPayableStatus.UNPAID,
        companyId: context.testCompany.id,
      },
    });
  });

  afterAll(async () => {
    await teardownE2ETest(context);
  });

  describe('POST /accounts-payable-observations', () => {
    it('should create an observation successfully', async () => {
      const response = await authenticatedRequest(
        context.app,
        context.mainUserToken,
      )
        .post('/accounts-payable-observations')
        .send({
          accountsPayableId: testAccountsPayable.id,
          observation: 'Test observation',
        })
        .expect(201);

      expect(response.body.accountsPayableId).toBe(testAccountsPayable.id);
    });
  });

  describe('POST /accounts-payable/:accountsPayableId/observations', () => {
    it('should create an observation via entity route', async () => {
      const response = await authenticatedRequest(
        context.app,
        context.mainUserToken,
      )
        .post(`/accounts-payable/${testAccountsPayable.id}/observations`)
        .send({ observation: 'Test observation' })
        .expect(201);

      expect(response.body.accountsPayableId).toBe(testAccountsPayable.id);
    });
  });

  describe('GET /accounts-payable-observations', () => {
    it('should return all observations', async () => {
      await context.prisma.accountsPayableObservation.createMany({
        data: [
          {
            accountsPayableId: testAccountsPayable.id,
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
        .get('/accounts-payable-observations')
        .expect(200);

      expect(response.body.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('GET /accounts-payable/:accountsPayableId/observations', () => {
    it('should return observations for accounts payable', async () => {
      const response = await authenticatedRequest(
        context.app,
        context.mainUserToken,
      )
        .get(`/accounts-payable/${testAccountsPayable.id}/observations`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  describe('GET /accounts-payable-observations/:id', () => {
    it('should return observation by id', async () => {
      const obs = await context.prisma.accountsPayableObservation.create({
        data: {
          accountsPayableId: testAccountsPayable.id,
          observation: 'Test',
          companyId: context.testCompany.id,
          createdBy: context.testUser.id,
        },
      });

      const response = await authenticatedRequest(
        context.app,
        context.mainUserToken,
      )
        .get(`/accounts-payable-observations/${obs.id}`)
        .expect(200);

      expect(response.body.id).toBe(obs.id);
    });
  });

  describe('PUT /accounts-payable-observations/:id', () => {
    it('should update observation', async () => {
      const obs = await context.prisma.accountsPayableObservation.create({
        data: {
          accountsPayableId: testAccountsPayable.id,
          observation: 'Original',
          companyId: context.testCompany.id,
          createdBy: context.testUser.id,
        },
      });

      const response = await authenticatedRequest(
        context.app,
        context.mainUserToken,
      )
        .put(`/accounts-payable-observations/${obs.id}`)
        .send({ observation: 'Updated' })
        .expect(200);

      expect(response.body.observation).toBe('Updated');
    });
  });

  describe('DELETE /accounts-payable-observations/:id', () => {
    it('should delete observation', async () => {
      const obs = await context.prisma.accountsPayableObservation.create({
        data: {
          accountsPayableId: testAccountsPayable.id,
          observation: 'To delete',
          companyId: context.testCompany.id,
          createdBy: context.testUser.id,
        },
      });

      await authenticatedRequest(context.app, context.mainUserToken)
        .delete(`/accounts-payable-observations/${obs.id}`)
        .expect(200);
    });
  });
});
