import { SupplierObservationsService } from './supplier-observations.service';
import { CreateSupplierObservationDto } from './dto';
import {
  describeOrSkip,
  setupIntegrationTest,
  teardownIntegrationTest,
  createServiceTestingModule,
  getServiceFromModule,
  IntegrationTestContext,
} from '../../test/integration-test-helpers';

describeOrSkip('SupplierObservationsService Integration Tests', () => {
  let service: SupplierObservationsService;
  let context: IntegrationTestContext;
  let testSupplier: any;

  beforeAll(async () => {
    context = await setupIntegrationTest({
      cnpj: '11.222.333/0001-11',
      companyName: 'Test Supplier Observations Company',
      email: 'supplier-obs@testcompany.com',
      userEmail: 'user-supplier-obs@testcompany.com',
      createSupplier: true,
    });
    testSupplier = context.testSupplier;
  });

  afterAll(async () => {
    await teardownIntegrationTest(context, {
      tables: ['supplierObservation', 'supplier'],
    });
  });

  beforeEach(async () => {
    const module = await createServiceTestingModule(
      SupplierObservationsService,
      context.prisma,
    );
    service = getServiceFromModule(module, SupplierObservationsService);
    await context.prisma.supplierObservation.deleteMany({
      where: { companyId: context.testCompany.id },
    });
  });

  afterEach(async () => {
    await context.prisma.supplierObservation.deleteMany({
      where: { companyId: context.testCompany.id },
    });
  });

  describe('create', () => {
    it('should create successfully', async () => {
      const createDto: CreateSupplierObservationDto = {
        observation: 'Test observation',
      };

      const result = await service.create(
        context.testUser.id,
        testSupplier.id,
        createDto,
      );

      expect(result.observation).toBe('Test observation');
      expect(result.supplierId).toBe(testSupplier.id);
    });
  });

  describe('findAllBySupplierId', () => {
    it('should return observations', async () => {
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

      const result = await service.findAllBySupplierId(
        context.testUser.id,
        testSupplier.id,
      );

      expect(result.length).toBe(1);
    });
  });

  describe('findOne', () => {
    it('should return observation', async () => {
      const obs = await context.prisma.supplierObservation.create({
        data: {
          supplierId: testSupplier.id,
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
      const obs = await context.prisma.supplierObservation.create({
        data: {
          supplierId: testSupplier.id,
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
      const obs = await context.prisma.supplierObservation.create({
        data: {
          supplierId: testSupplier.id,
          observation: 'To delete',
          companyId: context.testCompany.id,
          createdBy: context.testUser.id,
        },
      });

      await service.remove(context.testUser.id, obs.id);

      const deleted = await context.prisma.supplierObservation.findUnique({
        where: { id: obs.id },
      });
      expect(deleted?.deletedAt).toBeDefined();
    });
  });
});
