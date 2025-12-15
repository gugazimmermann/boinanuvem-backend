import { AnimalObservationsService } from './animal-observations.service';
import { CreateAnimalObservationDto, UpdateAnimalObservationDto } from './dto';
import {
  describeOrSkip,
  setupIntegrationTest,
  teardownIntegrationTest,
  createServiceTestingModule,
  getServiceFromModule,
  IntegrationTestContext,
} from '../../test/integration-test-helpers';

describeOrSkip('AnimalObservationsService Integration Tests', () => {
  let service: AnimalObservationsService;
  let context: IntegrationTestContext;
  let testAnimal: any;

  beforeAll(async () => {
    context = await setupIntegrationTest({
      cnpj: '11.222.333/0001-05',
      companyName: 'Test Animal Observations Company',
      email: 'animal-obs@testcompany.com',
      userEmail: 'user-animal-obs@testcompany.com',
      createProperty: true,
      createAnimals: 1,
    });
    testAnimal = context.testAnimals?.[0];
  });

  afterAll(async () => {
    await teardownIntegrationTest(context, {
      tables: ['animalObservation', 'animal'],
    });
  });

  beforeEach(async () => {
    const module = await createServiceTestingModule(
      AnimalObservationsService,
      context.prisma,
    );
    service = getServiceFromModule(module, AnimalObservationsService);

    await context.prisma.animalObservation.deleteMany({
      where: { companyId: context.testCompany.id },
    });
  });

  afterEach(async () => {
    await context.prisma.animalObservation.deleteMany({
      where: { companyId: context.testCompany.id },
    });
  });

  describe('create with real database', () => {
    it('should create an observation successfully', async () => {
      const createDto: CreateAnimalObservationDto = {
        observation: 'Test observation',
        fileIds: ['file-1', 'file-2'],
      };

      const result = await service.create(
        context.testUser.id,
        testAnimal.id,
        createDto,
      );

      expect(result).toMatchObject({
        animalId: testAnimal.id,
        observation: 'Test observation',
        companyId: context.testCompany.id,
        createdBy: context.testUser.id,
      });
      expect(result.id).toBeDefined();
      expect(result.fileIds).toEqual(['file-1', 'file-2']);
      expect(result.createdAt).toBeDefined();

      const observation = await context.prisma.animalObservation.findUnique({
        where: { id: result.id },
      });
      expect(observation).toBeDefined();
      expect(observation?.observation).toBe('Test observation');
    });

    it('should create observation without fileIds', async () => {
      const createDto: CreateAnimalObservationDto = {
        observation: 'Observation without files',
      };

      const result = await service.create(
        context.testUser.id,
        testAnimal.id,
        createDto,
      );

      expect(result.fileIds).toBeUndefined();
    });

    it('should fail if animal not found', async () => {
      const createDto: CreateAnimalObservationDto = {
        observation: 'Test',
      };

      await expect(
        service.create(context.testUser.id, 'non-existent-id', createDto),
      ).rejects.toThrow('Animal not found');
    });
  });

  describe('findAllByAnimalId with real database', () => {
    it('should return all observations for an animal', async () => {
      // Create observations sequentially to ensure different timestamps
      await context.prisma.animalObservation.create({
        data: {
          animalId: testAnimal.id,
          observation: 'Observation 1',
          companyId: context.testCompany.id,
          createdBy: context.testUser.id,
        },
      });

      // Small delay to ensure different timestamp
      await new Promise((resolve) => setTimeout(resolve, 10));

      await context.prisma.animalObservation.create({
        data: {
          animalId: testAnimal.id,
          observation: 'Observation 2',
          companyId: context.testCompany.id,
          createdBy: context.testUser.id,
        },
      });

      const result = await service.findAllByAnimalId(
        context.testUser.id,
        testAnimal.id,
      );

      expect(result.length).toBe(2);
      expect(result[0].observation).toBe('Observation 2'); // Ordered by createdAt desc
    });

    it('should exclude soft-deleted observations', async () => {
      const obs = await context.prisma.animalObservation.create({
        data: {
          animalId: testAnimal.id,
          observation: 'To be deleted',
          companyId: context.testCompany.id,
          createdBy: context.testUser.id,
        },
      });

      await context.prisma.animalObservation.update({
        where: { id: obs.id },
        data: { deletedAt: new Date() },
      });

      const result = await service.findAllByAnimalId(
        context.testUser.id,
        testAnimal.id,
      );

      expect(result.length).toBe(0);
    });
  });

  describe('findOne with real database', () => {
    let observationId: string;

    beforeEach(async () => {
      const obs = await context.prisma.animalObservation.create({
        data: {
          animalId: testAnimal.id,
          observation: 'Test observation',
          companyId: context.testCompany.id,
          createdBy: context.testUser.id,
        },
      });
      observationId = obs.id;
    });

    it('should return observation by id', async () => {
      const result = await service.findOne(context.testUser.id, observationId);

      expect(result.id).toBe(observationId);
      expect(result.observation).toBe('Test observation');
    });

    it('should fail for non-existent observation', async () => {
      await expect(
        service.findOne(context.testUser.id, 'non-existent-id'),
      ).rejects.toThrow('Observation not found');
    });
  });

  describe('update with real database', () => {
    let observationId: string;

    beforeEach(async () => {
      const obs = await context.prisma.animalObservation.create({
        data: {
          animalId: testAnimal.id,
          observation: 'Original',
          companyId: context.testCompany.id,
          createdBy: context.testUser.id,
        },
      });
      observationId = obs.id;
    });

    it('should update observation', async () => {
      const updateDto: UpdateAnimalObservationDto = {
        observation: 'Updated observation',
      };

      const result = await service.update(
        context.testUser.id,
        observationId,
        updateDto,
      );

      expect(result.observation).toBe('Updated observation');
    });

    it('should update fileIds', async () => {
      const updateDto: UpdateAnimalObservationDto = {
        fileIds: ['new-file-1'],
      };

      const result = await service.update(
        context.testUser.id,
        observationId,
        updateDto,
      );

      expect(result.fileIds).toEqual(['new-file-1']);
    });
  });

  describe('remove with real database', () => {
    let observationId: string;

    beforeEach(async () => {
      const obs = await context.prisma.animalObservation.create({
        data: {
          animalId: testAnimal.id,
          observation: 'To delete',
          companyId: context.testCompany.id,
          createdBy: context.testUser.id,
        },
      });
      observationId = obs.id;
    });

    it('should soft delete observation', async () => {
      await service.remove(context.testUser.id, observationId);

      const deleted = await context.prisma.animalObservation.findUnique({
        where: { id: observationId },
      });
      expect(deleted?.deletedAt).toBeDefined();

      const listResult = await service.findAllByAnimalId(
        context.testUser.id,
        testAnimal.id,
      );
      expect(listResult.find((o) => o.id === observationId)).toBeUndefined();
    });
  });

  describe('Company Isolation', () => {
    let otherCompany: any;
    let otherUser: any;
    let observationId: string;

    beforeEach(async () => {
      otherCompany = await context.prisma.company.create({
        data: {
          cnpj: '99.888.777/0001-12',
          companyName: 'Other Company',
          email: 'other-obs@testcompany.com',
          phone: '(47) 99999-1111',
          street: 'Other Street',
          number: '111',
          neighborhood: 'Other',
          city: 'Other City',
          state: 'SC',
          zipCode: '88303-030',
          trialStartDate: new Date(),
          trialEndDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
          trialStatus: 'active',
        },
      });

      otherUser = await context.prisma.user.create({
        data: {
          name: 'Other User',
          email: 'other-user-obs@testcompany.com',
          phone: '(47) 99999-2222',
          password: await require('bcrypt').hash('password123', 10),
          companyId: otherCompany.id,
          mainUser: true,
          status: 'active',
          emailVerifiedAt: new Date(),
          permissions: {},
        },
      });

      const obs = await context.prisma.animalObservation.create({
        data: {
          animalId: testAnimal.id,
          observation: 'Test observation',
          companyId: context.testCompany.id,
          createdBy: context.testUser.id,
        },
      });
      observationId = obs.id;
    });

    afterEach(async () => {
      if (otherCompany?.id) {
        await context.prisma.animalObservation.deleteMany({
          where: { companyId: otherCompany.id },
        });
        await context.prisma.animal.deleteMany({
          where: { companyId: otherCompany.id },
        });
        await context.prisma.property.deleteMany({
          where: { companyId: otherCompany.id },
        });
        await context.prisma.user.deleteMany({
          where: { companyId: otherCompany.id },
        });
        await context.prisma.company.deleteMany({
          where: { id: otherCompany.id },
        });
      }
    });

    it('should not allow access to other company observations', async () => {
      await expect(
        service.findOne(otherUser.id, observationId),
      ).rejects.toThrow('Observation not found');
    });

    it('should not allow update of other company observations', async () => {
      await expect(
        service.update(otherUser.id, observationId, { observation: 'Hacked' }),
      ).rejects.toThrow('Observation not found');
    });

    it('should not allow delete of other company observations', async () => {
      await expect(service.remove(otherUser.id, observationId)).rejects.toThrow(
        'Observation not found',
      );
    });
  });
});
