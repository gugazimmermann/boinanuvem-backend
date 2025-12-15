import { CashFlowObservationsService } from './cash-flow-observations.service';
import { CreateCashFlowObservationDto } from './dto';
import {
  describeOrSkip,
  setupIntegrationTest,
  teardownIntegrationTest,
  createServiceTestingModule,
  getServiceFromModule,
  IntegrationTestContext,
} from '../../test/integration-test-helpers';
import {
  CashFlowType,
  CashFlowCategory,
  PaymentMethod,
} from '../cash-flow/dto';

describeOrSkip('CashFlowObservationsService Integration Tests', () => {
  let service: CashFlowObservationsService;
  let context: IntegrationTestContext;
  let testCashFlow: any;

  beforeAll(async () => {
    context = await setupIntegrationTest({
      cnpj: '11.222.333/0001-12',
      companyName: 'Test Cash Flow Observations Company',
      email: 'cf-obs@testcompany.com',
      userEmail: 'user-cf-obs@testcompany.com',
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
    await teardownIntegrationTest(context, {
      tables: ['cashFlowObservation', 'cashFlow'],
    });
  });

  beforeEach(async () => {
    const module = await createServiceTestingModule(
      CashFlowObservationsService,
      context.prisma,
    );
    service = getServiceFromModule(module, CashFlowObservationsService);
    await context.prisma.cashFlowObservation.deleteMany({
      where: { companyId: context.testCompany.id },
    });
  });

  afterEach(async () => {
    await context.prisma.cashFlowObservation.deleteMany({
      where: { companyId: context.testCompany.id },
    });
  });

  describe('create', () => {
    it('should create successfully', async () => {
      const createDto: CreateCashFlowObservationDto = {
        cashFlowId: testCashFlow.id,
        observation: 'Test observation',
      };

      const result = await service.create(context.testUser.id, createDto);

      expect(result.observation).toBe('Test observation');
      expect(result.cashFlowId).toBe(testCashFlow.id);
    });
  });

  describe('findAll', () => {
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

      const result = await service.findAll(context.testUser.id);

      expect(result.length).toBe(1);
    });
  });

  describe('findAllByCashFlowId', () => {
    it('should return observations', async () => {
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

      const result = await service.findAllByCashFlowId(
        context.testUser.id,
        testCashFlow.id,
      );

      expect(result.length).toBe(1);
    });
  });

  describe('findOne', () => {
    it('should return observation', async () => {
      const obs = await context.prisma.cashFlowObservation.create({
        data: {
          cashFlowId: testCashFlow.id,
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
      const obs = await context.prisma.cashFlowObservation.create({
        data: {
          cashFlowId: testCashFlow.id,
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
      const obs = await context.prisma.cashFlowObservation.create({
        data: {
          cashFlowId: testCashFlow.id,
          observation: 'To delete',
          companyId: context.testCompany.id,
          createdBy: context.testUser.id,
        },
      });

      await service.remove(context.testUser.id, obs.id);

      const deleted = await context.prisma.cashFlowObservation.findUnique({
        where: { id: obs.id },
      });
      expect(deleted?.deletedAt).toBeDefined();
    });
  });
});
