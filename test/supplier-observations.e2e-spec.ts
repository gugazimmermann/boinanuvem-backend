import {
  setupE2ETest,
  teardownE2ETest,
  authenticatedRequest,
  E2ETestContext,
} from './e2e-test-helpers';

describe('Supplier Observations Management Flow (e2e)', () => {
  let context: E2ETestContext;
  let testSupplier: any;

  beforeAll(async () => {
    context = await setupE2ETest({
      companyName: 'Supplier Observations Test Company',
      email: 'supplier-obs@testcompany.com',
      cnpj: '11.222.333/0001-21',
      planName: 'Avançado',
      isTrial: true,
      createSupplier: true,
    });
    testSupplier = context.testSupplier;
  });

  afterAll(async () => {
    await teardownE2ETest(context);
  });

  describe('POST /suppliers/:supplierId/observations', () => {
    it('should create an observation successfully', async () => {
      const response = await authenticatedRequest(
        context.app,
        context.mainUserToken,
      )
        .post(`/suppliers/${testSupplier.id}/observations`)
        .send({ observation: 'Test observation' })
        .expect(201);

      expect(response.body.supplierId).toBe(testSupplier.id);
    });
  });

  describe('GET /suppliers/:supplierId/observations', () => {
    it('should return all observations', async () => {
      await context.prisma.supplierObservation.createMany({
        data: [
          {
            supplierId: testSupplier.id,
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
        .get(`/suppliers/${testSupplier.id}/observations`)
        .expect(200);

      expect(response.body.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('GET /supplier-observations/:id', () => {
    it('should return observation by id', async () => {
      const obs = await context.prisma.supplierObservation.create({
        data: {
          supplierId: testSupplier.id,
          observation: 'Test',
          companyId: context.testCompany.id,
          createdBy: context.testUser.id,
        },
      });

      const response = await authenticatedRequest(
        context.app,
        context.mainUserToken,
      )
        .get(`/supplier-observations/${obs.id}`)
        .expect(200);

      expect(response.body.id).toBe(obs.id);
    });
  });

  describe('PUT /supplier-observations/:id', () => {
    it('should update observation', async () => {
      const obs = await context.prisma.supplierObservation.create({
        data: {
          supplierId: testSupplier.id,
          observation: 'Original',
          companyId: context.testCompany.id,
          createdBy: context.testUser.id,
        },
      });

      const response = await authenticatedRequest(
        context.app,
        context.mainUserToken,
      )
        .put(`/supplier-observations/${obs.id}`)
        .send({ observation: 'Updated' })
        .expect(200);

      expect(response.body.observation).toBe('Updated');
    });
  });

  describe('DELETE /supplier-observations/:id', () => {
    it('should delete observation', async () => {
      const obs = await context.prisma.supplierObservation.create({
        data: {
          supplierId: testSupplier.id,
          observation: 'To delete',
          companyId: context.testCompany.id,
          createdBy: context.testUser.id,
        },
      });

      await authenticatedRequest(context.app, context.mainUserToken)
        .delete(`/supplier-observations/${obs.id}`)
        .expect(200);
    });
  });
});
