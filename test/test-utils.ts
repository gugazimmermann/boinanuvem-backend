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
  // Clean up in order due to foreign key constraints

  // Clean up refresh tokens first (no foreign key constraints)
  try {
    await prisma.refreshToken.deleteMany({
      where: {
        user: {
          OR: [
            { email: { startsWith: 'test@' } },
            { email: { startsWith: 'e2e@' } },
          ],
        },
      },
    });
  } catch {
    console.log('RefreshToken table not found, skipping cleanup');
  }

  try {
    await prisma.companyPayment.deleteMany({
      where: {
        company: {
          OR: [
            { companyName: { startsWith: 'Test Company' } },
            { companyName: { startsWith: 'E2E Test Company' } },
          ],
        },
      },
    });
  } catch {
    // Ignore if table doesn't exist
    console.log('CompanyPayment table not found, skipping cleanup');
  }

  try {
    await prisma.companySubscription.deleteMany({
      where: {
        company: {
          OR: [
            { companyName: { startsWith: 'Test Company' } },
            { companyName: { startsWith: 'E2E Test Company' } },
          ],
        },
      },
    });
  } catch {
    // Ignore if table doesn't exist
    console.log('CompanySubscription table not found, skipping cleanup');
  }

  try {
    await prisma.user.deleteMany({
      where: {
        OR: [
          { email: { startsWith: 'test@' } },
          { email: { startsWith: 'e2e@' } },
        ],
      },
    });
  } catch {
    console.log('User table not found, skipping cleanup');
  }

  try {
    await prisma.company.deleteMany({
      where: {
        OR: [
          { companyName: { startsWith: 'Test Company' } },
          { companyName: { startsWith: 'E2E Test Company' } },
        ],
      },
    });
  } catch {
    console.log('Company table not found, skipping cleanup');
  }

  try {
    // Clean up plans created during testing
    await prisma.plan.deleteMany({
      where: {
        OR: [
          { name: { startsWith: 'Test Plan' } },
          { name: { startsWith: 'E2E Test Plan' } },
        ],
      },
    });
  } catch {
    console.log('Plan table not found, skipping cleanup');
  }
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
 * Create test company with subscription
 */
export async function createTestCompany(
  prisma: PrismaClient,
  options: {
    companyName?: string;
    email?: string;
    cnpj?: string;
    planName?: string;
    isTrial?: boolean;
  } = {},
): Promise<{
  company: any;
  user: any;
  subscription: any;
  plan: any;
}> {
  const {
    companyName = 'Test Company Ltd',
    email = 'test@company.com',
    cnpj = '12.345.678/0001-90',
    planName = 'Avançado',
    isTrial = true,
  } = options;

  // Get or create plan
  let plan = await prisma.plan.findUnique({
    where: { name: planName },
  });

  if (!plan) {
    plan = await prisma.plan.create({
      data: {
        name: planName,
        description: `Test plan - ${planName}`,
        monthlyPrice: 'R$ 149,90',
        annualPrice: 'R$ 1.439,00',
        limits: {
          properties: 'Ilimitadas',
          locations: 'Ilimitadas',
          animals: 'Ilimitados',
          members: 'Ilimitados',
        },
        features: ['All Features'],
        popular: false,
        status: 'active',
      },
    });
  }

  // Create company
  const company = await prisma.company.create({
    data: {
      cnpj,
      companyName,
      email,
      phone: '(47) 99999-9999',
      street: 'Test Street',
      number: '123',
      neighborhood: 'Test Neighborhood',
      city: 'Test City',
      state: 'SC',
      zipCode: '88303-030',
      trialStartDate: new Date(),
      trialEndDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      trialStatus: 'active',
    },
  });

  // Create main user
  const user = await prisma.user.create({
    data: {
      name: 'Test User',
      email: `user@${email.split('@')[1]}`,
      phone: '(47) 99999-8888',
      password: '$2b$12$test.hash.password',
      companyId: company.id,
      mainUser: true,
      status: 'active',
      permissions: {
        registration: {
          property: { view: true, add: true, edit: true, remove: true },
          location: { view: true, add: true, edit: true, remove: true },
          employee: { view: true, add: true, edit: true, remove: true },
          serviceProvider: { view: true, add: true, edit: true, remove: true },
          supplier: { view: true, add: true, edit: true, remove: true },
          buyer: { view: true, add: true, edit: true, remove: true },
          inventory: { view: true, add: true, edit: true, remove: true },
          animals: { view: true, add: true, edit: true, remove: true },
        },
        records: {
          births: { view: true, add: true, edit: true, remove: true },
          acquisitions: { view: true, add: true, edit: true, remove: true },
          weighings: { view: true, add: true, edit: true, remove: true },
          sales: { view: true, add: true, edit: true, remove: true },
          deaths: { view: true, add: true, edit: true, remove: true },
          sanitaryControls: { view: true, add: true, edit: true, remove: true },
          locationMovements: {
            view: true,
            add: true,
            edit: true,
            remove: true,
          },
          animalMovements: { view: true, add: true, edit: true, remove: true },
        },
        breedings: {
          breedings: { view: true, add: true, edit: true, remove: true },
          unconfirmedBreedings: {
            view: true,
            add: true,
            edit: true,
            remove: true,
          },
          pregnantCows: { view: true, add: true, edit: true, remove: true },
          reproductiveIndexes: {
            view: true,
            add: true,
            edit: true,
            remove: true,
          },
          birthForecast: { view: true, add: true, edit: true, remove: true },
        },
        finances: {
          cashFlow: { view: true, add: true, edit: true, remove: true },
          accountsPayable: { view: true, add: true, edit: true, remove: true },
          accountsReceivable: {
            view: true,
            add: true,
            edit: true,
            remove: true,
          },
          bankAccounts: { view: true, add: true, edit: true, remove: true },
        },
      },
    },
  });

  // Create subscription
  const subscription = await prisma.companySubscription.create({
    data: {
      companyId: company.id,
      planId: plan.id,
      status: isTrial ? 'trial' : 'active',
      billingCycle: 'monthly',
      isActive: true,
      isTrial,
      trialEndDate: isTrial
        ? new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
        : null,
    },
  });

  return { company, user, subscription, plan };
}

/**
 * Create test payment
 */
export async function createTestPayment(
  prisma: PrismaClient,
  companyId: string,
  subscriptionId?: string,
  options: {
    amount?: number;
    status?: string;
    dueDate?: Date;
  } = {},
): Promise<any> {
  const {
    amount = 149.9,
    status = 'pending',
    dueDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
  } = options;

  return prisma.companyPayment.create({
    data: {
      companyId,
      subscriptionId: subscriptionId || null,
      amount,
      currency: 'BRL',
      status,
      paymentMethod: 'credit_card',
      dueDate,
      description: 'Test payment',
    },
  });
}

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
