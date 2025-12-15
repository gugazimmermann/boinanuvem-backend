import { InventoryObservationsService } from './inventory-observations.service';
import { CreateInventoryObservationDto } from './dto';
import {
  describeOrSkip,
  setupIntegrationTest,
  teardownIntegrationTest,
  createServiceTestingModule,
  getServiceFromModule,
  IntegrationTestContext,
} from '../../test/integration-test-helpers';
import { createTestInventoryItem } from '../../test/test-data-factories';

describeOrSkip('InventoryObservationsService Integration Tests', () => {
  let service: InventoryObservationsService;
  let context: IntegrationTestContext;
  let testItem: any;

  beforeAll(async () => {
    context = await setupIntegrationTest({
      cnpj: '11.222.333/0001-08',
      companyName: 'Test Inventory Observations Company',
      email: 'inventory-obs@testcompany.com',
      userEmail: 'user-inventory-obs@testcompany.com',
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
    await teardownIntegrationTest(context, {
      tables: ['inventoryObservation', 'inventoryItem'],
    });
  });

  beforeEach(async () => {
    const module = await createServiceTestingModule(
      InventoryObservationsService,
      context.prisma,
    );
    service = getServiceFromModule(module, InventoryObservationsService);
    await context.prisma.inventoryObservation.deleteMany({
      where: { companyId: context.testCompany.id },
    });
  });

  afterEach(async () => {
    await context.prisma.inventoryObservation.deleteMany({
      where: { companyId: context.testCompany.id },
    });
  });

  describe('create', () => {
    it('should create successfully', async () => {
      const createDto: CreateInventoryObservationDto = {
        observation: 'Test observation',
      };

      const result = await service.create(
        context.testUser.id,
        testItem.id,
        createDto,
      );

      expect(result.observation).toBe('Test observation');
      expect(result.itemId).toBe(testItem.id);
    });
  });

  describe('findAllByItemId', () => {
    it('should return observations', async () => {
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

      const result = await service.findAllByItemId(
        context.testUser.id,
        testItem.id,
      );

      expect(result.length).toBe(1);
    });
  });

  describe('findOne', () => {
    it('should return observation', async () => {
      const obs = await context.prisma.inventoryObservation.create({
        data: {
          itemId: testItem.id,
          observation: 'Test',
          companyId: context.testCompany.id,
          createdBy: context.testUser.id,
        },
      });

      const result = await service.findOne(context.testUser.id, obs.id);

      expect(result.id).toBe(obs.id);
    });
  });

  describe('update', () => {
    it('should update successfully', async () => {
      const obs = await context.prisma.inventoryObservation.create({
        data: {
          itemId: testItem.id,
          observation: 'Original',
          companyId: context.testCompany.id,
          createdBy: context.testUser.id,
        },
      });

      const result = await service.update(context.testUser.id, obs.id, {
        observation: 'Updated',
      });

      expect(result.observation).toBe('Updated');
    });
  });

  describe('remove', () => {
    it('should soft delete', async () => {
      const obs = await context.prisma.inventoryObservation.create({
        data: {
          itemId: testItem.id,
          observation: 'To delete',
          companyId: context.testCompany.id,
          createdBy: context.testUser.id,
        },
      });

      await service.remove(context.testUser.id, obs.id);

      const deleted = await context.prisma.inventoryObservation.findUnique({
        where: { id: obs.id },
      });
      expect(deleted?.deletedAt).toBeDefined();
    });
  });
});
