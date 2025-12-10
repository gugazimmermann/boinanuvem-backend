import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { SubscriptionsService } from './subscriptions.service';
import { PrismaService } from '../common/services/prisma.service';

// Skip integration tests if database is not available
const describeOrSkip = process.env.SKIP_INTEGRATION_TESTS
  ? describe.skip
  : describe;

describeOrSkip('SubscriptionsService Integration Tests', () => {
  let service: SubscriptionsService;
  let prisma: PrismaClient;
  let testCompany: any;
  let testPlan: any;
  let testUser: any;
  let mainUser: any;

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

    // Create test plan
    testPlan = await prisma.plan.create({
      data: {
        name: 'Test Plan',
        description: 'Test plan for integration testing',
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
    });

    // Create test company
    testCompany = await prisma.company.create({
      data: {
        cnpj: '11.222.333/0001-55',
        companyName: 'Test Subscriptions Company',
        email: 'subscriptions@testcompany.com',
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

    const hashedPassword = await require('bcrypt').hash('password123', 10);
    mainUser = await prisma.user.create({
      data: {
        name: 'Main User',
        email: 'main-user@testcompany.com',
        phone: '(47) 99999-8888',
        password: hashedPassword,
        companyId: testCompany.id,
        mainUser: true,
        status: 'active',
        emailVerifiedAt: new Date(),
        permissions: {},
      },
    });

    testUser = await prisma.user.create({
      data: {
        name: 'Test User',
        email: 'user-subscriptions@testcompany.com',
        phone: '(47) 99999-7777',
        password: hashedPassword,
        companyId: testCompany.id,
        mainUser: false,
        status: 'active',
        emailVerifiedAt: new Date(),
        permissions: {},
      },
    });
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubscriptionsService,
        {
          provide: PrismaService,
          useValue: prisma,
        },
        Logger,
      ],
    }).compile();

    service = module.get<SubscriptionsService>(SubscriptionsService);

    // Clean up existing test subscriptions
    await prisma.companySubscription.deleteMany({
      where: {
        companyId: testCompany.id,
      },
    });
  });

  afterEach(async () => {
    // Clean up test data after each test
    await prisma.companySubscription.deleteMany({
      where: {
        companyId: testCompany.id,
      },
    });
  });

  afterAll(async () => {
    // Clean up test company and related data
    await prisma.companySubscription.deleteMany({
      where: {
        companyId: testCompany.id,
      },
    });
    await prisma.user.deleteMany({
      where: {
        companyId: testCompany.id,
      },
    });
    await prisma.company.deleteMany({
      where: {
        id: testCompany.id,
      },
    });
    await prisma.plan.deleteMany({
      where: {
        id: testPlan.id,
      },
    });

    if (prisma) {
      await prisma.$disconnect();
    }
  });

  describe('createSubscription with real database', () => {
    it('should create a subscription successfully', async () => {
      const dto = {
        companyId: testCompany.id,
        planId: testPlan.id,
        billingCycle: 'monthly' as const,
      };

      const result = await service.createSubscription(dto, mainUser.id);

      expect(result).toMatchObject({
        companyId: testCompany.id,
        planId: testPlan.id,
        billingCycle: 'monthly',
        status: 'active',
        isActive: true,
        isTrial: false,
      });
      expect(result.id).toBeDefined();

      // Verify company trial status was updated
      const company = await prisma.company.findUnique({
        where: { id: testCompany.id },
      });
      expect(company?.trialStatus).toBe('converted');
    });

    it('should deactivate existing active subscription when creating new one', async () => {
      // Create existing subscription
      const existingSubscription = await prisma.companySubscription.create({
        data: {
          companyId: testCompany.id,
          planId: testPlan.id,
          billingCycle: 'monthly',
          status: 'active',
          isActive: true,
          isTrial: false,
        },
      });

      // Create another plan with unique name
      const newPlan = await prisma.plan.create({
        data: {
          name: `New Test Plan ${Date.now()}`,
          description: 'New test plan',
          monthlyPrice: 'R$ 149,90',
          annualPrice: 'R$ 1.439,00',
          limits: {
            properties: '1 Propriedade',
            locations: 'Ilimitadas',
            animals: '500 Animais',
            members: 'Ilimitados',
          },
          features: ['Feature 1'],
          popular: false,
          status: 'active',
        },
      });

      const dto = {
        companyId: testCompany.id,
        planId: newPlan.id,
        billingCycle: 'annual' as const,
      };

      const result = await service.createSubscription(dto, mainUser.id);

      // Verify old subscription was deactivated
      const oldSubscription = await prisma.companySubscription.findUnique({
        where: { id: existingSubscription.id },
      });
      expect(oldSubscription?.isActive).toBe(false);
      expect(oldSubscription?.status).toBe('cancelled');

      // Verify new subscription is active
      expect(result.isActive).toBe(true);
      expect(result.status).toBe('active');

      // Cleanup - delete subscription first to avoid foreign key constraint
      await prisma.companySubscription.deleteMany({
        where: { planId: newPlan.id },
      });
      await prisma.plan.deleteMany({
        where: { id: newPlan.id },
      });
    });

    it('should fail if user is not main user', async () => {
      const dto = {
        companyId: testCompany.id,
        planId: testPlan.id,
        billingCycle: 'monthly' as const,
      };

      await expect(
        service.createSubscription(dto, testUser.id),
      ).rejects.toThrow('Only main users can manage subscriptions');
    });

    it('should fail if plan does not exist', async () => {
      const dto = {
        companyId: testCompany.id,
        planId: 'non-existent-plan-id',
        billingCycle: 'monthly' as const,
      };

      await expect(
        service.createSubscription(dto, mainUser.id),
      ).rejects.toThrow('Plan not found');
    });

    it('should fail if plan is inactive', async () => {
      const inactivePlan = await prisma.plan.create({
        data: {
          name: 'Inactive Plan',
          description: 'Inactive plan',
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
      });

      const dto = {
        companyId: testCompany.id,
        planId: inactivePlan.id,
        billingCycle: 'monthly' as const,
      };

      await expect(
        service.createSubscription(dto, mainUser.id),
      ).rejects.toThrow('Plan not found');

      // Cleanup
      await prisma.plan.deleteMany({
        where: { id: inactivePlan.id },
      });
    });
  });

  describe('getCurrentSubscription with real database', () => {
    it('should return current active subscription', async () => {
      const subscription = await prisma.companySubscription.create({
        data: {
          companyId: testCompany.id,
          planId: testPlan.id,
          billingCycle: 'monthly',
          status: 'active',
          isActive: true,
          isTrial: false,
        },
      });

      const result = await service.getCurrentSubscription(
        testCompany.id,
        mainUser.id,
      );

      expect(result).toMatchObject({
        id: subscription.id,
        companyId: testCompany.id,
        planId: testPlan.id,
        isActive: true,
      });
      expect(result.plan).toBeDefined();
    });

    it('should fail if no active subscription exists', async () => {
      await expect(
        service.getCurrentSubscription(testCompany.id, mainUser.id),
      ).rejects.toThrow('No active subscription found');
    });

    it('should fail if user does not belong to company', async () => {
      // Create another company
      const otherCompany = await prisma.company.create({
        data: {
          cnpj: '22.333.444/0001-66',
          companyName: 'Other Test Company',
          email: 'other@testcompany.com',
          phone: '(47) 99999-6666',
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

      await expect(
        service.getCurrentSubscription(otherCompany.id, mainUser.id),
      ).rejects.toThrow('Access denied');

      // Cleanup
      await prisma.company.deleteMany({
        where: { id: otherCompany.id },
      });
    });
  });

  describe('updateSubscription with real database', () => {
    let subscriptionId: string;

    beforeEach(async () => {
      const subscription = await prisma.companySubscription.create({
        data: {
          companyId: testCompany.id,
          planId: testPlan.id,
          billingCycle: 'monthly',
          status: 'active',
          isActive: true,
          isTrial: false,
        },
      });
      subscriptionId = subscription.id;
    });

    it('should update subscription billing cycle', async () => {
      const dto = {
        billingCycle: 'annual' as const,
      };

      const result = await service.updateSubscription(
        subscriptionId,
        dto,
        mainUser.id,
      );

      expect(result.billingCycle).toBe('annual');
    });

    it('should update subscription plan', async () => {
      const newPlan = await prisma.plan.create({
        data: {
          name: `Updated Plan ${Date.now()}`,
          description: 'Updated plan',
          monthlyPrice: 'R$ 149,90',
          annualPrice: 'R$ 1.439,00',
          limits: {
            properties: '1 Propriedade',
            locations: 'Ilimitadas',
            animals: '500 Animais',
            members: 'Ilimitados',
          },
          features: ['Feature 1'],
          popular: false,
          status: 'active',
        },
      });

      const dto = {
        planId: newPlan.id,
      };

      const result = await service.updateSubscription(
        subscriptionId,
        dto,
        mainUser.id,
      );

      expect(result.planId).toBe(newPlan.id);

      // Cleanup - delete subscription first to avoid foreign key constraint
      await prisma.companySubscription.deleteMany({
        where: { planId: newPlan.id },
      });
      await prisma.plan.deleteMany({
        where: { id: newPlan.id },
      });
    });

    it('should fail if user is not main user', async () => {
      const dto = {
        billingCycle: 'annual' as const,
      };

      await expect(
        service.updateSubscription(subscriptionId, dto, testUser.id),
      ).rejects.toThrow('Only main users can manage subscriptions');
    });
  });

  describe('cancelSubscription with real database', () => {
    let subscriptionId: string;

    beforeEach(async () => {
      const subscription = await prisma.companySubscription.create({
        data: {
          companyId: testCompany.id,
          planId: testPlan.id,
          billingCycle: 'monthly',
          status: 'active',
          isActive: true,
          isTrial: false,
        },
      });
      subscriptionId = subscription.id;
    });

    it('should cancel a subscription', async () => {
      const result = await service.cancelSubscription(
        subscriptionId,
        mainUser.id,
      );

      expect(result.status).toBe('cancelled');
      expect(result.isActive).toBe(false);
    });

    it('should fail if subscription is a trial', async () => {
      const trialSubscription = await prisma.companySubscription.create({
        data: {
          companyId: testCompany.id,
          planId: testPlan.id,
          billingCycle: 'monthly',
          status: 'active',
          isActive: true,
          isTrial: true,
        },
      });

      await expect(
        service.cancelSubscription(trialSubscription.id, mainUser.id),
      ).rejects.toThrow('Cannot cancel trial subscription');
    });

    it('should fail if user is not main user', async () => {
      await expect(
        service.cancelSubscription(subscriptionId, testUser.id),
      ).rejects.toThrow('Only main users can manage subscriptions');
    });
  });

  describe('getSubscriptionUsage with real database', () => {
    beforeEach(async () => {
      await prisma.companySubscription.create({
        data: {
          companyId: testCompany.id,
          planId: testPlan.id,
          billingCycle: 'monthly',
          status: 'active',
          isActive: true,
          isTrial: false,
        },
      });
    });

    it('should return subscription usage and limits', async () => {
      const result = await service.getSubscriptionUsage(
        testCompany.id,
        mainUser.id,
      );

      expect(result).toHaveProperty('subscription');
      expect(result).toHaveProperty('usage');
      expect(result).toHaveProperty('limits');
      expect(result).toHaveProperty('isWithinLimits');
      expect(result.subscription).toBeDefined();
      expect(result.usage).toBeDefined();
      expect(result.limits).toBeDefined();
    });

    it('should check limits correctly', async () => {
      const result = await service.getSubscriptionUsage(
        testCompany.id,
        mainUser.id,
      );

      expect(result.isWithinLimits).toBeDefined();
      expect(result.isWithinLimits.properties).toBeDefined();
      expect(result.isWithinLimits.locations).toBeDefined();
      expect(result.isWithinLimits.animals).toBeDefined();
      expect(result.isWithinLimits.members).toBeDefined();
    });
  });
});
