import { PrismaClient } from '@prisma/client';

/**
 * Test utilities for database operations and test setup
 */

/**
 * Create a Prisma client configured for testing
 */
export function createTestPrismaClient(): PrismaClient {
  const testDatabaseUrl =
    process.env.TEST_DATABASE_URL ||
    process.env.DATABASE_URL ||
    'postgresql://postgres:postgres@localhost:5432/boinanuvem_test';

  return new PrismaClient({
    datasources: {
      db: {
        url: testDatabaseUrl,
      },
    },
  });
}

/**
 * Clean up test data from the database
 */
export async function cleanupTestData(prisma: PrismaClient): Promise<void> {
  // Clean up plans created during testing
  await prisma.plan.deleteMany({
    where: {
      OR: [
        { name: { startsWith: 'Test Plan' } },
        { name: { startsWith: 'E2E Test Plan' } },
      ],
    },
  });
}

/**
 * Create test plans for testing purposes
 */
export async function createTestPlans(prisma: PrismaClient): Promise<void> {
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

  for (const plan of testPlans) {
    await prisma.plan.create({
      data: plan,
    });
  }
}

/**
 * Setup test database with initial data
 */
export async function setupTestDatabase(): Promise<PrismaClient> {
  const prisma = createTestPrismaClient();
  await prisma.$connect();
  await cleanupTestData(prisma);
  await createTestPlans(prisma);
  return prisma;
}

/**
 * Teardown test database
 */
export async function teardownTestDatabase(
  prisma: PrismaClient,
): Promise<void> {
  await cleanupTestData(prisma);
  await prisma.$disconnect();
}

/**
 * Mock plan data for unit tests
 */
export const mockPlanData = {
  basic: {
    id: 'plan1',
    name: 'Básico',
    description: 'Plano ideal para pequenas propriedades.',
    monthlyPrice: 'R$ 99,00',
    annualPrice: 'R$ 950,00',
    limits: {
      properties: '1 Propriedade',
      locations: '20 Localizações',
      animals: '100 Animais',
      members: '5 Membros',
    },
    features: ['Gestão de Animais', 'Controle de Localização'],
    popular: false,
    status: 'active',
    createdAt: new Date('2025-11-25T22:00:00.000Z'),
    updatedAt: new Date('2025-11-25T22:00:00.000Z'),
  },
  popular: {
    id: 'plan2',
    name: 'Padrão',
    description: 'Plano completo para propriedades em crescimento.',
    monthlyPrice: 'R$ 149,90',
    annualPrice: 'R$ 1.439,00',
    limits: {
      properties: '1 Propriedade',
      locations: 'Ilimitadas',
      animals: '500 Animais',
      members: 'Ilimitados',
    },
    features: ['Gestão de Animais', 'Controle de Localização'],
    popular: true,
    status: 'active',
    createdAt: new Date('2025-11-25T22:00:00.000Z'),
    updatedAt: new Date('2025-11-25T22:00:00.000Z'),
  },
  inactive: {
    id: 'plan3',
    name: 'Deprecated Plan',
    description: 'Old plan no longer available.',
    monthlyPrice: 'R$ 50,00',
    annualPrice: 'R$ 500,00',
    limits: {
      properties: '1 Propriedade',
      locations: '5 Localizações',
      animals: '25 Animais',
      members: '1 Membro',
    },
    features: ['Basic Features'],
    popular: false,
    status: 'inactive',
    createdAt: new Date('2025-11-25T22:00:00.000Z'),
    updatedAt: new Date('2025-11-25T22:00:00.000Z'),
  },
};

/**
 * Environment configuration for tests
 */
export const testConfig = {
  database: {
    url:
      process.env.TEST_DATABASE_URL ||
      process.env.DATABASE_URL ||
      'postgresql://postgres:postgres@localhost:5432/boinanuvem_test',
  },
  app: {
    port: 3001, // Different port for testing
  },
};
