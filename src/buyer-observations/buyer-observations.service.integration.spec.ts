import { BuyerObservationsService } from './buyer-observations.service';
import { CreateBuyerObservationDto } from './dto';
import {
  describeOrSkip,
  setupIntegrationTest,
  teardownIntegrationTest,
  createServiceTestingModule,
  getServiceFromModule,
  IntegrationTestContext,
} from '../../test/integration-test-helpers';

describeOrSkip('BuyerObservationsService Integration Tests', () => {
  let service: BuyerObservationsService;
  let context: IntegrationTestContext;
  let testBuyer: any;

  beforeAll(async () => {
    context = await setupIntegrationTest({
      cnpj: '11.222.333/0001-06',
      companyName: 'Test Buyer Observations Company',
      email: 'buyer-obs@testcompany.com',
      userEmail: 'user-buyer-obs@testcompany.com',
      createProperty: true,
      createBuyer: true,
    });
    testBuyer = context.testBuyer;
  });

  afterAll(async () => {
    await teardownIntegrationTest(context, {
      tables: ['buyerObservation', 'buyer'],
    });
  });

  beforeEach(async () => {
    const module = await createServiceTestingModule(
      BuyerObservationsService,
      context.prisma,
    );
    service = getServiceFromModule(module, BuyerObservationsService);
    await context.prisma.buyerObservation.deleteMany({
      where: { companyId: context.testCompany.id },
    });
  });

  afterEach(async () => {
    await context.prisma.buyerObservation.deleteMany({
      where: { companyId: context.testCompany.id },
    });
  });

  describe('create', () => {
    it('should create successfully', async () => {
      const createDto: CreateBuyerObservationDto = {
        observation: 'Test observation',
        fileIds: ['file-1'],
      };

      const result = await service.create(
        context.testUser.id,
        testBuyer.id,
        createDto,
      );

      expect(result.observation).toBe('Test observation');
      expect(result.buyerId).toBe(testBuyer.id);
      expect(result.fileIds).toEqual(['file-1']);
    });
  });

  describe('findAllByBuyerId', () => {
    it('should return observations', async () => {
      await context.prisma.buyerObservation.createMany({
        data: [
          {
            buyerId: testBuyer.id,
            observation: 'Obs 1',
            companyId: context.testCompany.id,
            createdBy: context.testUser.id,
          },
          {
            buyerId: testBuyer.id,
            observation: 'Obs 2',
            companyId: context.testCompany.id,
            createdBy: context.testUser.id,
          },
        ],
      });

      const result = await service.findAllByBuyerId(
        context.testUser.id,
        testBuyer.id,
      );

      expect(result.length).toBe(2);
    });
  });

  describe('findOne', () => {
    it('should return observation', async () => {
      const obs = await context.prisma.buyerObservation.create({
        data: {
          buyerId: testBuyer.id,
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
      const obs = await context.prisma.buyerObservation.create({
        data: {
          buyerId: testBuyer.id,
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
      const obs = await context.prisma.buyerObservation.create({
        data: {
          buyerId: testBuyer.id,
          observation: 'To delete',
          companyId: context.testCompany.id,
          createdBy: context.testUser.id,
        },
      });

      await service.remove(context.testUser.id, obs.id);

      const deleted = await context.prisma.buyerObservation.findUnique({
        where: { id: obs.id },
      });
      expect(deleted?.deletedAt).toBeDefined();
    });
  });
});
