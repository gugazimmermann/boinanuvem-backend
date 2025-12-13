import { DeathsService } from './deaths.service';
import { CreateDeathDto, UpdateDeathDto } from './dto';
import {
  describeOrSkip,
  setupIntegrationTest,
  teardownIntegrationTest,
  createServiceTestingModule,
  getServiceFromModule,
  IntegrationTestContext,
} from '../../test/integration-test-helpers';
import { createTestAnimals } from '../../test/test-data-factories';

describeOrSkip('DeathsService Integration Tests', () => {
  let service: DeathsService;
  let context: IntegrationTestContext;
  let testAnimals: any[];

  beforeAll(async () => {
    context = await setupIntegrationTest({
      cnpj: '11.222.333/0001-02',
      companyName: 'Test Deaths Company',
      email: 'deaths@testcompany.com',
      userEmail: 'user-deaths@testcompany.com',
      createProperty: true,
    });
  });

  beforeEach(async () => {
    const module = await createServiceTestingModule(
      DeathsService,
      context.prisma,
    );
    service = getServiceFromModule(module, DeathsService);

    // Clean up existing test data
    try {
      await context.prisma.death.deleteMany({
        where: {
          companyId: context.testCompany.id,
        },
      });
    } catch {
      // Ignore if table doesn't exist
    }
    await context.prisma.animal.deleteMany({
      where: {
        companyId: context.testCompany.id,
      },
    });

    // Create test animals
    testAnimals = await createTestAnimals(context.prisma, 2, {
      companyId: context.testCompany.id,
      propertyId: context.testProperty.id,
    });
    // Override the second animal with specific code
    testAnimals[1] = await context.prisma.animal.update({
      where: { id: testAnimals[1].id },
      data: {
        code: 'DEATH-002',
        registrationNumber: 'BR-2020-DT0002',
      },
    });
  });

  afterEach(async () => {
    try {
      await context.prisma.death.deleteMany({
        where: {
          companyId: context.testCompany.id,
        },
      });
    } catch {
      // Ignore if table doesn't exist
    }
    await context.prisma.animal.deleteMany({
      where: {
        companyId: context.testCompany.id,
      },
    });
  });

  afterAll(async () => {
    await teardownIntegrationTest(context, {
      tables: ['death', 'animal'],
    });
  });

  describe('create with real database', () => {
    it('should create a death and update animal status', async () => {
      const createDto: CreateDeathDto = {
        animalId: testAnimals[0].id,
        date: '2020-01-15',
        cause: 'Disease',
        observation: 'Test death',
      };

      const result = await service.create(context.testUser.id, createDto);

      expect(result).toMatchObject({
        animalId: testAnimals[0].id,
        deathDate: new Date('2020-01-15'),
        cause: 'Disease',
        observation: 'Test death',
        companyId: context.testCompany.id,
      });
      expect(result.id).toBeDefined();

      // Verify animal status changed to inactive
      const animal = await context.prisma.animal.findUnique({
        where: { id: testAnimals[0].id },
      });
      expect(animal?.status).toBe('inactive');
    });

    it('should throw ConflictException if animal already has active death', async () => {
      const createDto: CreateDeathDto = {
        animalId: testAnimals[0].id,
        date: '2020-01-15',
        cause: 'Disease',
      };

      await service.create(context.testUser.id, createDto);

      // Try to create another death for the same animal
      await expect(
        service.create(context.testUser.id, createDto),
      ).rejects.toThrow('already has a death record');
    });

    it('should restore soft-deleted death if exists', async () => {
      // Create and soft delete a death
      const death = await context.prisma.death.create({
        data: {
          animalId: testAnimals[0].id,
          deathDate: new Date('2020-01-10'),
          cause: 'Old cause',
          companyId: context.testCompany.id,
          deletedAt: new Date(),
        },
      });

      const createDto: CreateDeathDto = {
        animalId: testAnimals[0].id,
        date: '2020-01-15',
        cause: 'New cause',
      };

      await service.create(context.testUser.id, createDto);

      // Verify the death was restored, not created new
      const updatedDeath = await context.prisma.death.findUnique({
        where: { id: death.id },
      });
      expect(updatedDeath?.id).toBe(death.id);
      expect(updatedDeath?.deletedAt).toBeNull();
      expect(updatedDeath?.cause).toBe('New cause');
    });
  });

  describe('findAll', () => {
    it('should return all deaths for company', async () => {
      const createDto: CreateDeathDto = {
        animalId: testAnimals[0].id,
        date: '2020-01-15',
        cause: 'Disease',
      };

      await service.create(context.testUser.id, createDto);

      const result = await service.findAll(context.testUser.id);

      expect(result.length).toBeGreaterThan(0);
      expect(result[0].companyId).toBe(context.testCompany.id);
    });
  });

  describe('findOne', () => {
    it('should return death by ID', async () => {
      const createDto: CreateDeathDto = {
        animalId: testAnimals[0].id,
        date: '2020-01-15',
        cause: 'Disease',
      };

      const created = await service.create(context.testUser.id, createDto);
      const result = await service.findOne(context.testUser.id, created.id);

      expect(result.id).toBe(created.id);
      expect(result.companyId).toBe(context.testCompany.id);
    });
  });

  describe('findByAnimalId', () => {
    it('should return death for animal', async () => {
      const createDto: CreateDeathDto = {
        animalId: testAnimals[0].id,
        date: '2020-01-15',
        cause: 'Disease',
      };

      await service.create(context.testUser.id, createDto);
      const result = await service.findByAnimalId(
        context.testUser.id,
        testAnimals[0].id,
      );

      expect(result.animalId).toBe(testAnimals[0].id);
    });
  });

  describe('update', () => {
    it('should update death successfully', async () => {
      const createDto: CreateDeathDto = {
        animalId: testAnimals[0].id,
        date: '2020-01-15',
        cause: 'Disease',
      };

      const created = await service.create(context.testUser.id, createDto);

      const updateDto: UpdateDeathDto = {
        cause: 'Updated cause',
        observation: 'Updated observation',
      };

      const result = await service.update(
        context.testUser.id,
        created.id,
        updateDto,
      );

      expect(result.cause).toBe('Updated cause');
      expect(result.observation).toBe('Updated observation');
    });
  });

  describe('remove', () => {
    it('should soft delete death and restore animal status', async () => {
      const createDto: CreateDeathDto = {
        animalId: testAnimals[0].id,
        date: '2020-01-15',
        cause: 'Disease',
      };

      const created = await service.create(context.testUser.id, createDto);

      // Verify animal is inactive
      let animal = await context.prisma.animal.findUnique({
        where: { id: testAnimals[0].id },
      });
      expect(animal?.status).toBe('inactive');

      await service.remove(context.testUser.id, created.id);

      // Verify death is soft deleted
      const death = await context.prisma.death.findUnique({
        where: { id: created.id },
      });
      expect(death?.deletedAt).toBeDefined();

      // Verify animal status restored
      animal = await context.prisma.animal.findUnique({
        where: { id: testAnimals[0].id },
      });
      expect(animal?.status).toBe('active');
    });
  });

  describe('company isolation', () => {
    it('should not allow access to other company deaths', async () => {
      // Create another company
      const otherCompany = await context.prisma.company.create({
        data: {
          cnpj: '99.888.777/0001-66',
          companyName: 'Other Company',
          email: 'other@company.com',
          phone: '(47) 88888-8888',
          street: 'Other Street',
          number: '456',
          neighborhood: 'Other Neighborhood',
          city: 'Other City',
          state: 'SC',
          zipCode: '88303-030',
        },
      });

      const otherProperty = await context.prisma.property.create({
        data: {
          code: '001',
          name: 'Other Property',
          area: { value: 50, type: 'hectares' },
          status: 'active',
          companyId: otherCompany.id,
          street: 'Other Street',
          number: '456',
          neighborhood: 'Other Neighborhood',
          city: 'Other City',
          state: 'SC',
          zipCode: '88395-000',
        },
      });

      const otherAnimal = await context.prisma.animal.create({
        data: {
          code: 'OTHER-001',
          registrationNumber: 'BR-2020-OT0001',
          status: 'active',
          companyId: otherCompany.id,
          propertyId: otherProperty.id,
        },
      });

      const otherDeath = await context.prisma.death.create({
        data: {
          animalId: otherAnimal.id,
          deathDate: new Date('2020-01-15'),
          cause: 'Disease',
          companyId: otherCompany.id,
        },
      });

      // Try to access other company's death
      await expect(
        service.findOne(context.testUser.id, otherDeath.id),
      ).rejects.toThrow('not found');

      // Cleanup
      try {
        await context.prisma.death.deleteMany({
          where: { companyId: otherCompany.id },
        });
      } catch {
        // Ignore if table doesn't exist
      }
      await context.prisma.animal.deleteMany({
        where: { companyId: otherCompany.id },
      });
      await context.prisma.property.deleteMany({
        where: { companyId: otherCompany.id },
      });
      await context.prisma.company.deleteMany({
        where: { id: otherCompany.id },
      });
    });
  });
});
