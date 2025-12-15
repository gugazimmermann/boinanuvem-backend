import {
  setupE2ETest,
  teardownE2ETest,
  authenticatedRequest,
  E2ETestContext,
} from './e2e-test-helpers';

describe('Service Provider Observations Management Flow (e2e)', () => {
  let context: E2ETestContext;
  let testServiceProvider: any;

  beforeAll(async () => {
    context = await setupE2ETest({
      companyName: 'Service Provider Observations Test Company',
      email: 'sp-obs@testcompany.com',
      cnpj: '11.222.333/0001-20',
      planName: 'Avançado',
      isTrial: true,
      createServiceProviders: 1,
    });
    testServiceProvider = context.testServiceProviders?.[0];
  });

  afterAll(async () => {
    await teardownE2ETest(context);
  });

  describe('POST /service-providers/:serviceProviderId/observations', () => {
    it('should create an observation successfully', async () => {
      const response = await authenticatedRequest(
        context.app,
        context.mainUserToken,
      )
        .post(`/service-providers/${testServiceProvider.id}/observations`)
        .send({ observation: 'Test observation' })
        .expect(201);

      expect(response.body.serviceProviderId).toBe(testServiceProvider.id);
    });
  });

  describe('GET /service-providers/:serviceProviderId/observations', () => {
    it('should return all observations', async () => {
      await context.prisma.serviceProviderObservation.createMany({
        data: [
          {
            serviceProviderId: testServiceProvider.id,
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
        .get(`/service-providers/${testServiceProvider.id}/observations`)
        .expect(200);

      expect(response.body.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('GET /service-provider-observations/:id', () => {
    it('should return observation by id', async () => {
      const obs = await context.prisma.serviceProviderObservation.create({
        data: {
          serviceProviderId: testServiceProvider.id,
          observation: 'Test',
          companyId: context.testCompany.id,
          createdBy: context.testUser.id,
        },
      });

      const response = await authenticatedRequest(
        context.app,
        context.mainUserToken,
      )
        .get(`/service-provider-observations/${obs.id}`)
        .expect(200);

      expect(response.body.id).toBe(obs.id);
    });
  });

  describe('PUT /service-provider-observations/:id', () => {
    it('should update observation', async () => {
      const obs = await context.prisma.serviceProviderObservation.create({
        data: {
          serviceProviderId: testServiceProvider.id,
          observation: 'Original',
          companyId: context.testCompany.id,
          createdBy: context.testUser.id,
        },
      });

      const response = await authenticatedRequest(
        context.app,
        context.mainUserToken,
      )
        .put(`/service-provider-observations/${obs.id}`)
        .send({ observation: 'Updated' })
        .expect(200);

      expect(response.body.observation).toBe('Updated');
    });
  });

  describe('DELETE /service-provider-observations/:id', () => {
    it('should delete observation', async () => {
      const obs = await context.prisma.serviceProviderObservation.create({
        data: {
          serviceProviderId: testServiceProvider.id,
          observation: 'To delete',
          companyId: context.testCompany.id,
          createdBy: context.testUser.id,
        },
      });

      await authenticatedRequest(context.app, context.mainUserToken)
        .delete(`/service-provider-observations/${obs.id}`)
        .expect(200);
    });
  });
});
