import { AnimalsService } from './animals.service';
import { CreateAnimalDto } from './dto';
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
      cnpj: '11.222.333/0001-30',
      companyName: 'Test Animals Company',
      email: 'animals-int@testcompany.com',
      userEmail: 'user-animals-int@testcompany.com',
      createProperty: true,
    });
  });

  afterAll(async () => {
    await teardownIntegrationTest(context, {
      tables: ['animal', 'property'],
    });
  });

  beforeEach(async () => {
    const module = await createServiceTestingModule(
      AnimalsService,
      context.prisma,
    );
    service = getServiceFromModule(module, AnimalsService);
  });

  afterEach(async () => {
    await context.prisma.animal.deleteMany({
      where: {
        companyId: context.testCompany.id,
      },
    });
  });

  describe('create with real database', () => {
    it('should create a new animal', async () => {
      const createDto: CreateAnimalDto = {
        code: 'ANM-INT-001',
        registrationNumber: 'BR-2020-INT0001',
        status: 'active',
        propertyId: context.testProperty!.id,
      };

      const result = await service.create(context.testUser.id, createDto);

      expect(result).toBeDefined();
      expect(result.code).toBe('ANM-INT-001');
      expect(result.propertyId).toBe(context.testProperty!.id);
    });

    it('should not allow duplicate code in the same company', async () => {
      const createDto: CreateAnimalDto = {
        code: 'DUPLICATE-ANM-001',
        registrationNumber: 'BR-2020-INT0002',
        status: 'active',
        propertyId: context.testProperty!.id,
      };

      await service.create(context.testUser.id, createDto);

      await expect(
        service.create(context.testUser.id, createDto),
      ).rejects.toThrow('Animal with this code already exists');
    });

    it('should allow same code for different companies', async () => {
      // Clean any leftovers from previous runs
      await context.prisma.company.deleteMany({
        where: {
          cnpj: '22.333.444/0001-66',
        },
      });

      // Create another company
      const otherCompany = await context.prisma.company.create({
        data: {
          cnpj: '22.333.444/0001-66',
          companyName: 'Other Test Company',
          email: `other-animals-int+${Date.now()}@testcompany.com`,
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

      const hashedPassword = await require('bcrypt').hash('password123', 10);
      const otherUser = await context.prisma.user.create({
        data: {
          name: 'Other User',
          email: `other-user-animals-int+${Date.now()}@testcompany.com`,
          phone: '(47) 99999-6666',
          password: hashedPassword,
          companyId: otherCompany.id,
          mainUser: true,
          status: 'active',
          emailVerifiedAt: new Date(),
          permissions: {},
        },
      });

      const createDto1: CreateAnimalDto = {
        code: 'SAME-CODE-001',
        registrationNumber: 'BR-2020-INT0003',
        status: 'active',
        propertyId: context.testProperty!.id,
      };

      const createDto2: CreateAnimalDto = {
        code: 'SAME-CODE-001',
        registrationNumber: 'BR-2020-INT0004',
        status: 'active',
        propertyId: otherProperty.id,
      };

      // Create in first company
      const animal1 = await service.create(context.testUser.id, createDto1);
      expect(animal1.code).toBe('SAME-CODE-001');

      // Create in second company (same code should be allowed)
      const animal2 = await service.create(otherUser.id, createDto2);
      expect(animal2.code).toBe('SAME-CODE-001');
      expect(animal2.companyId).toBe(otherCompany.id);
    });
  });
});
