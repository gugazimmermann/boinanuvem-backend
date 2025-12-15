import { ServiceProviderObservationsService } from './service-provider-observations.service';
import { CreateServiceProviderObservationDto } from './dto';
import {
  describeOrSkip,
  setupIntegrationTest,
  teardownIntegrationTest,
  createServiceTestingModule,
  getServiceFromModule,
  IntegrationTestContext,
} from '../../test/integration-test-helpers';

describeOrSkip('ServiceProviderObservationsService Integration Tests', () => {
  let service: ServiceProviderObservationsService;
  let context: IntegrationTestContext;
  let testServiceProvider: any;

  beforeAll(async () => {
    context = await setupIntegrationTest({
      cnpj: '11.222.333/0001-10',
      companyName: 'Test Service Provider Observations Company',
      email: 'sp-obs@testcompany.com',
      userEmail: 'user-sp-obs@testcompany.com',
      createServiceProviders: 1,
    });
    testServiceProvider = context.testServiceProviders?.[0];
  });

  afterAll(async () => {
    await teardownIntegrationTest(context, {
      tables: ['serviceProviderObservation', 'serviceProvider'],
    });
  });

  beforeEach(async () => {
    const module = await createServiceTestingModule(
      ServiceProviderObservationsService,
      context.prisma,
    );
    service = getServiceFromModule(module, ServiceProviderObservationsService);
    await context.prisma.serviceProviderObservation.deleteMany({
      where: { companyId: context.testCompany.id },
    });
  });

  afterEach(async () => {
    await context.prisma.serviceProviderObservation.deleteMany({
      where: { companyId: context.testCompany.id },
    });
  });

  describe('create', () => {
    it('should create successfully', async () => {
      const createDto: CreateServiceProviderObservationDto = {
        observation: 'Test observation',
      };

      const result = await service.create(
        context.testUser.id,
        testServiceProvider.id,
        createDto,
      );

      expect(result.observation).toBe('Test observation');
      expect(result.serviceProviderId).toBe(testServiceProvider.id);
    });
  });

  describe('findAllByServiceProviderId', () => {
    it('should return observations', async () => {
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

      const result = await service.findAllByServiceProviderId(
        context.testUser.id,
        testServiceProvider.id,
      );

      expect(result.length).toBe(1);
    });
  });

  describe('findOne', () => {
    it('should return observation', async () => {
      const obs = await context.prisma.serviceProviderObservation.create({
        data: {
          serviceProviderId: testServiceProvider.id,
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
      const obs = await context.prisma.serviceProviderObservation.create({
        data: {
          serviceProviderId: testServiceProvider.id,
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
      const obs = await context.prisma.serviceProviderObservation.create({
        data: {
          serviceProviderId: testServiceProvider.id,
          observation: 'To delete',
          companyId: context.testCompany.id,
          createdBy: context.testUser.id,
        },
      });

      await service.remove(context.testUser.id, obs.id);

      const deleted =
        await context.prisma.serviceProviderObservation.findUnique({
          where: { id: obs.id },
        });
      expect(deleted?.deletedAt).toBeDefined();
    });
  });
});
