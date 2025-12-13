import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

/**
 * Test utilities for database operations and test setup
 */

/**
 * Create a Prisma client configured for testing
 */
export function createTestPrismaClient(): PrismaClient {
  const testDatabaseUrl =
    process.env.TEST_DATABASE_URL ??
    process.env.DATABASE_URL ??
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
  // Start with child tables and work up to parent tables

  const testCompanyFilter = {
    OR: [
      { companyName: { contains: 'Test' } },
      { companyName: { contains: 'E2E' } },
      { companyName: { contains: 'First' } },
      { companyName: { contains: 'Second' } },
      { companyName: { contains: 'Another' } },
      { companyName: { contains: 'Other' } },
      { companyName: { contains: 'Trial' } },
      { companyName: { contains: 'Registration' } },
      { companyName: { contains: 'Update' } },
      { companyName: { contains: 'Info' } },
      { companyName: { contains: 'Existing' } },
      { companyName: { contains: 'Suppliers' } },
      { companyName: { contains: 'Sales' } },
      { companyName: { contains: 'Weighings' } },
      { companyName: { contains: 'Deaths' } },
      { companyName: { contains: 'Breedings' } },
      { companyName: { contains: 'Animals' } },
      { email: { contains: 'test' } },
      { email: { contains: 'registration' } },
      { email: { contains: 'company' } },
      { email: { contains: 'trial' } },
      { email: { contains: 'update' } },
      { email: { contains: 'info' } },
      { email: { contains: 'existing' } },
      { email: { contains: 'suppliers' } },
      { email: { contains: 'sales' } },
      { email: { contains: 'weighings' } },
      { email: { contains: 'deaths' } },
      { email: { contains: 'breedings' } },
      { email: { contains: 'animals' } },
    ],
  };

  // Clean up junction tables first
  try {
    await prisma.saleItem.deleteMany({
      where: {
        sale: { company: testCompanyFilter },
      },
    });
  } catch {
    // Ignore
  }

  try {
    await prisma.acquisitionItem.deleteMany({
      where: {
        acquisition: { company: testCompanyFilter },
      },
    });
  } catch {
    // Ignore
  }

  try {
    await prisma.employeeProperty.deleteMany({
      where: {
        property: { company: testCompanyFilter },
      },
    });
  } catch {
    // Ignore
  }

  try {
    await prisma.serviceProviderProperty.deleteMany({
      where: {
        property: { company: testCompanyFilter },
      },
    });
  } catch {
    // Ignore
  }

  try {
    await prisma.supplierProperty.deleteMany({
      where: {
        property: { company: testCompanyFilter },
      },
    });
  } catch {
    // Ignore
  }

  try {
    await prisma.buyerProperty.deleteMany({
      where: {
        property: { company: testCompanyFilter },
      },
    });
  } catch {
    // Ignore
  }

  try {
    await prisma.inventoryItemProperty.deleteMany({
      where: {
        property: { company: testCompanyFilter },
      },
    });
  } catch {
    // Ignore
  }

  // Clean up entities with foreign keys
  try {
    await prisma.refreshToken.deleteMany({
      where: {
        user: {
          OR: [
            { email: { contains: 'test' } },
            { email: { contains: 'e2e' } },
            { email: { contains: 'registration' } },
            { email: { contains: 'user' } },
            { email: { contains: 'duplicate' } },
            { email: { contains: 'company' } },
            { email: { contains: 'trial' } },
            { email: { contains: 'regular' } },
          ],
        },
      },
    });
  } catch {
    // Ignore
  }

  try {
    await prisma.emailVerification.deleteMany({
      where: {
        user: {
          OR: [
            { email: { contains: 'test' } },
            { email: { contains: 'e2e' } },
            { email: { contains: 'registration' } },
            { email: { contains: 'user' } },
            { email: { contains: 'duplicate' } },
            { email: { contains: 'company' } },
            { email: { contains: 'trial' } },
            { email: { contains: 'regular' } },
          ],
        },
      },
    });
  } catch {
    // Ignore
  }

  try {
    await prisma.passwordReset.deleteMany({
      where: {
        user: {
          OR: [
            { email: { contains: 'test' } },
            { email: { contains: 'e2e' } },
            { email: { contains: 'registration' } },
            { email: { contains: 'user' } },
            { email: { contains: 'duplicate' } },
            { email: { contains: 'company' } },
            { email: { contains: 'trial' } },
            { email: { contains: 'regular' } },
          ],
        },
      },
    });
  } catch {
    // Ignore
  }

  try {
    await prisma.companyPayment.deleteMany({
      where: { company: testCompanyFilter },
    });
  } catch {
    // Ignore
  }

  try {
    await prisma.companySubscription.deleteMany({
      where: { company: testCompanyFilter },
    });
  } catch {
    // Ignore
  }

  try {
    await prisma.sale.deleteMany({
      where: { company: testCompanyFilter },
    });
  } catch {
    // Ignore
  }

  try {
    await prisma.acquisition.deleteMany({
      where: { company: testCompanyFilter },
    });
  } catch {
    // Ignore
  }

  try {
    await prisma.death.deleteMany({
      where: { company: testCompanyFilter },
    });
  } catch {
    // Ignore
  }

  try {
    await prisma.weighing.deleteMany({
      where: { company: testCompanyFilter },
    });
  } catch {
    // Ignore
  }

  try {
    await prisma.birth.deleteMany({
      where: { company: testCompanyFilter },
    });
  } catch {
    // Ignore
  }

  try {
    await prisma.breeding.deleteMany({
      where: { company: testCompanyFilter },
    });
  } catch {
    // Ignore
  }

  try {
    await prisma.sanitaryControl.deleteMany({
      where: { company: testCompanyFilter },
    });
  } catch {
    // Ignore
  }

  try {
    await prisma.inventoryMovement.deleteMany({
      where: { company: testCompanyFilter },
    });
  } catch {
    // Ignore
  }

  try {
    await prisma.cashFlow.deleteMany({
      where: { company: testCompanyFilter },
    });
  } catch {
    // Ignore
  }

  try {
    await prisma.accountsPayable.deleteMany({
      where: { company: testCompanyFilter },
    });
  } catch {
    // Ignore
  }

  try {
    await prisma.accountsReceivable.deleteMany({
      where: { company: testCompanyFilter },
    });
  } catch {
    // Ignore
  }

  try {
    await prisma.animal.deleteMany({
      where: { company: testCompanyFilter },
    });
  } catch {
    // Ignore
  }

  try {
    await prisma.inventoryItem.deleteMany({
      where: { company: testCompanyFilter },
    });
  } catch {
    // Ignore
  }

  try {
    await prisma.bankAccount.deleteMany({
      where: { company: testCompanyFilter },
    });
  } catch {
    // Ignore
  }

  try {
    await prisma.location.deleteMany({
      where: { company: testCompanyFilter },
    });
  } catch {
    // Ignore
  }

  try {
    await prisma.employee.deleteMany({
      where: { company: testCompanyFilter },
    });
  } catch {
    // Ignore
  }

  try {
    await prisma.serviceProvider.deleteMany({
      where: { company: testCompanyFilter },
    });
  } catch {
    // Ignore
  }

  try {
    await prisma.supplier.deleteMany({
      where: { company: testCompanyFilter },
    });
  } catch {
    // Ignore
  }

  try {
    await prisma.buyer.deleteMany({
      where: { company: testCompanyFilter },
    });
  } catch {
    // Ignore
  }

  try {
    await prisma.property.deleteMany({
      where: { company: testCompanyFilter },
    });
  } catch {
    // Ignore
  }

  try {
    await prisma.user.deleteMany({
      where: {
        OR: [
          { email: { contains: 'test' } },
          { email: { contains: 'e2e' } },
          { email: { contains: 'registration' } },
          { email: { contains: 'user' } },
          { email: { contains: 'duplicate' } },
          { email: { contains: 'company' } },
          { email: { contains: 'trial' } },
          { email: { contains: 'regular' } },
          { email: { contains: 'suppliers' } },
          { email: { contains: 'sales' } },
          { email: { contains: 'weighings' } },
          { email: { contains: 'deaths' } },
          { email: { contains: 'breedings' } },
          { email: { contains: 'animals' } },
        ],
      },
    });
  } catch {
    // Ignore
  }

  try {
    await prisma.company.deleteMany({
      where: testCompanyFilter,
    });
  } catch {
    // Ignore
  }

  try {
    await prisma.plan.deleteMany({
      where: {
        OR: [
          { name: { startsWith: 'Test Plan' } },
          { name: { startsWith: 'E2E Test Plan' } },
        ],
      },
    });
  } catch {
    // Ignore
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

  // Create main user with unique email based on company email
  const hashedPassword = await bcrypt.hash('password123', 10);
  // Extract domain and create unique user email
  const emailDomain = email.split('@')[1];
  const emailPrefix = email.split('@')[0];
  // Use company email prefix to ensure uniqueness
  const userEmail = `user-${emailPrefix}@${emailDomain}`;
  const user = await prisma.user.create({
    data: {
      name: 'Test User',
      email: userEmail,
      phone: '(47) 99999-8888',
      password: hashedPassword,
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
      subscriptionId: subscriptionId ?? null,
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
      process.env.TEST_DATABASE_URL ??
      process.env.DATABASE_URL ??
      'postgresql://postgres:postgres@localhost:5432/boinanuvem_test',
  },
  app: {
    port: 3001, // Different port for testing
  },
};
