import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import { AppModule } from '../src/app.module';

// Type definitions for API responses
interface PlanLimits {
  properties: string;
  locations: string;
  animals: string;
  members: string;
}

interface PlanResponse {
  id: string;
  name: string;
  description: string;
  monthlyPrice: string;
  annualPrice: string;
  limits: PlanLimits;
  features: string[];
  popular: boolean;
  status: string;
  createdAt: string;
  updatedAt: string;
}

interface ApiResponse {
  body: PlanResponse[];
}

interface ErrorResponse {
  body: {
    message: string | string[];
    error?: string;
    statusCode?: number;
  };
}

// Skip e2e tests if database is not available
const describeOrSkip = process.env.SKIP_E2E_TESTS ? describe.skip : describe;

describeOrSkip('Plans API (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaClient;

  const testPlans = [
    {
      name: 'E2E Test Plan Active',
      description: 'E2E test plan - active',
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
      name: 'E2E Test Plan Popular',
      description: 'E2E test plan - popular and active',
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
      name: 'E2E Test Plan Inactive',
      description: 'E2E test plan - inactive',
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
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication({
      logger: false, // Disable NestJS logging during tests
    });

    // Apply the same validation pipe as in main.ts
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        disableErrorMessages: false, // Enable for testing
      }),
    );

    await app.init();

    // Initialize Prisma client for test data management
    const testDatabaseUrl =
      process.env.TEST_DATABASE_URL ||
      process.env.DATABASE_URL ||
      'postgresql://postgres:postgres@localhost:5432/boinanuvem_test';

    prisma = new PrismaClient({
      datasources: {
        db: {
          url: testDatabaseUrl,
        },
      },
    });

    await prisma.$connect();
  });

  beforeEach(async () => {
    // Clean up existing test data
    await prisma.plan.deleteMany({
      where: {
        name: {
          startsWith: 'E2E Test Plan',
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
          startsWith: 'E2E Test Plan',
        },
      },
    });
  });

  afterAll(async () => {
    if (prisma) {
      await prisma.$disconnect();
    }
    if (app) {
      await app.close();
    }
  });

  describe('/plans (GET)', () => {
    it('should return active plans by default', async () => {
      const response = (await request(
        app.getHttpServer() as Parameters<typeof request>[0],
      )
        .get('/plans')
        .expect(200)) as unknown as ApiResponse;

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThanOrEqual(2);

      // All returned plans should be active
      response.body.forEach((plan: PlanResponse) => {
        expect(plan.status).toBe('active');
      });

      // Should include our test plans
      const testPlanNames = response.body.map(
        (plan: PlanResponse) => plan.name,
      );
      expect(testPlanNames).toContain('E2E Test Plan Active');
      expect(testPlanNames).toContain('E2E Test Plan Popular');
      expect(testPlanNames).not.toContain('E2E Test Plan Inactive');
    });

    it('should return active plans when status=active', async () => {
      const response = (await request(
        app.getHttpServer() as Parameters<typeof request>[0],
      )
        .get('/plans?status=active')
        .expect(200)) as unknown as ApiResponse;

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThanOrEqual(2);

      response.body.forEach((plan: PlanResponse) => {
        expect(plan.status).toBe('active');
      });
    });

    it('should return inactive plans when status=inactive', async () => {
      const response = (await request(
        app.getHttpServer() as Parameters<typeof request>[0],
      )
        .get('/plans?status=inactive')
        .expect(200)) as unknown as ApiResponse;

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThanOrEqual(1);

      response.body.forEach((plan: PlanResponse) => {
        expect(plan.status).toBe('inactive');
      });

      const testPlanNames = response.body.map(
        (plan: PlanResponse) => plan.name,
      );
      expect(testPlanNames).toContain('E2E Test Plan Inactive');
    });

    it('should return all plans when status=all', async () => {
      const response = (await request(
        app.getHttpServer() as Parameters<typeof request>[0],
      )
        .get('/plans?status=all')
        .expect(200)) as unknown as ApiResponse;

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThanOrEqual(3);

      const activeCount = response.body.filter(
        (plan: PlanResponse) => plan.status === 'active',
      ).length;
      const inactiveCount = response.body.filter(
        (plan: PlanResponse) => plan.status === 'inactive',
      ).length;

      expect(activeCount).toBeGreaterThanOrEqual(2);
      expect(inactiveCount).toBeGreaterThanOrEqual(1);

      const testPlanNames = response.body.map(
        (plan: PlanResponse) => plan.name,
      );
      expect(testPlanNames).toContain('E2E Test Plan Active');
      expect(testPlanNames).toContain('E2E Test Plan Popular');
      expect(testPlanNames).toContain('E2E Test Plan Inactive');
    });

    it('should return plans ordered by popular first, then alphabetically', async () => {
      const response = (await request(
        app.getHttpServer() as Parameters<typeof request>[0],
      )
        .get('/plans?status=active')
        .expect(200)) as unknown as ApiResponse;

      const plans = response.body;
      const testPlanActive = plans.find(
        (plan: PlanResponse) => plan.name === 'E2E Test Plan Active',
      );
      const testPlanPopular = plans.find(
        (plan: PlanResponse) => plan.name === 'E2E Test Plan Popular',
      );

      expect(testPlanActive).toBeDefined();
      expect(testPlanPopular).toBeDefined();

      const activeIndex = plans.indexOf(testPlanActive as PlanResponse);
      const popularIndex = plans.indexOf(testPlanPopular as PlanResponse);

      // Popular plan should come before non-popular plan
      expect(popularIndex).toBeLessThan(activeIndex);
    });

    it('should return correct plan structure', async () => {
      const response = (await request(
        app.getHttpServer() as Parameters<typeof request>[0],
      )
        .get('/plans?status=active')
        .expect(200)) as unknown as ApiResponse;

      expect(response.body.length).toBeGreaterThan(0);

      const plan = response.body[0];
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

      // Verify data types
      expect(typeof plan.id).toBe('string');
      expect(typeof plan.name).toBe('string');
      expect(typeof plan.description).toBe('string');
      expect(typeof plan.monthlyPrice).toBe('string');
      expect(typeof plan.annualPrice).toBe('string');
      expect(typeof plan.popular).toBe('boolean');
      expect(typeof plan.status).toBe('string');
    });

    it('should return 400 for invalid status parameter', async () => {
      const response = (await request(
        app.getHttpServer() as Parameters<typeof request>[0],
      )
        .get('/plans?status=invalid')
        .expect(400)) as unknown as ErrorResponse;

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toEqual(
        expect.arrayContaining([expect.stringContaining('status')]),
      );
    });

    it('should handle multiple query parameters correctly', async () => {
      await request(app.getHttpServer() as Parameters<typeof request>[0])
        .get('/plans?status=active&extra=ignored')
        .expect(400); // Should fail due to forbidNonWhitelisted: true
    });

    it('should return empty array when no plans match filter', async () => {
      // Delete all test plans
      await prisma.plan.deleteMany({
        where: {
          name: {
            startsWith: 'E2E Test Plan',
          },
        },
      });

      // Create a plan with different status
      await prisma.plan.create({
        data: {
          ...testPlans[0],
          name: 'E2E Test Plan Draft',
          status: 'draft',
        },
      });

      const response = (await request(
        app.getHttpServer() as Parameters<typeof request>[0],
      )
        .get('/plans?status=inactive')
        .expect(200)) as unknown as ApiResponse;

      // Should return empty array or only non-test plans
      const testPlansInResponse = response.body.filter((plan: PlanResponse) =>
        plan.name.startsWith('E2E Test Plan'),
      );
      expect(testPlansInResponse.length).toBe(0);

      // Clean up
      await prisma.plan.deleteMany({
        where: {
          name: 'E2E Test Plan Draft',
        },
      });
    });

    it('should handle case-sensitive status parameter', async () => {
      await request(app.getHttpServer() as Parameters<typeof request>[0])
        .get('/plans?status=Active')
        .expect(400);

      await request(app.getHttpServer() as Parameters<typeof request>[0])
        .get('/plans?status=ACTIVE')
        .expect(400);
    });

    it('should set correct content-type header', async () => {
      const response = await request(
        app.getHttpServer() as Parameters<typeof request>[0],
      )
        .get('/plans')
        .expect(200);

      expect(response.headers['content-type']).toMatch(/application\/json/);
    });
  });
});
