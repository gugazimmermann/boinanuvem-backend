import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PlansService } from './plans.service';
import { GetPlansQueryDto } from './dto/plan.dto';

// Skip integration tests if database is not available
const describeOrSkip = process.env.SKIP_INTEGRATION_TESTS
  ? describe.skip
  : describe;

describeOrSkip('PlansService Integration Tests', () => {
  let service: PlansService;
  let prisma: PrismaClient;

  const testPlans = [
    {
      name: 'Test Plan Active',
      description: 'Test plan for integration testing - active',
      monthlyPrice: 'R$ 99,00',
      annualPrice: 'R$ 950,00',
      limits: {
        properties: '1 Propriedade',
        locations: '10 Localizações',
        animals: '50 Animais',
        members: '2 Membros',
      },
      features: ['Feature 1', 'Feature 2'],
      popular: false,
      status: 'active',
    },
    {
      name: 'Test Plan Popular',
      description: 'Test plan for integration testing - popular',
      monthlyPrice: 'R$ 149,90',
      annualPrice: 'R$ 1.439,00',
      limits: {
        properties: '1 Propriedade',
        locations: 'Ilimitadas',
        animals: '500 Animais',
        members: 'Ilimitados',
      },
      features: ['Feature 1', 'Feature 2', 'Feature 3'],
      popular: true,
      status: 'active',
    },
    {
      name: 'Test Plan Inactive',
      description: 'Test plan for integration testing - inactive',
      monthlyPrice: 'R$ 50,00',
      annualPrice: 'R$ 500,00',
      limits: {
        properties: '1 Propriedade',
        locations: '5 Localizações',
        animals: '25 Animais',
        members: '1 Membro',
      },
      features: ['Basic Feature'],
      popular: false,
      status: 'inactive',
    },
  ];

  beforeAll(async () => {
    // Use test database URL or in-memory database for testing
    const testDatabaseUrl =
      process.env.TEST_DATABASE_URL ??
      process.env.DATABASE_URL ??
      'postgresql://postgres:postgres@localhost:5432/boinanuvem_test';

    prisma = new PrismaClient({
      datasources: {
        db: {
          url: testDatabaseUrl,
        },
      },
    });

    // Ensure database connection
    await prisma.$connect();
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PlansService, Logger],
    }).compile();

    service = module.get<PlansService>(PlansService);

    // Clean up existing test data
    await prisma.plan.deleteMany({
      where: {
        name: {
          startsWith: 'Test Plan',
        },
      },
    });

    // Insert test data
    for (const plan of testPlans) {
      await prisma.plan.create({
        data: plan,
      });
    }
  });

  afterEach(async () => {
    // Clean up test data after each test
    await prisma.plan.deleteMany({
      where: {
        name: {
          startsWith: 'Test Plan',
        },
      },
    });
  });

  afterAll(async () => {
    if (prisma) {
      await prisma.$disconnect();
    }
  });

  describe('findAll with real database', () => {
    it('should return only active plans by default', async () => {
      const query: GetPlansQueryDto = { status: 'active' };

      const result = await service.findAll(query);

      const activePlans = result.filter((plan) => plan.status === 'active');
      expect(activePlans.length).toBeGreaterThanOrEqual(2); // At least our 2 active test plans
      expect(result.every((plan) => plan.status === 'active')).toBe(true);
    });

    it('should return plans ordered by popular first, then alphabetically', async () => {
      const query: GetPlansQueryDto = { status: 'active' };

      const result = await service.findAll(query);

      // Find our test plans in the results
      const testPlanActive = result.find(
        (plan) => plan.name === 'Test Plan Active',
      );
      const testPlanPopular = result.find(
        (plan) => plan.name === 'Test Plan Popular',
      );

      expect(testPlanActive).toBeDefined();
      expect(testPlanPopular).toBeDefined();

      // Popular plan should come before non-popular plan
      const activeIndex = result.indexOf(testPlanActive!);
      const popularIndex = result.indexOf(testPlanPopular!);
      expect(popularIndex).toBeLessThan(activeIndex);
    });

    it('should return only inactive plans when status is inactive', async () => {
      const query: GetPlansQueryDto = { status: 'inactive' };

      const result = await service.findAll(query);

      expect(result.length).toBeGreaterThanOrEqual(1); // At least our 1 inactive test plan
      expect(result.every((plan) => plan.status === 'inactive')).toBe(true);

      const testPlan = result.find(
        (plan) => plan.name === 'Test Plan Inactive',
      );
      expect(testPlan).toBeDefined();
    });

    it('should return all plans when status is "all"', async () => {
      const query: GetPlansQueryDto = { status: 'all' };

      const result = await service.findAll(query);

      expect(result.length).toBeGreaterThanOrEqual(3); // At least our 3 test plans

      const activeCount = result.filter(
        (plan) => plan.status === 'active',
      ).length;
      const inactiveCount = result.filter(
        (plan) => plan.status === 'inactive',
      ).length;

      expect(activeCount).toBeGreaterThanOrEqual(2);
      expect(inactiveCount).toBeGreaterThanOrEqual(1);
    });

    it('should return plans with correct data structure', async () => {
      const query: GetPlansQueryDto = { status: 'active' };

      const result = await service.findAll(query);

      expect(result.length).toBeGreaterThan(0);

      const plan = result[0];
      expect(plan).toHaveProperty('id');
      expect(plan).toHaveProperty('name');
      expect(plan).toHaveProperty('description');
      expect(plan).toHaveProperty('monthlyPrice');
      expect(plan).toHaveProperty('annualPrice');
      expect(plan).toHaveProperty('limits');
      expect(plan).toHaveProperty('features');
      expect(plan).toHaveProperty('popular');
      expect(plan).toHaveProperty('status');
      expect(plan).toHaveProperty('createdAt');
      expect(plan).toHaveProperty('updatedAt');

      // Verify limits structure
      expect(plan.limits).toHaveProperty('properties');
      expect(plan.limits).toHaveProperty('locations');
      expect(plan.limits).toHaveProperty('animals');
      expect(plan.limits).toHaveProperty('members');

      // Verify features is an array
      expect(Array.isArray(plan.features)).toBe(true);
    });

    it('should handle empty results gracefully', async () => {
      // Delete all test plans
      await prisma.plan.deleteMany({
        where: {
          name: {
            startsWith: 'Test Plan',
          },
        },
      });

      // Create a plan with a unique status that won't match
      await prisma.plan.create({
        data: {
          ...testPlans[0],
          name: 'Test Plan Unique Status',
          status: 'draft',
        },
      });

      const query: GetPlansQueryDto = { status: 'inactive' };
      const result = await service.findAll(query);

      // Should return empty array or only non-test plans
      const testPlansInResult = result.filter((plan) =>
        plan.name.startsWith('Test Plan'),
      );
      expect(testPlansInResult.length).toBe(0);

      // Clean up
      await prisma.plan.deleteMany({
        where: {
          name: 'Test Plan Unique Status',
        },
      });
    });

    it('should handle database connection issues', async () => {
      // Create a service with an invalid database URL to simulate connection issues
      const invalidPrisma = new PrismaClient({
        datasources: {
          db: {
            url: 'postgresql://invalid:invalid@nonexistent:5432/nonexistent',
          },
        },
      });

      // Create a temporary service instance with invalid connection
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          PlansService,
          Logger,
          {
            provide: PrismaClient,
            useValue: invalidPrisma,
          },
        ],
      }).compile();

      const invalidService = module.get<PlansService>(PlansService);

      // Replace the service's prisma instance with the invalid one
      Object.defineProperty(invalidService, 'prisma', {
        value: invalidPrisma,
        writable: true,
        configurable: true,
      });

      const query: GetPlansQueryDto = { status: 'active' };

      // This should throw an error due to invalid connection
      await expect(invalidService.findAll(query)).rejects.toThrow();

      // Clean up
      await invalidPrisma.$disconnect();
    });
  });
});
