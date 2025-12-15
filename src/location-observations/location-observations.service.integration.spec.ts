import { LocationObservationsService } from './location-observations.service';
import { CreateLocationObservationDto } from './dto';
import {
  describeOrSkip,
  setupIntegrationTest,
  teardownIntegrationTest,
  createServiceTestingModule,
  getServiceFromModule,
  IntegrationTestContext,
} from '../../test/integration-test-helpers';

describeOrSkip('LocationObservationsService Integration Tests', () => {
  let service: LocationObservationsService;
  let context: IntegrationTestContext;
  let testLocation: any;

  beforeAll(async () => {
    context = await setupIntegrationTest({
      cnpj: '11.222.333/0001-09',
      companyName: 'Test Location Observations Company',
      email: 'location-obs@testcompany.com',
      userEmail: 'user-location-obs@testcompany.com',
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
    await teardownIntegrationTest(context, {
      tables: ['locationObservation', 'location'],
    });
  });

  beforeEach(async () => {
    const module = await createServiceTestingModule(
      LocationObservationsService,
      context.prisma,
    );
    service = getServiceFromModule(module, LocationObservationsService);
    await context.prisma.locationObservation.deleteMany({
      where: { companyId: context.testCompany.id },
    });
  });

  afterEach(async () => {
    await context.prisma.locationObservation.deleteMany({
      where: { companyId: context.testCompany.id },
    });
  });

  describe('create', () => {
    it('should create successfully', async () => {
      const createDto: CreateLocationObservationDto = {
        observation: 'Test observation',
      };

      const result = await service.create(
        context.testUser.id,
        testLocation.id,
        createDto,
      );

      expect(result.observation).toBe('Test observation');
      expect(result.locationId).toBe(testLocation.id);
    });
  });

  describe('findAllByLocationId', () => {
    it('should return observations', async () => {
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

      const result = await service.findAllByLocationId(
        context.testUser.id,
        testLocation.id,
      );

      expect(result.length).toBe(1);
    });
  });

  describe('findOne', () => {
    it('should return observation', async () => {
      const obs = await context.prisma.locationObservation.create({
        data: {
          locationId: testLocation.id,
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
      const obs = await context.prisma.locationObservation.create({
        data: {
          locationId: testLocation.id,
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
      const obs = await context.prisma.locationObservation.create({
        data: {
          locationId: testLocation.id,
          observation: 'To delete',
          companyId: context.testCompany.id,
          createdBy: context.testUser.id,
        },
      });

      await service.remove(context.testUser.id, obs.id);

      const deleted = await context.prisma.locationObservation.findUnique({
        where: { id: obs.id },
      });
      expect(deleted?.deletedAt).toBeDefined();
    });
  });
});
