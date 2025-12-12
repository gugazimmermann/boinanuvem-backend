import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

/**
 * Integration test helpers for common setup and teardown patterns
 */

export interface IntegrationTestContext {
  prisma: PrismaClient;
  testCompany: any;
  testProperty?: any;
  testUser: any;
  [key: string]: any;
}

export interface IntegrationTestOptions {
  cnpj: string;
  companyName: string;
  email: string;
  userEmail?: string;
  createProperty?: boolean;
  createBuyer?: boolean;
  createAnimals?: number;
  createEmployees?: number;
  createServiceProviders?: number;
  createSupplier?: boolean;
}

/**
 * Create a Prisma client for integration tests
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
 * Setup integration test context with company, property, and user
 */
export async function setupIntegrationTest(
  options: IntegrationTestOptions,
): Promise<IntegrationTestContext> {
  const prisma = createTestPrismaClient();
  await prisma.$connect();

  // Clean up any existing test company first
  await prisma.company
    .deleteMany({
      where: { cnpj: options.cnpj },
    })
    .catch(() => {});

  const testCompany = await prisma.company.create({
    data: {
      cnpj: options.cnpj,
      companyName: options.companyName,
      email: options.email,
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

  const context: IntegrationTestContext = {
    prisma,
    testCompany,
    testUser: null,
  };

  // Create property if requested
  if (options.createProperty) {
    context.testProperty = await prisma.property.create({
      data: {
        code: '001',
        name: 'Test Property',
        area: { value: 100, type: 'hectares' },
        status: 'active',
        companyId: testCompany.id,
        street: 'Test Street',
        number: '123',
        neighborhood: 'Test Neighborhood',
        city: 'Test City',
        state: 'SC',
        zipCode: '88395-000',
      },
    });
  }

  // Create user
  const hashedPassword = await bcrypt.hash('password123', 10);
  const userEmail =
    options.userEmail ||
    `user-${options.email.split('@')[0]}@${options.email.split('@')[1]}`;
  context.testUser = await prisma.user.create({
    data: {
      name: 'Test User',
      email: userEmail,
      phone: '(47) 99999-8888',
      password: hashedPassword,
      companyId: testCompany.id,
      mainUser: true,
      status: 'active',
      emailVerifiedAt: new Date(),
      permissions: {},
    },
  });

  // Create buyer if requested
  if (options.createBuyer && context.testProperty) {
    context.testBuyer = await prisma.buyer.create({
      data: {
        code: '001',
        name: 'Test Buyer',
        companyId: testCompany.id,
        properties: {
          create: {
            propertyId: context.testProperty.id,
          },
        },
      },
    });
  }

  // Create animals if requested
  if (
    options.createAnimals &&
    options.createAnimals > 0 &&
    context.testProperty
  ) {
    context.testAnimals = await Promise.all(
      Array.from({ length: options.createAnimals }, (_, i) =>
        prisma.animal.create({
          data: {
            code: `TEST-${String(i + 1).padStart(3, '0')}`,
            registrationNumber: `BR-2020-T${String(i + 1).padStart(4, '0')}`,
            status: 'active',
            companyId: testCompany.id,
            propertyId: context.testProperty.id,
          },
        }),
      ),
    );
  }

  // Create employees if requested
  if (options.createEmployees && options.createEmployees > 0) {
    context.testEmployees = await Promise.all(
      Array.from({ length: options.createEmployees }, (_, i) =>
        prisma.employee.create({
          data: {
            code: `EMP-${String(i + 1).padStart(3, '0')}`,
            name: `Employee ${i + 1}`,
            companyId: testCompany.id,
          },
        }),
      ),
    );
  }

  // Create service providers if requested
  if (options.createServiceProviders && options.createServiceProviders > 0) {
    context.testServiceProviders = await Promise.all(
      Array.from({ length: options.createServiceProviders }, (_, i) =>
        prisma.serviceProvider.create({
          data: {
            code: `SP-${String(i + 1).padStart(3, '0')}`,
            name: `Service Provider ${i + 1}`,
            companyId: testCompany.id,
          },
        }),
      ),
    );
  }

  // Create supplier if requested
  if (options.createSupplier) {
    context.testSupplier = await prisma.supplier.create({
      data: {
        code: '001',
        name: 'Test Supplier',
        companyId: testCompany.id,
      },
    });
  }

  return context;
}

/**
 * Teardown integration test context
 */
export async function teardownIntegrationTest(
  context: IntegrationTestContext,
  cleanupOptions?: {
    tables?: string[];
    customCleanup?: (prisma: PrismaClient, companyId: string) => Promise<void>;
  },
): Promise<void> {
  const { prisma, testCompany } = context;

  // Custom cleanup if provided
  if (cleanupOptions?.customCleanup) {
    await cleanupOptions.customCleanup(prisma, testCompany.id);
  }

  // Clean up common tables
  const tablesToClean = cleanupOptions?.tables || [];

  // Clean up in reverse dependency order
  for (const table of tablesToClean.reverse()) {
    try {
      await (prisma as any)[table].deleteMany({
        where: { companyId: testCompany.id },
      });
    } catch {
      // Ignore if table doesn't exist
    }
  }

  // Clean up standard entities
  try {
    await prisma.user.deleteMany({
      where: { companyId: testCompany.id },
    });
  } catch {
    // Ignore
  }

  try {
    await prisma.property.deleteMany({
      where: { companyId: testCompany.id },
    });
  } catch {
    // Ignore
  }

  try {
    await prisma.company.deleteMany({
      where: { id: testCompany.id },
    });
  } catch {
    // Ignore
  }

  if (prisma) {
    await prisma.$disconnect();
  }
}

/**
 * Create a testing module for a service with PrismaService mock
 */
export async function createServiceTestingModule<T>(
  ServiceClass: new (...args: any[]) => T,
  prisma: PrismaClient,
): Promise<TestingModule> {
  return Test.createTestingModule({
    providers: [
      ServiceClass,
      {
        provide: PrismaService,
        useValue: prisma,
      },
      Logger,
    ],
  }).compile();
}

/**
 * Get service instance from testing module
 */
export function getServiceFromModule<T>(
  module: TestingModule,
  ServiceClass: new (...args: any[]) => T,
): T {
  return module.get<T>(ServiceClass);
}

/**
 * Skip integration tests if database is not available
 */
export const describeOrSkip = process.env.SKIP_INTEGRATION_TESTS
  ? describe.skip
  : describe;
