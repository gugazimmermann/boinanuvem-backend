import {
  setupE2ETest,
  teardownE2ETest,
  authenticatedRequest,
  E2ETestContext,
} from './e2e-test-helpers';

describe('Buyer Observations Management Flow (e2e)', () => {
  let context: E2ETestContext;
  let testBuyer: any;

  beforeAll(async () => {
    context = await setupE2ETest({
      companyName: 'Buyer Observations Test Company',
      email: 'buyer-obs@testcompany.com',
      cnpj: '11.222.333/0001-16',
      planName: 'Avançado',
      isTrial: true,
      createProperty: true,
      createBuyer: true,
    });
    testBuyer = context.testBuyer;
  });

  afterAll(async () => {
    await teardownE2ETest(context);
  });

  describe('POST /buyers/:buyerId/observations', () => {
    it('should create an observation successfully', async () => {
      const response = await authenticatedRequest(
        context.app,
        context.mainUserToken,
      )
        .post(`/buyers/${testBuyer.id}/observations`)
        .send({ observation: 'Test observation' })
        .expect(201);

      expect(response.body.buyerId).toBe(testBuyer.id);
      expect(response.body.observation).toBe('Test observation');
    });
  });

  describe('GET /buyers/:buyerId/observations', () => {
    it('should return all observations', async () => {
      await context.prisma.buyerObservation.createMany({
        data: [
          {
            buyerId: testBuyer.id,
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
        .get(`/buyers/${testBuyer.id}/observations`)
        .expect(200);

      expect(response.body.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('GET /buyer-observations/:id', () => {
    it('should return observation by id', async () => {
      const obs = await context.prisma.buyerObservation.create({
        data: {
          buyerId: testBuyer.id,
          observation: 'Test',
          companyId: context.testCompany.id,
          createdBy: context.testUser.id,
        },
      });

      const response = await authenticatedRequest(
        context.app,
        context.mainUserToken,
      )
        .get(`/buyer-observations/${obs.id}`)
        .expect(200);

      expect(response.body.id).toBe(obs.id);
    });
  });

  describe('PUT /buyer-observations/:id', () => {
    it('should update observation', async () => {
      const obs = await context.prisma.buyerObservation.create({
        data: {
          buyerId: testBuyer.id,
          observation: 'Original',
          companyId: context.testCompany.id,
          createdBy: context.testUser.id,
        },
      });

      const response = await authenticatedRequest(
        context.app,
        context.mainUserToken,
      )
        .put(`/buyer-observations/${obs.id}`)
        .send({ observation: 'Updated' })
        .expect(200);

      expect(response.body.observation).toBe('Updated');
    });
  });

  describe('DELETE /buyer-observations/:id', () => {
    it('should delete observation', async () => {
      const obs = await context.prisma.buyerObservation.create({
        data: {
          buyerId: testBuyer.id,
          observation: 'To delete',
          companyId: context.testCompany.id,
          createdBy: context.testUser.id,
        },
      });

      await authenticatedRequest(context.app, context.mainUserToken)
        .delete(`/buyer-observations/${obs.id}`)
        .expect(200);
    });
  });
});
