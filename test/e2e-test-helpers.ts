import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/common/services/prisma.service';
import { EmailService } from '../src/email/email.service';
import { createTestCompany, cleanupTestData } from './test-utils';

/**
 * E2E test helpers for common app initialization and auth patterns
 */

export interface E2ETestContext {
  app: INestApplication;
  prisma: PrismaService;
  testCompany: any;
  testUser: any;
  mainUserToken: string;
  authToken?: string;
  [key: string]: any;
}

export interface E2ETestOptions {
  companyName?: string;
  email?: string;
  cnpj?: string;
  planName?: string;
  isTrial?: boolean;
  createProperty?: boolean;
  createBuyer?: boolean;
  createAnimals?: number;
  createEmployees?: number;
  createServiceProviders?: number;
  createRegularUser?: boolean;
  regularUserPermissions?: any;
}

/**
 * Mock EmailService for e2e tests
 */
export const mockEmailService = {
  sendEmailVerification: jest.fn().mockResolvedValue(undefined),
  sendPasswordReset: jest.fn().mockResolvedValue(undefined),
  sendWelcomeEmail: jest.fn().mockResolvedValue(undefined),
  sendTeamMemberInvitation: jest.fn().mockResolvedValue(undefined),
  sendEmail: jest.fn().mockResolvedValue(undefined),
};

/**
 * Create a test NestJS application with common setup
 */
export async function createTestApp(): Promise<{
  app: INestApplication;
  prisma: PrismaService;
}> {
  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  })
    .overrideProvider(EmailService)
    .useValue(mockEmailService)
    .compile();

  const app = moduleFixture.createNestApplication();
  const prisma = moduleFixture.get<PrismaService>(PrismaService);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  await app.init();

  return { app, prisma };
}

/**
 * Setup e2e test context with company, user, and auth tokens
 */
export async function setupE2ETest(
  options: E2ETestOptions = {},
): Promise<E2ETestContext> {
  const { app, prisma } = await createTestApp();

  await cleanupTestData(prisma);

  const testData = await createTestCompany(prisma, {
    companyName: options.companyName || 'E2E Test Company',
    email: options.email || 'e2e@testcompany.com',
    cnpj: options.cnpj || '11.222.333/0001-55',
    planName: options.planName || 'Avançado',
    isTrial: options.isTrial !== undefined ? options.isTrial : true,
  });

  const testCompany = testData.company;
  const testUser = testData.user;

  // Activate user
  await prisma.user.update({
    where: { id: testUser.id },
    data: {
      status: 'active',
      emailVerifiedAt: new Date(),
    },
  });

  // Login to get main user token
  const loginResponse = await request(app.getHttpServer())
    .post('/auth/login')
    .send({
      email: testUser.email,
      password: 'password123',
    })
    .expect(200);

  const mainUserToken = loginResponse.body.access_token;

  const context: E2ETestContext = {
    app,
    prisma,
    testCompany,
    testUser,
    mainUserToken,
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
            code: `E2E-${String(i + 1).padStart(3, '0')}`,
            registrationNumber: `BR-2020-E${String(i + 1).padStart(4, '0')}`,
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

  // Create regular user with limited permissions if requested
  if (options.createRegularUser) {
    const hashedPassword = await require('bcrypt').hash('password123', 10);
    const regularUser = await prisma.user.create({
      data: {
        name: 'Regular User',
        email: 'regular@testcompany.com',
        phone: '(47) 88888-8888',
        password: hashedPassword,
        companyId: testCompany.id,
        mainUser: false,
        status: 'active',
        emailVerifiedAt: new Date(),
        permissions: options.regularUserPermissions || {
          records: {
            sales: {
              view: true,
              add: false,
              edit: false,
              remove: false,
            },
          },
        },
      },
    });

    const regularLoginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: regularUser.email,
        password: 'password123',
      })
      .expect(200);

    context.authToken = regularLoginResponse.body.access_token;
    context.regularUser = regularUser;
  }

  return context;
}

/**
 * Teardown e2e test context
 */
export async function teardownE2ETest(context: E2ETestContext): Promise<void> {
  const { app, prisma } = context;

  await cleanupTestData(prisma);

  if (app) {
    await app.close();
  }
}

/**
 * Make authenticated request helper
 */
export function authenticatedRequest(
  app: INestApplication,
  token: string,
): request.SuperTest<request.Test> {
  return request(app.getHttpServer()).set('Authorization', `Bearer ${token}`);
}
