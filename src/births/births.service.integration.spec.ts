import { BirthsService } from './births.service';
import { CreateBirthDto, UpdateBirthDto, BirthPurity } from './dto';
import {
  describeOrSkip,
  setupIntegrationTest,
  teardownIntegrationTest,
  createServiceTestingModule,
  getServiceFromModule,
  IntegrationTestContext,
} from '../../test/integration-test-helpers';

describeOrSkip('BirthsService Integration Tests', () => {
  let service: BirthsService;
  let context: IntegrationTestContext;

  beforeAll(async () => {
    context = await setupIntegrationTest({
      cnpj: '11.222.333/0001-06',
      companyName: 'Test Births Company',
      email: 'births@testcompany.com',
      userEmail: 'user-births@testcompany.com',
      createProperty: true,
    });
  });

  afterAll(async () => {
    await teardownIntegrationTest(context, {
      tables: ['birth', 'animal'],
    });
  });

  beforeEach(async () => {
    const module = await createServiceTestingModule(
      BirthsService,
      context.prisma,
    );
    service = getServiceFromModule(module, BirthsService);

    // Clean up existing test data
    await context.prisma.birth.deleteMany({
      where: {
        companyId: context.testCompany.id,
      },
    });
    await context.prisma.animal.deleteMany({
      where: {
        companyId: context.testCompany.id,
      },
    });
  });

  afterEach(async () => {
    await context.prisma.birth.deleteMany({
      where: {
        companyId: context.testCompany.id,
      },
    });
    await context.prisma.animal.deleteMany({
      where: {
        companyId: context.testCompany.id,
      },
    });
  });

  describe('create with real database', () => {
    it('should create a birth record and animal in transaction', async () => {
      const createDto: CreateBirthDto = {
        code: '001',
        registrationNumber: 'BR-2020-FJ0001',
        propertyId: context.testProperty.id,
        birthDate: '2020-01-15',
      };

      const result = await service.create(context.testUser.id, createDto);

      expect(result).toMatchObject({
        birthDate: new Date('2020-01-15'),
        companyId: context.testCompany.id,
      });
      expect(result.id).toBeDefined();
      expect(result.animalId).toBeDefined();

      // Verify animal was created
      const animal = await context.prisma.animal.findUnique({
        where: { id: result.animalId },
      });
      expect(animal).toBeDefined();
      expect(animal?.code).toBe('001');
      expect(animal?.registrationNumber).toBe('BR-2020-FJ0001');
      expect(animal?.acquisitionDate).toEqual(new Date('2020-01-15'));

      // Verify birth was created
      const birth = await context.prisma.birth.findUnique({
        where: { id: result.id },
      });
      expect(birth).toBeDefined();
      expect(birth?.animalId).toBe(result.animalId);
    });

    it('should calculate purity as PO when no parents provided', async () => {
      const createDto: CreateBirthDto = {
        code: '002',
        registrationNumber: 'BR-2020-FJ0002',
        propertyId: context.testProperty.id,
        birthDate: '2020-01-15',
      };

      const result = await service.create(context.testUser.id, createDto);

      // When no parents, purity should default to PO
      expect(result.purity).toBe(BirthPurity.PO);
    });

    it('should calculate purity when both parents are PO with same breed', async () => {
      // Create mother and father animals
      const mother = await context.prisma.animal.create({
        data: {
          code: 'MOTHER-001',
          registrationNumber: 'BR-2019-MJ0001',
          status: 'active',
          companyId: context.testCompany.id,
          propertyId: context.testProperty.id,
        },
      });

      const father = await context.prisma.animal.create({
        data: {
          code: 'FATHER-001',
          registrationNumber: 'BR-2018-MJ0002',
          status: 'active',
          companyId: context.testCompany.id,
          propertyId: context.testProperty.id,
        },
      });

      // Create birth records for parents
      await context.prisma.birth.create({
        data: {
          animalId: mother.id,
          birthDate: new Date('2019-01-15'),
          breed: 'nelore',
          gender: 'female',
          purity: BirthPurity.PO,
          companyId: context.testCompany.id,
        },
      });

      await prisma.birth.create({
        data: {
          animalId: father.id,
          birthDate: new Date('2018-01-15'),
          breed: 'nelore',
          gender: 'male',
          purity: BirthPurity.PO,
          companyId: context.testCompany.id,
        },
      });

      const createDto: CreateBirthDto = {
        code: '003',
        registrationNumber: 'BR-2020-FJ0003',
        propertyId: context.testProperty.id,
        birthDate: '2020-01-15',
        motherId: mother.id,
        fatherId: father.id,
        breed: 'nelore',
      };

      const result = await service.create(context.testUser.id, createDto);

      // Same breed PO + PO = PO
      expect(result.purity).toBe(BirthPurity.PO);
    });

    it('should calculate purity as F1 when both parents are PO with different breeds', async () => {
      // Create mother and father animals
      const mother = await context.prisma.animal.create({
        data: {
          code: 'MOTHER-002',
          registrationNumber: 'BR-2019-MJ0003',
          status: 'active',
          companyId: context.testCompany.id,
          propertyId: context.testProperty.id,
        },
      });

      const father = await context.prisma.animal.create({
        data: {
          code: 'FATHER-002',
          registrationNumber: 'BR-2018-MJ0004',
          status: 'active',
          companyId: context.testCompany.id,
          propertyId: context.testProperty.id,
        },
      });

      // Create birth records for parents
      await context.prisma.birth.create({
        data: {
          animalId: mother.id,
          birthDate: new Date('2019-01-15'),
          breed: 'nelore',
          gender: 'female',
          purity: BirthPurity.PO,
          companyId: context.testCompany.id,
        },
      });

      await prisma.birth.create({
        data: {
          animalId: father.id,
          birthDate: new Date('2018-01-15'),
          breed: 'angus',
          gender: 'male',
          purity: BirthPurity.PO,
          companyId: context.testCompany.id,
        },
      });

      const createDto: CreateBirthDto = {
        code: '004',
        registrationNumber: 'BR-2020-FJ0004',
        propertyId: context.testProperty.id,
        birthDate: '2020-01-15',
        motherId: mother.id,
        fatherId: father.id,
      };

      const result = await service.create(context.testUser.id, createDto);

      // Different breeds PO + PO = F1
      expect(result.purity).toBe(BirthPurity.F1);
    });

    it('should calculate purity when one parent is missing', async () => {
      // Create mother animal
      const mother = await prisma.animal.create({
        data: {
          code: 'MOTHER-003',
          registrationNumber: 'BR-2019-MJ0005',
          status: 'active',
          companyId: context.testCompany.id,
          propertyId: context.testProperty.id,
        },
      });

      // Create birth record for mother
      await prisma.birth.create({
        data: {
          animalId: mother.id,
          birthDate: new Date('2019-01-15'),
          breed: 'nelore',
          gender: 'female',
          purity: BirthPurity.PO,
          companyId: context.testCompany.id,
        },
      });

      const createDto: CreateBirthDto = {
        code: '005',
        registrationNumber: 'BR-2020-FJ0005',
        propertyId: context.testProperty.id,
        birthDate: '2020-01-15',
        motherId: mother.id,
      };

      const result = await service.create(context.testUser.id, createDto);

      // PO -> F1 when one parent missing
      expect(result.purity).toBe(BirthPurity.F1);
    });

    it('should fail with duplicate animal code', async () => {
      const createDto: CreateBirthDto = {
        code: '006',
        registrationNumber: 'BR-2020-FJ0006',
        propertyId: context.testProperty.id,
        birthDate: '2020-01-15',
      };

      await service.create(testUser.id, createDto);

      // Try to create duplicate
      await expect(
        service.create(context.testUser.id, createDto),
      ).rejects.toThrow('Animal with this code already exists');
    });

    it('should fail if property does not exist', async () => {
      const createDto: CreateBirthDto = {
        code: '007',
        registrationNumber: 'BR-2020-FJ0007',
        propertyId: 'non-existent-property-id',
        birthDate: '2020-01-15',
      };

      await expect(
        service.create(context.testUser.id, createDto),
      ).rejects.toThrow('Property not found');
    });

    it('should fail if mother does not belong to company', async () => {
      // Create another company
      const otherCompany = await context.prisma.company.create({
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

      const otherProperty = await context.prisma.property.create({
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

      const otherMother = await context.prisma.animal.create({
        data: {
          code: 'OTHER-MOTHER',
          registrationNumber: 'BR-2019-OTHER',
          status: 'active',
          companyId: otherCompany.id,
          propertyId: otherProperty.id,
        },
      });

      const createDto: CreateBirthDto = {
        code: '008',
        registrationNumber: 'BR-2020-FJ0008',
        propertyId: context.testProperty.id,
        birthDate: '2020-01-15',
        motherId: otherMother.id,
      };

      await expect(
        service.create(context.testUser.id, createDto),
      ).rejects.toThrow('Animal not found');

      // Cleanup
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

  describe('findByAnimalId with real database', () => {
    let animalId: string;
    let birthId: string;

    beforeEach(async () => {
      const animal = await context.prisma.animal.create({
        data: {
          code: '001',
          registrationNumber: 'BR-2020-FJ0001',
          status: 'active',
          companyId: context.testCompany.id,
          propertyId: context.testProperty.id,
        },
      });
      animalId = animal.id;

      const birth = await context.prisma.birth.create({
        data: {
          animalId: animal.id,
          birthDate: new Date('2020-01-15'),
          breed: 'nelore',
          gender: 'male',
          companyId: context.testCompany.id,
        },
      });
      birthId = birth.id;
    });

    it('should return birth by animal id', async () => {
      const result = await service.findByAnimalId(
        context.testUser.id,
        animalId,
      );

      expect(result).toMatchObject({
        id: birthId,
        animalId: animalId,
        birthDate: new Date('2020-01-15'),
      });
    });

    it('should fail for animal without birth record', async () => {
      const animalWithoutBirth = await context.prisma.animal.create({
        data: {
          code: '002',
          registrationNumber: 'BR-2020-FJ0002',
          status: 'active',
          companyId: context.testCompany.id,
          propertyId: context.testProperty.id,
        },
      });

      await expect(
        service.findByAnimalId(context.testUser.id, animalWithoutBirth.id),
      ).rejects.toThrow('Birth record not found');
    });

    it('should fail for animal from different company', async () => {
      // Create another company
      const otherCompany = await context.prisma.company.create({
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

      const otherProperty = await context.prisma.property.create({
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

      const otherAnimal = await prisma.animal.create({
        data: {
          code: 'OTHER-001',
          registrationNumber: 'BR-2020-OTHER',
          status: 'active',
          companyId: otherCompany.id,
          propertyId: otherProperty.id,
        },
      });

      await expect(
        service.findByAnimalId(context.testUser.id, otherAnimal.id),
      ).rejects.toThrow('Animal not found');

      // Cleanup
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

  describe('update with real database', () => {
    let birthId: string;

    beforeEach(async () => {
      const animal = await context.prisma.animal.create({
        data: {
          code: '001',
          registrationNumber: 'BR-2020-FJ0001',
          status: 'active',
          companyId: context.testCompany.id,
          propertyId: context.testProperty.id,
        },
      });

      const birth = await context.prisma.birth.create({
        data: {
          animalId: animal.id,
          birthDate: new Date('2020-01-15'),
          breed: 'nelore',
          gender: 'male',
          companyId: context.testCompany.id,
        },
      });
      birthId = birth.id;
    });

    it('should update a birth record', async () => {
      const updateDto: UpdateBirthDto = {
        breed: 'angus',
        gender: 'female',
      };

      const result = await service.update(
        context.testUser.id,
        birthId,
        updateDto,
      );

      expect(result).toMatchObject({
        id: birthId,
        breed: 'angus',
        gender: 'female',
      });
    });

    it('should update birth date', async () => {
      const updateDto: UpdateBirthDto = {
        birthDate: '2020-02-20',
      };

      const result = await service.update(
        context.testUser.id,
        birthId,
        updateDto,
      );

      expect(result.birthDate).toEqual(new Date('2020-02-20'));
    });

    it('should update mother and father', async () => {
      // Create mother and father animals
      const mother = await context.prisma.animal.create({
        data: {
          code: 'MOTHER-004',
          registrationNumber: 'BR-2019-MJ0006',
          status: 'active',
          companyId: context.testCompany.id,
          propertyId: context.testProperty.id,
        },
      });

      const father = await context.prisma.animal.create({
        data: {
          code: 'FATHER-004',
          registrationNumber: 'BR-2018-MJ0007',
          status: 'active',
          companyId: context.testCompany.id,
          propertyId: context.testProperty.id,
        },
      });

      const updateDto: UpdateBirthDto = {
        motherId: mother.id,
        fatherId: father.id,
      };

      const result = await service.update(
        context.testUser.id,
        birthId,
        updateDto,
      );

      expect(result.motherId).toBe(mother.id);
      expect(result.fatherId).toBe(father.id);
    });
  });

  describe('remove with real database', () => {
    let birthId: string;

    beforeEach(async () => {
      const animal = await context.prisma.animal.create({
        data: {
          code: '001',
          registrationNumber: 'BR-2020-FJ0001',
          status: 'active',
          companyId: context.testCompany.id,
          propertyId: context.testProperty.id,
        },
      });

      const birth = await context.prisma.birth.create({
        data: {
          animalId: animal.id,
          birthDate: new Date('2020-01-15'),
          breed: 'nelore',
          gender: 'male',
          companyId: context.testCompany.id,
        },
      });
      birthId = birth.id;
    });

    it('should soft delete a birth record', async () => {
      const result = await service.remove(context.testUser.id, birthId);

      expect(result).toEqual({
        message: 'Birth record deleted successfully',
      });

      // Verify soft delete
      const deletedBirth = await context.prisma.birth.findUnique({
        where: { id: birthId },
      });
      expect(deletedBirth?.deletedAt).toBeDefined();

      // Verify it's excluded from list
      const listResult = await service.findAll(context.testUser.id);
      expect(listResult.find((b) => b.id === birthId)).toBeUndefined();
    });
  });
});
