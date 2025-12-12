import { AnimalsService } from './animals.service';
import { CreateAnimalDto, UpdateAnimalDto } from './dto';
import {
  describeOrSkip,
  setupIntegrationTest,
  teardownIntegrationTest,
  createServiceTestingModule,
  getServiceFromModule,
  IntegrationTestContext,
} from '../../test/integration-test-helpers';

describeOrSkip('AnimalsService Integration Tests', () => {
  let service: AnimalsService;
  let context: IntegrationTestContext;

  beforeAll(async () => {
    context = await setupIntegrationTest({
      cnpj: '11.222.333/0001-04',
      companyName: 'Test Animals Company',
      email: 'animals@testcompany.com',
      userEmail: 'user-animals@testcompany.com',
      createProperty: true,
    });
  });

  afterAll(async () => {
    await teardownIntegrationTest(context, {
      tables: ['animal'],
    });
  });

  beforeEach(async () => {
    const module = await createServiceTestingModule(
      AnimalsService,
      context.prisma,
    );
    service = getServiceFromModule(module, AnimalsService);

    // Clean up existing test data
    await context.prisma.animal.deleteMany({
      where: {
        companyId: context.testCompany.id,
      },
    });
  });

  afterEach(async () => {
    await context.prisma.animal.deleteMany({
      where: {
        companyId: context.testCompany.id,
      },
    });
  });

  describe('create with real database', () => {
    it('should create an animal successfully', async () => {
      const createDto: CreateAnimalDto = {
        code: '001',
        registrationNumber: 'BR-2020-FJ0001',
        status: 'active',
        propertyId: context.testProperty.id,
      };

      const result = await service.create(context.testUser.id, createDto);

      expect(result).toMatchObject({
        code: '001',
        registrationNumber: 'BR-2020-FJ0001',
        status: 'active',
        companyId: context.testCompany.id,
        propertyId: context.testProperty.id,
      });
      expect(result.id).toBeDefined();
      expect(result.createdAt).toBeDefined();

      // Verify in database
      const animal = await prisma.animal.findUnique({
        where: { id: result.id },
      });
      expect(animal).toBeDefined();
      expect(animal?.code).toBe('001');
    });

    it('should create animal with acquisition date', async () => {
      const createDto: CreateAnimalDto = {
        code: '002',
        registrationNumber: 'BR-2020-FJ0002',
        status: 'active',
        propertyId: context.testProperty.id,
        acquisitionDate: '2020-01-15',
      };

      const result = await service.create(context.testUser.id, createDto);

      expect(result.acquisitionDate).toEqual(new Date('2020-01-15'));
    });

    it('should fail with duplicate code for same company', async () => {
      const createDto: CreateAnimalDto = {
        code: '003',
        registrationNumber: 'BR-2020-FJ0003',
        status: 'active',
        propertyId: context.testProperty.id,
      };

      await service.create(testUser.id, createDto);

      // Try to create duplicate
      await expect(service.create(testUser.id, createDto)).rejects.toThrow(
        'Animal with this code already exists',
      );
    });

    it('should allow same code for different companies', async () => {
      // Create another company
      const otherCompany = await prisma.company.create({
        data: {
          cnpj: '22.333.444/0001-66',
          companyName: 'Other Test Company',
          email: 'other@testcompany.com',
          phone: '(47) 99999-7777',
          street: 'Other Street',
          number: '456',
          neighborhood: 'Other Neighborhood',
          city: 'Other City',
          state: 'SC',
          zipCode: '88303-030',
          trialStartDate: new Date(),
          trialEndDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
          trialStatus: 'active',
        },
      });

      const otherProperty = await prisma.property.create({
        data: {
          code: '001',
          name: 'Other Property',
          area: { value: 100, type: 'hectares' },
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

      const otherUser = await prisma.user.create({
        data: {
          name: 'Other User',
          email: 'other-user@testcompany.com',
          phone: '(47) 99999-6666',
          password: await require('bcrypt').hash('password123', 10),
          companyId: otherCompany.id,
          mainUser: true,
          status: 'active',
          emailVerifiedAt: new Date(),
          permissions: {},
        },
      });

      const createDto1: CreateAnimalDto = {
        code: 'DUPLICATE-001',
        registrationNumber: 'BR-2020-FJ0001',
        status: 'active',
        propertyId: context.testProperty.id,
      };

      const createDto2: CreateAnimalDto = {
        code: 'DUPLICATE-001',
        registrationNumber: 'BR-2020-FJ0002',
        status: 'active',
        propertyId: otherProperty.id,
      };

      // Create in first company
      await service.create(testUser.id, createDto1);

      // Create with same code in second company (should succeed)
      const result = await service.create(otherUser.id, createDto2);
      expect(result.code).toBe('DUPLICATE-001');

      // Cleanup
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
    });

    it('should fail if property does not exist', async () => {
      const createDto: CreateAnimalDto = {
        code: '004',
        registrationNumber: 'BR-2020-FJ0004',
        status: 'active',
        propertyId: 'non-existent-property-id',
      };

      await expect(service.create(testUser.id, createDto)).rejects.toThrow(
        'Property not found',
      );
    });

    it('should fail if property belongs to different company', async () => {
      // Create another company
      const otherCompany = await prisma.company.create({
        data: {
          cnpj: '33.444.555/0001-77',
          companyName: 'Another Test Company',
          email: 'another@testcompany.com',
          phone: '(47) 99999-5555',
          street: 'Another Street',
          number: '789',
          neighborhood: 'Another Neighborhood',
          city: 'Another City',
          state: 'SC',
          zipCode: '88303-030',
          trialStartDate: new Date(),
          trialEndDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
          trialStatus: 'active',
        },
      });

      const otherProperty = await prisma.property.create({
        data: {
          code: '001',
          name: 'Another Property',
          area: { value: 100, type: 'hectares' },
          status: 'active',
          companyId: otherCompany.id,
          street: 'Another Street',
          number: '789',
          neighborhood: 'Another Neighborhood',
          city: 'Another City',
          state: 'SC',
          zipCode: '88395-000',
        },
      });

      const createDto: CreateAnimalDto = {
        code: '005',
        registrationNumber: 'BR-2020-FJ0005',
        status: 'active',
        propertyId: otherProperty.id,
      };

      await expect(service.create(testUser.id, createDto)).rejects.toThrow(
        'Property not found',
      );

      // Cleanup
      await context.prisma.property.deleteMany({
        where: { companyId: otherCompany.id },
      });
      await context.prisma.company.deleteMany({
        where: { id: otherCompany.id },
      });
    });
  });

  describe('findAll with real database', () => {
    it('should return all animals for company', async () => {
      // Create test animals
      await context.prisma.animal.createMany({
        data: [
          {
            code: '001',
            registrationNumber: 'BR-2020-FJ0001',
            status: 'active',
            companyId: context.testCompany.id,
            propertyId: context.testProperty.id,
          },
          {
            code: '002',
            registrationNumber: 'BR-2020-FJ0002',
            status: 'active',
            companyId: context.testCompany.id,
            propertyId: context.testProperty.id,
          },
          {
            code: '003',
            registrationNumber: 'BR-2020-FJ0003',
            status: 'inactive',
            companyId: context.testCompany.id,
            propertyId: context.testProperty.id,
            deletedAt: new Date(), // Soft deleted
          },
        ],
      });

      const result = await service.findAll(testUser.id);

      expect(result.length).toBe(2); // Excludes soft-deleted
      expect(result.every((a) => a.deletedAt === undefined)).toBe(true);
    });

    it('should exclude soft-deleted animals', async () => {
      await context.prisma.animal.create({
        data: {
          code: '004',
          registrationNumber: 'BR-2020-FJ0004',
          status: 'active',
          companyId: context.testCompany.id,
          propertyId: context.testProperty.id,
          deletedAt: new Date(),
        },
      });

      const result = await service.findAll(testUser.id);

      expect(result.length).toBe(0);
    });
  });

  describe('findOne with real database', () => {
    let animalId: string;

    beforeEach(async () => {
      const animal = await prisma.animal.create({
        data: {
          code: '001',
          registrationNumber: 'BR-2020-FJ0001',
          status: 'active',
          companyId: context.testCompany.id,
          propertyId: context.testProperty.id,
        },
      });
      animalId = animal.id;
    });

    it('should return an animal by id', async () => {
      const result = await service.findOne(testUser.id, animalId);

      expect(result).toMatchObject({
        id: animalId,
        code: '001',
        registrationNumber: 'BR-2020-FJ0001',
        status: 'active',
      });
    });

    it('should fail for non-existent animal', async () => {
      await expect(
        service.findOne(testUser.id, 'non-existent-id'),
      ).rejects.toThrow('Animal not found');
    });

    it('should fail for soft-deleted animal', async () => {
      await context.prisma.animal.update({
        where: { id: animalId },
        data: { deletedAt: new Date() },
      });

      await expect(service.findOne(testUser.id, animalId)).rejects.toThrow(
        'Animal not found',
      );
    });
  });

  describe('update with real database', () => {
    let animalId: string;

    beforeEach(async () => {
      const animal = await prisma.animal.create({
        data: {
          code: '001',
          registrationNumber: 'BR-2020-FJ0001',
          status: 'active',
          companyId: context.testCompany.id,
          propertyId: context.testProperty.id,
        },
      });
      animalId = animal.id;
    });

    it('should update an animal', async () => {
      const updateDto: UpdateAnimalDto = {
        registrationNumber: 'BR-2020-FJ0001-UPDATED',
        status: 'inactive',
      };

      const result = await service.update(testUser.id, animalId, updateDto);

      expect(result).toMatchObject({
        id: animalId,
        registrationNumber: 'BR-2020-FJ0001-UPDATED',
        status: 'inactive',
      });
    });

    it('should update animal code', async () => {
      const updateDto: UpdateAnimalDto = {
        code: '001-UPDATED',
      };

      const result = await service.update(testUser.id, animalId, updateDto);

      expect(result.code).toBe('001-UPDATED');
    });

    it('should fail with duplicate code in same company', async () => {
      // Create another animal
      await context.prisma.animal.create({
        data: {
          code: '002',
          registrationNumber: 'BR-2020-FJ0002',
          status: 'active',
          companyId: context.testCompany.id,
          propertyId: context.testProperty.id,
        },
      });

      const updateDto: UpdateAnimalDto = {
        code: '002',
      };

      await expect(
        service.update(testUser.id, animalId, updateDto),
      ).rejects.toThrow('Animal with this code already exists');
    });

    it('should allow updating propertyId to valid property', async () => {
      // Create another property
      const otherProperty = await prisma.property.create({
        data: {
          code: '002',
          name: 'Other Property',
          area: { value: 200, type: 'hectares' },
          status: 'active',
          companyId: context.testCompany.id,
          street: 'Other Street',
          number: '456',
          neighborhood: 'Other Neighborhood',
          city: 'Other City',
          state: 'SC',
          zipCode: '88395-000',
        },
      });

      const updateDto: UpdateAnimalDto = {
        propertyId: otherProperty.id,
      };

      const result = await service.update(testUser.id, animalId, updateDto);

      expect(result.propertyId).toBe(otherProperty.id);
    });
  });

  describe('remove with real database', () => {
    let animalId: string;

    beforeEach(async () => {
      const animal = await prisma.animal.create({
        data: {
          code: '001',
          registrationNumber: 'BR-2020-FJ0001',
          status: 'active',
          companyId: context.testCompany.id,
          propertyId: context.testProperty.id,
        },
      });
      animalId = animal.id;
    });

    it('should soft delete an animal', async () => {
      const result = await service.remove(testUser.id, animalId);

      expect(result).toEqual({
        message: 'Animal deleted successfully',
      });

      // Verify soft delete
      const deletedAnimal = await prisma.animal.findUnique({
        where: { id: animalId },
      });
      expect(deletedAnimal?.deletedAt).toBeDefined();

      // Verify it's excluded from list
      const listResult = await service.findAll(testUser.id);
      expect(listResult.find((a) => a.id === animalId)).toBeUndefined();
    });

    it('should fail for non-existent animal', async () => {
      await expect(
        service.remove(testUser.id, 'non-existent-id'),
      ).rejects.toThrow('Animal not found');
    });
  });

  describe('Company Isolation', () => {
    let otherCompany: any;
    let otherUser: any;
    let animalId: string;

    beforeEach(async () => {
      // Clean up any existing test data first (by email to catch any duplicates)
      await context.prisma.user
        .deleteMany({
          where: { email: 'isolation-user@testcompany.com' },
        })
        .catch(() => {});
      await context.prisma.company
        .deleteMany({
          where: {
            OR: [
              { cnpj: '99.888.777/0001-11' },
              { email: 'isolation@testcompany.com' },
            ],
          },
        })
        .catch(() => {});

      // Create another company
      otherCompany = await prisma.company.create({
        data: {
          cnpj: '99.888.777/0001-11',
          companyName: 'Isolation Test Company',
          email: 'isolation@testcompany.com',
          phone: '(47) 99999-4444',
          street: 'Isolation Street',
          number: '999',
          neighborhood: 'Isolation Neighborhood',
          city: 'Isolation City',
          state: 'SC',
          zipCode: '88303-030',
          trialStartDate: new Date(),
          trialEndDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
          trialStatus: 'active',
        },
      });

      await context.prisma.property.create({
        data: {
          code: '001',
          name: 'Isolation Property',
          area: { value: 100, type: 'hectares' },
          status: 'active',
          companyId: otherCompany.id,
          street: 'Isolation Street',
          number: '999',
          neighborhood: 'Isolation Neighborhood',
          city: 'Isolation City',
          state: 'SC',
          zipCode: '88395-000',
        },
      });

      otherUser = await prisma.user.create({
        data: {
          name: 'Isolation User',
          email: 'isolation-user@testcompany.com',
          phone: '(47) 99999-3333',
          password: await require('bcrypt').hash('password123', 10),
          companyId: otherCompany.id,
          mainUser: true,
          status: 'active',
          emailVerifiedAt: new Date(),
          permissions: {},
        },
      });

      // Create animal for first company
      const animal = await prisma.animal.create({
        data: {
          code: '001',
          registrationNumber: 'BR-2020-FJ0001',
          status: 'active',
          companyId: context.testCompany.id,
          propertyId: context.testProperty.id,
        },
      });
      animalId = animal.id;
    });

    afterEach(async () => {
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
    });

    it('should not allow access to other company animals', async () => {
      await expect(service.findOne(otherUser.id, animalId)).rejects.toThrow(
        'Animal not found',
      );
    });

    it('should not allow update of other company animals', async () => {
      const updateDto: UpdateAnimalDto = {
        registrationNumber: 'HACKED',
      };

      await expect(
        service.update(otherUser.id, animalId, updateDto),
      ).rejects.toThrow('Animal not found');
    });

    it('should not allow delete of other company animals', async () => {
      await expect(service.remove(otherUser.id, animalId)).rejects.toThrow(
        'Animal not found',
      );
    });
  });
});
