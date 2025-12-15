import {
  setupE2ETest,
  teardownE2ETest,
  authenticatedRequest,
  E2ETestContext,
} from './e2e-test-helpers';
import { createTestInventoryItem } from './test-data-factories';

describe('Inventory Observations Management Flow (e2e)', () => {
  let context: E2ETestContext;
  let testItem: any;

  beforeAll(async () => {
    context = await setupE2ETest({
      companyName: 'Inventory Observations Test Company',
      email: 'inventory-obs@testcompany.com',
      cnpj: '11.222.333/0001-18',
      planName: 'Avançado',
      isTrial: true,
      createProperty: true,
    });
    testItem = await createTestInventoryItem(context.prisma, {
      code: 'INV-001',
      name: 'Test Item',
      category: 'feed',
      unit: 'kg',
      companyId: context.testCompany.id,
    });
  });

  afterAll(async () => {
    await teardownE2ETest(context);
  });

  describe('POST /inventory-items/:itemId/observations', () => {
    it('should create an observation successfully', async () => {
      const response = await authenticatedRequest(
        context.app,
        context.mainUserToken,
      )
        .post(`/inventory-items/${testItem.id}/observations`)
        .send({ observation: 'Test observation' })
        .expect(201);

      expect(response.body.itemId).toBe(testItem.id);
    });
  });

  describe('GET /inventory-items/:itemId/observations', () => {
    it('should return all observations', async () => {
      await context.prisma.inventoryObservation.createMany({
        data: [
          {
            itemId: testItem.id,
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
        .get(`/inventory-items/${testItem.id}/observations`)
        .expect(200);

      expect(response.body.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('GET /inventory-observations/:id', () => {
    it('should return observation by id', async () => {
      const obs = await context.prisma.inventoryObservation.create({
        data: {
          itemId: testItem.id,
          observation: 'Test',
          companyId: context.testCompany.id,
          createdBy: context.testUser.id,
        },
      });

      const response = await authenticatedRequest(
        context.app,
        context.mainUserToken,
      )
        .get(`/inventory-observations/${obs.id}`)
        .expect(200);

      expect(response.body.id).toBe(obs.id);
    });
  });

  describe('PUT /inventory-observations/:id', () => {
    it('should update observation', async () => {
      const obs = await context.prisma.inventoryObservation.create({
        data: {
          itemId: testItem.id,
          observation: 'Original',
          companyId: context.testCompany.id,
          createdBy: context.testUser.id,
        },
      });

      const response = await authenticatedRequest(
        context.app,
        context.mainUserToken,
      )
        .put(`/inventory-observations/${obs.id}`)
        .send({ observation: 'Updated' })
        .expect(200);

      expect(response.body.observation).toBe('Updated');
    });
  });

  describe('DELETE /inventory-observations/:id', () => {
    it('should delete observation', async () => {
      const obs = await context.prisma.inventoryObservation.create({
        data: {
          itemId: testItem.id,
          observation: 'To delete',
          companyId: context.testCompany.id,
          createdBy: context.testUser.id,
        },
      });

      await authenticatedRequest(context.app, context.mainUserToken)
        .delete(`/inventory-observations/${obs.id}`)
        .expect(200);
    });
  });
});
