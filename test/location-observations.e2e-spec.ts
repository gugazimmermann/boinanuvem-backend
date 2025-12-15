import {
  setupE2ETest,
  teardownE2ETest,
  authenticatedRequest,
  E2ETestContext,
} from './e2e-test-helpers';

describe('Location Observations Management Flow (e2e)', () => {
  let context: E2ETestContext;
  let testLocation: any;

  beforeAll(async () => {
    context = await setupE2ETest({
      companyName: 'Location Observations Test Company',
      email: 'location-obs@testcompany.com',
      cnpj: '11.222.333/0001-19',
      planName: 'Avançado',
      isTrial: true,
      createProperty: true,
    });
    testLocation = await context.prisma.location.create({
      data: {
        code: 'LOC001',
        name: 'Test Location',
        locationType: 'pasture',
        area: { value: 100, type: 'hectares' },
        status: 'active',
        companyId: context.testCompany.id,
        propertyId: context.testProperty.id,
      },
    });
  });

  afterAll(async () => {
    await teardownE2ETest(context);
  });

  describe('POST /locations/:locationId/observations', () => {
    it('should create an observation successfully', async () => {
      const response = await authenticatedRequest(
        context.app,
        context.mainUserToken,
      )
        .post(`/locations/${testLocation.id}/observations`)
        .send({ observation: 'Test observation' })
        .expect(201);

      expect(response.body.locationId).toBe(testLocation.id);
    });
  });

  describe('GET /locations/:locationId/observations', () => {
    it('should return all observations', async () => {
      await context.prisma.locationObservation.createMany({
        data: [
          {
            locationId: testLocation.id,
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
        .get(`/locations/${testLocation.id}/observations`)
        .expect(200);

      expect(response.body.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('GET /location-observations/:id', () => {
    it('should return observation by id', async () => {
      const obs = await context.prisma.locationObservation.create({
        data: {
          locationId: testLocation.id,
          observation: 'Test',
          companyId: context.testCompany.id,
          createdBy: context.testUser.id,
        },
      });

      const response = await authenticatedRequest(
        context.app,
        context.mainUserToken,
      )
        .get(`/location-observations/${obs.id}`)
        .expect(200);

      expect(response.body.id).toBe(obs.id);
    });
  });

  describe('PUT /location-observations/:id', () => {
    it('should update observation', async () => {
      const obs = await context.prisma.locationObservation.create({
        data: {
          locationId: testLocation.id,
          observation: 'Original',
          companyId: context.testCompany.id,
          createdBy: context.testUser.id,
        },
      });

      const response = await authenticatedRequest(
        context.app,
        context.mainUserToken,
      )
        .put(`/location-observations/${obs.id}`)
        .send({ observation: 'Updated' })
        .expect(200);

      expect(response.body.observation).toBe('Updated');
    });
  });

  describe('DELETE /location-observations/:id', () => {
    it('should delete observation', async () => {
      const obs = await context.prisma.locationObservation.create({
        data: {
          locationId: testLocation.id,
          observation: 'To delete',
          companyId: context.testCompany.id,
          createdBy: context.testUser.id,
        },
      });

      await authenticatedRequest(context.app, context.mainUserToken)
        .delete(`/location-observations/${obs.id}`)
        .expect(200);
    });
  });
});
