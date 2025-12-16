import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  SubscriptionsService,
  CreateSubscriptionDto,
  UpdateSubscriptionDto,
} from './subscriptions.service';
import { PrismaService } from '../common/services/prisma.service';
import Stripe from 'stripe';

describe('SubscriptionsService', () => {
  let service: SubscriptionsService;
  let prismaService: MockPrismaService;
  let mockStripe: jest.Mocked<Stripe>;

  interface MockPrismaService {
    user: {
      findUnique: jest.Mock;
    };
    plan: {
      findUnique: jest.Mock;
    };
    companySubscription: {
      findMany: jest.Mock;
      findFirst: jest.Mock;
      findUnique: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      updateMany: jest.Mock;
    };
    company: {
      findUnique: jest.Mock;
      update: jest.Mock;
    };
    companyPayment: {
      create: jest.Mock;
    };
    $transaction: jest.Mock;
  }

  const mockPrismaService: MockPrismaService = {
    user: {
      findUnique: jest.fn(),
    },
    plan: {
      findUnique: jest.fn(),
    },
    companySubscription: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    company: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    companyPayment: {
      create: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn((key: string) => {
      if (key === 'STRIPE_SECRET_KEY') {
        return 'sk_test_stripe_key';
      }
      if (key === 'FRONTEND_URL') {
        return 'http://localhost:5173';
      }
      return null;
    }),
  };

  // Mock logger to suppress expected error logs during tests
  const mockLogger = {
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
    verbose: jest.fn(),
  };

  beforeEach(async () => {
    // Create mock Stripe instance
    mockStripe = {
      subscriptions: {
        retrieve: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        cancel: jest.fn(),
      } as any,
      paymentMethods: {
        retrieve: jest.fn(),
        attach: jest.fn(),
      } as any,
      customers: {
        create: jest.fn(),
        update: jest.fn(),
      } as any,
      prices: {
        list: jest.fn(),
      } as any,
      invoices: {
        pay: jest.fn(),
        finalizeInvoice: jest.fn(),
      } as any,
      checkout: {
        sessions: {
          create: jest.fn(),
          retrieve: jest.fn(),
        },
      } as any,
      billingPortal: {
        sessions: {
          create: jest.fn(),
        },
      } as any,
    } as jest.Mocked<Stripe>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubscriptionsService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<SubscriptionsService>(SubscriptionsService);
    prismaService = module.get<MockPrismaService>(PrismaService);

    // Mock the logger to suppress console output during tests
    Object.defineProperty(service, 'logger', {
      value: mockLogger,
      writable: true,
    });

    // Manually set the stripe instance for testing
    (service as any).stripe = mockStripe;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getCompanySubscriptions', () => {
    const mockUser = {
      id: 'user-1',
      companyId: 'company-1',
    };

    const mockSubscriptions = [
      {
        id: 'sub-1',
        companyId: 'company-1',
        status: 'active',
        plan: { id: 'plan-1', name: 'Avançado' },
      },
      {
        id: 'sub-2',
        companyId: 'company-1',
        status: 'trial',
        plan: { id: 'plan-1', name: 'Avançado' },
      },
    ];

    it('should throw ForbiddenException if user not found', async () => {
      prismaService.user.findUnique.mockResolvedValue(null);

      await expect(
        service.getCompanySubscriptions('company-1', 'user-1'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException if user does not belong to company', async () => {
      const otherUser = { ...mockUser, companyId: 'other-company' };
      prismaService.user.findUnique.mockResolvedValue(otherUser);

      await expect(
        service.getCompanySubscriptions('company-1', 'user-1'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should return company subscriptions', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.companySubscription.findMany.mockResolvedValue(
        mockSubscriptions,
      );

      const result = await service.getCompanySubscriptions(
        'company-1',
        'user-1',
      );

      expect(result).toEqual(mockSubscriptions);
      expect(prismaService.companySubscription.findMany).toHaveBeenCalledWith({
        where: { companyId: 'company-1' },
        include: { plan: true },
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  describe('getCurrentSubscription', () => {
    const mockUser = {
      id: 'user-1',
      companyId: 'company-1',
    };

    const mockSubscription = {
      id: 'sub-1',
      companyId: 'company-1',
      status: 'active',
      isActive: true,
      plan: { id: 'plan-1', name: 'Avançado' },
    };

    it('should throw ForbiddenException if user does not belong to company', async () => {
      const otherUser = { ...mockUser, companyId: 'other-company' };
      prismaService.user.findUnique.mockResolvedValue(otherUser);

      await expect(
        service.getCurrentSubscription('company-1', 'user-1'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException if no active subscription found', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.companySubscription.findFirst.mockResolvedValue(null);

      await expect(
        service.getCurrentSubscription('company-1', 'user-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should return current active subscription', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.companySubscription.findFirst.mockResolvedValue(
        mockSubscription,
      );

      const result = await service.getCurrentSubscription(
        'company-1',
        'user-1',
      );

      expect(result).toEqual(mockSubscription);
      expect(prismaService.companySubscription.findFirst).toHaveBeenCalledWith({
        where: { companyId: 'company-1', isActive: true },
        include: { plan: true },
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  describe('createSubscription', () => {
    const createDto: CreateSubscriptionDto = {
      companyId: 'company-1',
      planId: 'plan-1',
      billingCycle: 'monthly',
    };

    const mockUser = {
      id: 'user-1',
      companyId: 'company-1',
      mainUser: true,
    };

    const mockPlan = {
      id: 'plan-1',
      name: 'Avançado',
      status: 'active',
    };

    const mockNewSubscription = {
      id: 'sub-new',
      companyId: 'company-1',
      planId: 'plan-1',
      status: 'active',
      isActive: true,
      isTrial: false,
      plan: mockPlan,
    };

    it('should throw ForbiddenException if user does not belong to company', async () => {
      const otherUser = { ...mockUser, companyId: 'other-company' };
      prismaService.user.findUnique.mockResolvedValue(otherUser);

      await expect(
        service.createSubscription(createDto, 'user-1'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException if user is not main user', async () => {
      const nonMainUser = { ...mockUser, mainUser: false };
      prismaService.user.findUnique.mockResolvedValue(nonMainUser);

      await expect(
        service.createSubscription(createDto, 'user-1'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException if plan not found', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.plan.findUnique.mockResolvedValue(null);

      await expect(
        service.createSubscription(createDto, 'user-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if plan is inactive', async () => {
      const inactivePlan = { ...mockPlan, status: 'inactive' };
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.plan.findUnique.mockResolvedValue(inactivePlan);

      await expect(
        service.createSubscription(createDto, 'user-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should successfully create subscription', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.plan.findUnique.mockResolvedValue(mockPlan);

      const mockTransaction = {
        companySubscription: {
          updateMany: jest.fn().mockResolvedValue({}),
          create: jest.fn().mockResolvedValue(mockNewSubscription),
        },
        company: {
          update: jest.fn().mockResolvedValue({}),
        },
      };

      prismaService.$transaction.mockImplementation(async (callback) => {
        return callback(mockTransaction as any);
      });

      const result = await service.createSubscription(createDto, 'user-1');

      expect(result).toEqual(mockNewSubscription);

      // Should deactivate current subscriptions
      expect(
        mockTransaction.companySubscription.updateMany,
      ).toHaveBeenCalledWith({
        where: { companyId: 'company-1', isActive: true },
        data: { isActive: false, status: 'cancelled' },
      });

      // Should create new subscription
      expect(mockTransaction.companySubscription.create).toHaveBeenCalledWith({
        data: {
          companyId: 'company-1',
          planId: 'plan-1',
          billingCycle: 'monthly',
          status: 'active',
          isActive: true,
          isTrial: false,
          stripeSubscriptionId: null,
          stripeCustomerId: null,
          stripePriceId: null,
        },
        include: { plan: true },
      });

      // Should update company trial status
      expect(mockTransaction.company.update).toHaveBeenCalledWith({
        where: { id: 'company-1' },
        data: { trialStatus: 'converted' },
      });
    });
  });

  describe('updateSubscription', () => {
    const updateDto: UpdateSubscriptionDto = {
      planId: 'new-plan-1',
      billingCycle: 'annual',
    };

    const mockUser = {
      id: 'user-1',
      companyId: 'company-1',
      mainUser: true,
    };

    const mockSubscription = {
      id: 'sub-1',
      companyId: 'company-1',
      company: { id: 'company-1' },
    };

    const mockPlan = {
      id: 'new-plan-1',
      name: 'New Plan',
      status: 'active',
    };

    const mockUpdatedSubscription = {
      ...mockSubscription,
      ...updateDto,
      plan: mockPlan,
    };

    it('should throw NotFoundException if subscription not found', async () => {
      prismaService.companySubscription.findUnique.mockResolvedValue(null);

      await expect(
        service.updateSubscription('sub-1', updateDto, 'user-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if user does not belong to company', async () => {
      const otherUser = { ...mockUser, companyId: 'other-company' };
      prismaService.companySubscription.findUnique.mockResolvedValue(
        mockSubscription,
      );
      prismaService.user.findUnique.mockResolvedValue(otherUser);

      await expect(
        service.updateSubscription('sub-1', updateDto, 'user-1'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException if user is not main user', async () => {
      const nonMainUser = { ...mockUser, mainUser: false };
      prismaService.companySubscription.findUnique.mockResolvedValue(
        mockSubscription,
      );
      prismaService.user.findUnique.mockResolvedValue(nonMainUser);

      await expect(
        service.updateSubscription('sub-1', updateDto, 'user-1'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException if new plan not found', async () => {
      prismaService.companySubscription.findUnique.mockResolvedValue(
        mockSubscription,
      );
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.plan.findUnique.mockResolvedValue(null);

      await expect(
        service.updateSubscription('sub-1', updateDto, 'user-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should successfully update subscription', async () => {
      prismaService.companySubscription.findUnique.mockResolvedValue(
        mockSubscription,
      );
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.plan.findUnique.mockResolvedValue(mockPlan);
      prismaService.companySubscription.update.mockResolvedValue(
        mockUpdatedSubscription,
      );

      const result = await service.updateSubscription(
        'sub-1',
        updateDto,
        'user-1',
      );

      expect(result).toEqual(mockUpdatedSubscription);
      expect(prismaService.companySubscription.update).toHaveBeenCalledWith({
        where: { id: 'sub-1' },
        data: updateDto,
        include: { plan: true },
      });
    });

    it('should not validate plan if planId not provided', async () => {
      const updateDtoWithoutPlan = { billingCycle: 'annual' as const };

      prismaService.companySubscription.findUnique.mockResolvedValue(
        mockSubscription,
      );
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.companySubscription.update.mockResolvedValue(
        mockUpdatedSubscription,
      );

      await service.updateSubscription('sub-1', updateDtoWithoutPlan, 'user-1');

      expect(prismaService.plan.findUnique).not.toHaveBeenCalled();
    });
  });

  describe('cancelSubscription', () => {
    const mockUser = {
      id: 'user-1',
      companyId: 'company-1',
      mainUser: true,
    };

    const mockSubscription = {
      id: 'sub-1',
      companyId: 'company-1',
      isTrial: false,
      company: { id: 'company-1' },
    };

    const mockCancelledSubscription = {
      ...mockSubscription,
      status: 'cancelled',
      isActive: false,
      plan: { id: 'plan-1', name: 'Plan' },
    };

    it('should throw NotFoundException if subscription not found', async () => {
      prismaService.companySubscription.findUnique.mockResolvedValue(null);

      await expect(
        service.cancelSubscription('sub-1', 'user-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if user does not belong to company', async () => {
      const otherUser = { ...mockUser, companyId: 'other-company' };
      prismaService.companySubscription.findUnique.mockResolvedValue(
        mockSubscription,
      );
      prismaService.user.findUnique.mockResolvedValue(otherUser);

      await expect(
        service.cancelSubscription('sub-1', 'user-1'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException if user is not main user', async () => {
      const nonMainUser = { ...mockUser, mainUser: false };
      prismaService.companySubscription.findUnique.mockResolvedValue(
        mockSubscription,
      );
      prismaService.user.findUnique.mockResolvedValue(nonMainUser);

      await expect(
        service.cancelSubscription('sub-1', 'user-1'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException if trying to cancel trial subscription', async () => {
      const trialSubscription = { ...mockSubscription, isTrial: true };
      prismaService.companySubscription.findUnique.mockResolvedValue(
        trialSubscription,
      );
      prismaService.user.findUnique.mockResolvedValue(mockUser);

      await expect(
        service.cancelSubscription('sub-1', 'user-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should successfully cancel subscription', async () => {
      prismaService.companySubscription.findUnique.mockResolvedValue(
        mockSubscription,
      );
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.companySubscription.update.mockResolvedValue(
        mockCancelledSubscription,
      );

      const result = await service.cancelSubscription('sub-1', 'user-1');

      expect(result).toEqual(mockCancelledSubscription);
      expect(prismaService.companySubscription.update).toHaveBeenCalledWith({
        where: { id: 'sub-1' },
        data: { status: 'cancelled', isActive: false },
        include: { plan: true },
      });
    });
  });

  describe('getSubscriptionUsage', () => {
    const mockUser = {
      id: 'user-1',
      companyId: 'company-1',
    };

    const mockSubscription = {
      id: 'sub-1',
      companyId: 'company-1',
      status: 'active',
      isActive: true,
      plan: {
        id: 'plan-1',
        name: 'Avançado',
        limits: {
          properties: '1 Propriedade',
          locations: 'Ilimitadas',
          animals: '500 Animais',
          members: '10 Membros',
        },
      },
    };

    beforeEach(() => {
      // Mock getCurrentSubscription
      jest
        .spyOn(service, 'getCurrentSubscription')
        .mockResolvedValue(mockSubscription as any);
    });

    it('should throw ForbiddenException if user does not belong to company', async () => {
      const otherUser = { ...mockUser, companyId: 'other-company' };
      prismaService.user.findUnique.mockResolvedValue(otherUser);

      await expect(
        service.getSubscriptionUsage('company-1', 'user-1'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should return subscription usage and limits', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.getSubscriptionUsage('company-1', 'user-1');

      expect(result).toEqual({
        subscription: mockSubscription,
        usage: {
          properties: 0,
          locations: 0,
          animals: 0,
          members: 0,
        },
        limits: mockSubscription.plan.limits,
        isWithinLimits: {
          properties: true, // 0 <= 1
          locations: true, // Unlimited
          animals: true, // 0 <= 500
          members: true, // 0 <= 10
        },
      });
    });

    it('should correctly check limits', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);

      // Test the private checkLimit method through the public interface
      const result = await service.getSubscriptionUsage('company-1', 'user-1');

      expect(result.isWithinLimits.properties).toBe(true);
      expect(result.isWithinLimits.locations).toBe(true); // Unlimited
      expect(result.isWithinLimits.animals).toBe(true);
      expect(result.isWithinLimits.members).toBe(true);
    });
  });

  describe('getStripeSubscriptionItemId error handling', () => {
    it('should handle Error instance and log error message', async () => {
      const error = new Error('Stripe API error');
      mockStripe.subscriptions.retrieve = jest
        .fn()
        .mockRejectedValue(error) as any;

      const loggerSpy = jest.spyOn((service as any).logger, 'warn');

      const result = await (service as any).getStripeSubscriptionItemId(
        'sub_test_123',
      );

      expect(result).toBeUndefined();
      expect(loggerSpy).toHaveBeenCalledWith(
        'Failed to retrieve Stripe subscription item ID: Stripe API error',
      );
    });

    it('should handle non-Error objects and convert to string', async () => {
      const error = { code: 'api_error', message: 'Something went wrong' };
      mockStripe.subscriptions.retrieve = jest
        .fn()
        .mockRejectedValue(error) as any;

      const loggerSpy = jest.spyOn((service as any).logger, 'warn');

      const result = await (service as any).getStripeSubscriptionItemId(
        'sub_test_123',
      );

      expect(result).toBeUndefined();
      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining(
          'Failed to retrieve Stripe subscription item ID:',
        ),
      );
    });

    it('should return undefined when Stripe is not configured', async () => {
      (service as any).stripe = null;

      const result = await (service as any).getStripeSubscriptionItemId(
        'sub_test_123',
      );

      expect(result).toBeUndefined();
      expect(mockStripe.subscriptions.retrieve).not.toHaveBeenCalled();
    });

    it('should return subscription item ID on success', async () => {
      const mockSubscription = {
        items: {
          data: [{ id: 'si_test_123' }],
        },
      };
      mockStripe.subscriptions.retrieve = jest
        .fn()
        .mockResolvedValue(mockSubscription) as any;

      const result = await (service as any).getStripeSubscriptionItemId(
        'sub_test_123',
      );

      expect(result).toBe('si_test_123');
    });
  });

  describe('createSubscriptionWithPaymentMethod error handling', () => {
    const mockUser = {
      id: 'user-1',
      companyId: 'company-1',
      mainUser: true,
      email: 'test@example.com',
    };

    const mockPlan = {
      id: 'plan-1',
      name: 'Avançado',
      status: 'active',
    };

    const mockCompany = {
      id: 'company-1',
      stripeCustomerId: 'cus_test_123',
    };

    const mockPaymentMethod = {
      id: 'pm_test_123',
      type: 'card',
    };

    const mockPrice = {
      id: 'price_test_123',
      product: 'prod_test_123',
    };

    const mockSubscription = {
      id: 'sub_test_123',
      status: 'active',
      latest_invoice: {
        id: 'in_test_123',
        status: 'open',
        amount_paid: 10000,
        amount_due: 10000,
      },
    };

    beforeEach(() => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.plan.findUnique.mockResolvedValue(mockPlan);
      prismaService.company.findUnique.mockResolvedValue(mockCompany);
      mockStripe.paymentMethods.retrieve = jest
        .fn()
        .mockResolvedValue(mockPaymentMethod) as any;
      mockStripe.prices.list = jest
        .fn()
        .mockResolvedValue({ data: [mockPrice] }) as any;
      mockStripe.customers.update = jest.fn().mockResolvedValue({}) as any;
      mockStripe.subscriptions.create = jest
        .fn()
        .mockResolvedValue(mockSubscription) as any;

      const mockTransaction = {
        companySubscription: {
          updateMany: jest.fn().mockResolvedValue({}),
          create: jest.fn().mockResolvedValue({
            id: 'sub-db-123',
            companyId: 'company-1',
            planId: 'plan-1',
            status: 'active',
            isActive: true,
            plan: mockPlan,
          }),
        },
        company: {
          findUnique: jest.fn().mockResolvedValue(mockCompany),
          update: jest.fn().mockResolvedValue({}),
        },
      };

      prismaService.$transaction.mockImplementation(async (callback) => {
        return callback(mockTransaction as any);
      });
    });

    it('should handle payment method attachment error with Error instance', async () => {
      const attachmentError = new Error('Payment method already attached');
      mockStripe.paymentMethods.attach = jest
        .fn()
        .mockRejectedValue(attachmentError) as any;

      const loggerSpy = jest.spyOn((service as any).logger, 'warn');

      await service.createSubscriptionWithPaymentMethod(
        'company-1',
        'plan-1',
        'monthly',
        'pm_test_123',
        'user-1',
      );

      expect(loggerSpy).toHaveBeenCalledWith(
        'Payment method attachment warning: Payment method already attached',
      );
      // Should continue execution despite error
      expect(mockStripe.customers.update).toHaveBeenCalled();
    });

    it('should handle payment method attachment error with non-Error object', async () => {
      const attachmentError = { code: 'resource_already_exists' };
      mockStripe.paymentMethods.attach = jest
        .fn()
        .mockRejectedValue(attachmentError) as any;

      const loggerSpy = jest.spyOn((service as any).logger, 'warn');

      await service.createSubscriptionWithPaymentMethod(
        'company-1',
        'plan-1',
        'monthly',
        'pm_test_123',
        'user-1',
      );

      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('Payment method attachment warning:'),
      );
    });

    it('should handle invoice payment error with Error instance', async () => {
      const payError = new Error('Payment failed');
      mockStripe.invoices.pay = jest.fn().mockRejectedValue(payError) as any;

      const loggerSpy = jest.spyOn((service as any).logger, 'error');

      await service.createSubscriptionWithPaymentMethod(
        'company-1',
        'plan-1',
        'monthly',
        'pm_test_123',
        'user-1',
      );

      expect(loggerSpy).toHaveBeenCalledWith(
        'Failed to pay invoice in_test_123: Payment failed',
      );
      // Should continue execution despite error
      expect(prismaService.$transaction).toHaveBeenCalled();
    });

    it('should handle invoice payment error with non-Error object', async () => {
      const payError = { code: 'card_declined', message: 'Card was declined' };
      mockStripe.invoices.pay = jest.fn().mockRejectedValue(payError) as any;

      const loggerSpy = jest.spyOn((service as any).logger, 'error');

      await service.createSubscriptionWithPaymentMethod(
        'company-1',
        'plan-1',
        'monthly',
        'pm_test_123',
        'user-1',
      );

      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to pay invoice in_test_123:'),
      );
    });

    it('should handle invoice finalization error with Error instance', async () => {
      const draftInvoice = {
        id: 'in_test_123',
        status: 'draft',
      };
      mockSubscription.latest_invoice = draftInvoice as any;
      mockStripe.subscriptions.create = jest
        .fn()
        .mockResolvedValue(mockSubscription) as any;

      const finalizeError = new Error('Finalization failed');
      mockStripe.invoices.finalizeInvoice = jest
        .fn()
        .mockRejectedValue(finalizeError) as any;

      const loggerSpy = jest.spyOn((service as any).logger, 'error');

      await service.createSubscriptionWithPaymentMethod(
        'company-1',
        'plan-1',
        'monthly',
        'pm_test_123',
        'user-1',
      );

      expect(loggerSpy).toHaveBeenCalledWith(
        'Failed to finalize invoice in_test_123: Finalization failed',
      );
    });

    it('should handle invoice finalization error with non-Error object', async () => {
      const draftInvoice = {
        id: 'in_test_123',
        status: 'draft',
      };
      mockSubscription.latest_invoice = draftInvoice as any;
      mockStripe.subscriptions.create = jest
        .fn()
        .mockResolvedValue(mockSubscription) as any;

      const finalizeError = { code: 'invalid_request' };
      mockStripe.invoices.finalizeInvoice = jest
        .fn()
        .mockRejectedValue(finalizeError) as any;

      const loggerSpy = jest.spyOn((service as any).logger, 'error');

      await service.createSubscriptionWithPaymentMethod(
        'company-1',
        'plan-1',
        'monthly',
        'pm_test_123',
        'user-1',
      );

      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to finalize invoice in_test_123:'),
      );
    });

    it('should handle paid invoice status correctly', async () => {
      const paidInvoice = {
        id: 'in_test_123',
        status: 'paid',
      };
      mockSubscription.latest_invoice = paidInvoice as any;
      mockStripe.subscriptions.create = jest
        .fn()
        .mockResolvedValue(mockSubscription) as any;

      const loggerSpy = jest.spyOn((service as any).logger, 'log');

      await service.createSubscriptionWithPaymentMethod(
        'company-1',
        'plan-1',
        'monthly',
        'pm_test_123',
        'user-1',
      );

      expect(loggerSpy).toHaveBeenCalledWith(
        'Invoice in_test_123 already paid',
      );
      expect(mockStripe.invoices.pay).not.toHaveBeenCalled();
    });
  });

  describe('createCheckoutSession', () => {
    const mockUser = {
      id: 'user-1',
      companyId: 'company-1',
      mainUser: true,
      email: 'test@example.com',
    };

    const mockPlan = {
      id: 'plan-1',
      name: 'Avançado',
      status: 'active',
    };

    const mockCompany = {
      id: 'company-1',
      stripeCustomerId: 'cus_test_123',
    };

    const mockPrice = {
      id: 'price_test_123',
      product: 'prod_test_123',
    };

    const mockSession = {
      id: 'cs_test_123',
      url: 'https://checkout.stripe.com/test',
    };

    beforeEach(() => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.plan.findUnique.mockResolvedValue(mockPlan);
      prismaService.company.findUnique.mockResolvedValue(mockCompany);
      mockStripe.prices.list = jest
        .fn()
        .mockResolvedValue({ data: [mockPrice] }) as any;
      mockStripe.checkout.sessions.create = jest
        .fn()
        .mockResolvedValue(mockSession) as any;
    });

    it('should throw if Stripe is not configured', async () => {
      (service as any).stripe = null;

      await expect(
        service.createCheckoutSession(
          'company-1',
          'plan-1',
          'monthly',
          'user-1',
        ),
      ).rejects.toThrow('Stripe is not configured');
    });

    it('should throw if user does not belong to company', async () => {
      const otherUser = { ...mockUser, companyId: 'other-company' };
      prismaService.user.findUnique.mockResolvedValue(otherUser);

      await expect(
        service.createCheckoutSession(
          'company-1',
          'plan-1',
          'monthly',
          'user-1',
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw if user is not main user', async () => {
      const nonMainUser = { ...mockUser, mainUser: false };
      prismaService.user.findUnique.mockResolvedValue(nonMainUser);

      await expect(
        service.createCheckoutSession(
          'company-1',
          'plan-1',
          'monthly',
          'user-1',
        ),
      ).rejects.toThrow('Only main users can manage subscriptions');
    });

    it('should throw if plan not found or inactive', async () => {
      prismaService.plan.findUnique.mockResolvedValue(null);

      await expect(
        service.createCheckoutSession(
          'company-1',
          'plan-1',
          'monthly',
          'user-1',
        ),
      ).rejects.toThrow('Plan not found or inactive');
    });

    it('should create checkout session with existing customer', async () => {
      const result = await service.createCheckoutSession(
        'company-1',
        'plan-1',
        'monthly',
        'user-1',
      );

      expect(result).toEqual({
        sessionId: 'cs_test_123',
        url: 'https://checkout.stripe.com/test',
      });
      expect(mockStripe.checkout.sessions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          customer: 'cus_test_123',
          mode: 'subscription',
        }),
      );
    });

    it('should create checkout session with customer email if no customer ID', async () => {
      prismaService.company.findUnique.mockResolvedValue({
        ...mockCompany,
        stripeCustomerId: null,
      });

      await service.createCheckoutSession(
        'company-1',
        'plan-1',
        'monthly',
        'user-1',
      );

      expect(mockStripe.checkout.sessions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          customer_email: 'test@example.com',
        }),
      );
    });

    it('should use annual billing cycle product', async () => {
      await service.createCheckoutSession(
        'company-1',
        'plan-1',
        'annual',
        'user-1',
      );

      expect(mockStripe.prices.list).toHaveBeenCalledWith(
        expect.objectContaining({
          product: 'prod_TbygbJBTz6vFDt', // Avançado annual product
        }),
      );
    });
  });

  describe('confirmSubscription', () => {
    const mockUser = {
      id: 'user-1',
      companyId: 'company-1',
      mainUser: true,
      email: 'test@example.com',
    };

    const mockPlan = {
      id: 'plan-1',
      name: 'Avançado',
      status: 'active',
    };

    const mockSession = {
      id: 'cs_test_123',
      payment_status: 'paid',
      customer: 'cus_test_123',
      subscription: 'sub_test_123',
      line_items: {
        data: [
          {
            price: {
              id: 'price_test_123',
            },
          },
        ],
      },
      metadata: {
        companyId: 'company-1',
        planId: 'plan-1',
        billingCycle: 'monthly',
      },
      amount_total: 10000,
    };

    const mockNewSubscription = {
      id: 'sub-db-123',
      companyId: 'company-1',
      planId: 'plan-1',
      status: 'active',
      isActive: true,
      plan: mockPlan,
    };

    beforeEach(() => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.plan.findUnique.mockResolvedValue(mockPlan);
      mockStripe.checkout.sessions.retrieve = jest
        .fn()
        .mockResolvedValue(mockSession) as any;

      const mockTransaction = {
        companySubscription: {
          updateMany: jest.fn().mockResolvedValue({}),
          create: jest.fn().mockResolvedValue(mockNewSubscription),
        },
        company: {
          findUnique: jest.fn().mockResolvedValue({ stripeCustomerId: null }),
          update: jest.fn().mockResolvedValue({}),
        },
      };

      prismaService.$transaction.mockImplementation(async (callback) => {
        return callback(mockTransaction as any);
      });
    });

    it('should throw if Stripe is not configured', async () => {
      (service as any).stripe = null;

      await expect(
        service.confirmSubscription('cs_test_123', 'user-1'),
      ).rejects.toThrow('Stripe is not configured');
    });

    it('should throw if user not found', async () => {
      prismaService.user.findUnique.mockResolvedValue(null);

      await expect(
        service.confirmSubscription('cs_test_123', 'user-1'),
      ).rejects.toThrow('User not found');
    });

    it('should throw if user is not main user', async () => {
      const nonMainUser = { ...mockUser, mainUser: false };
      prismaService.user.findUnique.mockResolvedValue(nonMainUser);

      await expect(
        service.confirmSubscription('cs_test_123', 'user-1'),
      ).rejects.toThrow('Only main users can confirm subscriptions');
    });

    it('should throw if payment not completed', async () => {
      mockStripe.checkout.sessions.retrieve = jest.fn().mockResolvedValue({
        ...mockSession,
        payment_status: 'unpaid',
      }) as any;

      await expect(
        service.confirmSubscription('cs_test_123', 'user-1'),
      ).rejects.toThrow('Payment not completed');
    });

    it('should throw if session metadata is invalid', async () => {
      mockStripe.checkout.sessions.retrieve = jest.fn().mockResolvedValue({
        ...mockSession,
        metadata: {},
      }) as any;

      await expect(
        service.confirmSubscription('cs_test_123', 'user-1'),
      ).rejects.toThrow('Invalid session metadata');
    });

    it('should throw if user does not belong to company', async () => {
      mockStripe.checkout.sessions.retrieve = jest.fn().mockResolvedValue({
        ...mockSession,
        metadata: {
          companyId: 'other-company',
          planId: 'plan-1',
          billingCycle: 'monthly',
        },
      }) as any;

      await expect(
        service.confirmSubscription('cs_test_123', 'user-1'),
      ).rejects.toThrow('Access denied to this company');
    });

    it('should successfully confirm subscription and create payment', async () => {
      jest
        .spyOn(service, 'createSubscription')
        .mockResolvedValue(mockNewSubscription as any);

      const result = await service.confirmSubscription('cs_test_123', 'user-1');

      expect(result).toEqual(mockNewSubscription);
      expect(prismaService.companyPayment.create).toHaveBeenCalled();
    });
  });

  describe('createSubscriptionWithPaymentMethod', () => {
    const mockUser = {
      id: 'user-1',
      companyId: 'company-1',
      mainUser: true,
      email: 'test@example.com',
    };

    const mockPlan = {
      id: 'plan-1',
      name: 'Avançado',
      status: 'active',
    };

    const mockCompany = {
      id: 'company-1',
      stripeCustomerId: null,
    };

    const mockPaymentMethod = {
      id: 'pm_test_123',
      type: 'card',
    };

    const mockPrice = {
      id: 'price_test_123',
      product: 'prod_test_123',
    };

    const mockCustomer = {
      id: 'cus_test_123',
    };

    const mockSubscription = {
      id: 'sub_test_123',
      status: 'active',
      latest_invoice: {
        id: 'in_test_123',
        status: 'paid',
        amount_paid: 10000,
      },
    };

    const mockNewSubscription = {
      id: 'sub-db-123',
      companyId: 'company-1',
      planId: 'plan-1',
      status: 'active',
      isActive: true,
      plan: mockPlan,
    };

    beforeEach(() => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.plan.findUnique.mockResolvedValue(mockPlan);
      prismaService.company.findUnique.mockResolvedValue(mockCompany);
      prismaService.company.update = jest.fn().mockResolvedValue({});
      mockStripe.paymentMethods.retrieve = jest
        .fn()
        .mockResolvedValue(mockPaymentMethod) as any;
      mockStripe.prices.list = jest
        .fn()
        .mockResolvedValue({ data: [mockPrice] }) as any;
      mockStripe.customers.create = jest
        .fn()
        .mockResolvedValue(mockCustomer) as any;
      mockStripe.paymentMethods.attach = jest.fn().mockResolvedValue({}) as any;
      mockStripe.customers.update = jest.fn().mockResolvedValue({}) as any;
      mockStripe.subscriptions.create = jest
        .fn()
        .mockResolvedValue(mockSubscription) as any;

      jest
        .spyOn(service, 'createSubscription')
        .mockResolvedValue(mockNewSubscription as any);
    });

    it('should throw if Stripe is not configured', async () => {
      (service as any).stripe = null;

      await expect(
        service.createSubscriptionWithPaymentMethod(
          'company-1',
          'plan-1',
          'monthly',
          'pm_test_123',
          'user-1',
        ),
      ).rejects.toThrow('Stripe is not configured');
    });

    it('should throw if payment method is not card', async () => {
      mockStripe.paymentMethods.retrieve = jest.fn().mockResolvedValue({
        ...mockPaymentMethod,
        type: 'bank_account',
      }) as any;

      await expect(
        service.createSubscriptionWithPaymentMethod(
          'company-1',
          'plan-1',
          'monthly',
          'pm_test_123',
          'user-1',
        ),
      ).rejects.toThrow('Only card payment methods are supported');
    });

    it('should create new customer if company has no Stripe customer ID', async () => {
      await service.createSubscriptionWithPaymentMethod(
        'company-1',
        'plan-1',
        'monthly',
        'pm_test_123',
        'user-1',
      );

      expect(mockStripe.customers.create).toHaveBeenCalledWith({
        email: 'test@example.com',
        metadata: {
          companyId: 'company-1',
          userId: 'user-1',
        },
      });
      expect(prismaService.company.update).toHaveBeenCalledWith({
        where: { id: 'company-1' },
        data: { stripeCustomerId: 'cus_test_123' },
      });
    });

    it('should use existing customer if company has Stripe customer ID', async () => {
      prismaService.company.findUnique.mockResolvedValue({
        ...mockCompany,
        stripeCustomerId: 'cus_existing_123',
      });

      await service.createSubscriptionWithPaymentMethod(
        'company-1',
        'plan-1',
        'monthly',
        'pm_test_123',
        'user-1',
      );

      expect(mockStripe.customers.create).not.toHaveBeenCalled();
      expect(mockStripe.paymentMethods.attach).toHaveBeenCalledWith(
        'pm_test_123',
        {
          customer: 'cus_existing_123',
        },
      );
    });

    it('should create subscription and payment record successfully', async () => {
      const result = await service.createSubscriptionWithPaymentMethod(
        'company-1',
        'plan-1',
        'monthly',
        'pm_test_123',
        'user-1',
      );

      expect(result).toEqual(mockNewSubscription);
      expect(mockStripe.subscriptions.create).toHaveBeenCalled();
      expect(prismaService.companyPayment.create).toHaveBeenCalled();
    });
  });

  describe('syncSubscriptionStatus', () => {
    const mockUser = {
      id: 'user-1',
      companyId: 'company-1',
      mainUser: true,
    };

    const mockSubscription = {
      id: 'sub-1',
      companyId: 'company-1',
      status: 'active',
      isActive: true,
      stripeSubscriptionId: 'sub_stripe_123',
      company: { id: 'company-1' },
    };

    const mockStripeSubscription = {
      id: 'sub_stripe_123',
      status: 'active',
      cancel_at: null,
      current_period_end: Math.floor(Date.now() / 1000) + 86400,
    };

    beforeEach(() => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.companySubscription.findUnique.mockResolvedValue(
        mockSubscription,
      );
      mockStripe.subscriptions.retrieve = jest
        .fn()
        .mockResolvedValue(mockStripeSubscription) as any;
    });

    it('should throw if Stripe is not configured', async () => {
      (service as any).stripe = null;

      await expect(
        service.syncSubscriptionStatus('sub-1', 'user-1'),
      ).rejects.toThrow('Stripe is not configured');
    });

    it('should throw if subscription not found', async () => {
      prismaService.companySubscription.findUnique.mockResolvedValue(null);

      await expect(
        service.syncSubscriptionStatus('sub-1', 'user-1'),
      ).rejects.toThrow('Subscription not found');
    });

    it('should throw if subscription has no Stripe subscription ID', async () => {
      prismaService.companySubscription.findUnique.mockResolvedValue({
        ...mockSubscription,
        stripeSubscriptionId: null,
      });

      await expect(
        service.syncSubscriptionStatus('sub-1', 'user-1'),
      ).rejects.toThrow('Subscription does not have a Stripe subscription ID');
    });

    it('should sync active subscription status', async () => {
      prismaService.companySubscription.update = jest.fn().mockResolvedValue({
        ...mockSubscription,
        status: 'active',
        isActive: true,
      });

      const result = await service.syncSubscriptionStatus('sub-1', 'user-1');

      expect(result).toBeDefined();
      expect(mockStripe.subscriptions.retrieve).toHaveBeenCalledWith(
        'sub_stripe_123',
      );
    });

    it('should sync cancelled subscription status', async () => {
      mockStripe.subscriptions.retrieve = jest.fn().mockResolvedValue({
        ...mockStripeSubscription,
        status: 'canceled',
      }) as any;

      prismaService.companySubscription.update = jest.fn().mockResolvedValue({
        ...mockSubscription,
        status: 'cancelled',
        isActive: false,
      });

      await service.syncSubscriptionStatus('sub-1', 'user-1');

      expect(prismaService.companySubscription.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'cancelled',
            isActive: false,
          }),
        }),
      );
    });
  });

  describe('createCustomerPortalSession', () => {
    const mockUser = {
      id: 'user-1',
      companyId: 'company-1',
      mainUser: true,
    };

    const mockCompany = {
      id: 'company-1',
      stripeCustomerId: 'cus_test_123',
    };

    const mockSession = {
      id: 'bps_test_123',
      url: 'https://billing.stripe.com/test',
    };

    beforeEach(() => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.company.findUnique.mockResolvedValue(mockCompany);
      mockStripe.billingPortal.sessions.create = jest
        .fn()
        .mockResolvedValue(mockSession) as any;
    });

    it('should throw if Stripe is not configured', async () => {
      (service as any).stripe = null;

      await expect(
        service.createCustomerPortalSession('company-1', 'user-1'),
      ).rejects.toThrow('Stripe is not configured');
    });

    it('should throw if company has no Stripe customer ID', async () => {
      prismaService.company.findUnique.mockResolvedValue({
        ...mockCompany,
        stripeCustomerId: null,
      });

      await expect(
        service.createCustomerPortalSession('company-1', 'user-1'),
      ).rejects.toThrow(
        'Company does not have a Stripe customer ID. Please create a subscription first.',
      );
    });

    it('should create customer portal session', async () => {
      const result = await service.createCustomerPortalSession(
        'company-1',
        'user-1',
      );

      expect(result).toEqual({
        url: 'https://billing.stripe.com/test',
      });
      expect(mockStripe.billingPortal.sessions.create).toHaveBeenCalledWith({
        customer: 'cus_test_123',
        return_url: expect.stringContaining('/dashboard/pagamentos'),
      });
    });

    it('should use provided return URL', async () => {
      await service.createCustomerPortalSession(
        'company-1',
        'user-1',
        'https://custom-return-url.com',
      );

      expect(mockStripe.billingPortal.sessions.create).toHaveBeenCalledWith({
        customer: 'cus_test_123',
        return_url: 'https://custom-return-url.com',
      });
    });
  });

  describe('updateSubscription with Stripe', () => {
    const mockUser = {
      id: 'user-1',
      companyId: 'company-1',
      mainUser: true,
    };

    const mockSubscription = {
      id: 'sub-1',
      companyId: 'company-1',
      planId: 'plan-1',
      billingCycle: 'monthly',
      stripeSubscriptionId: 'sub_stripe_123',
      stripePriceId: 'price_old_123',
      company: { id: 'company-1' },
      plan: {
        id: 'plan-1',
        name: 'Avançado',
        status: 'active',
      },
    };

    const mockNewPlan = {
      id: 'plan-2',
      name: 'Padrão',
      status: 'active',
    };

    beforeEach(() => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.companySubscription.findUnique.mockResolvedValue(
        mockSubscription,
      );
      prismaService.plan.findUnique.mockResolvedValue(mockNewPlan);
      mockStripe.subscriptions.retrieve = jest.fn().mockResolvedValue({
        items: { data: [{ id: 'si_test_123' }] },
      }) as any;
      mockStripe.prices.list = jest
        .fn()
        .mockResolvedValue({ data: [{ id: 'price_new_123' }] }) as any;
      mockStripe.subscriptions.update = jest.fn().mockResolvedValue({}) as any;
    });

    it('should update Stripe subscription when plan changes', async () => {
      prismaService.companySubscription.update = jest.fn().mockResolvedValue({
        ...mockSubscription,
        planId: 'plan-2',
        plan: mockNewPlan,
      });

      await service.updateSubscription('sub-1', { planId: 'plan-2' }, 'user-1');

      expect(mockStripe.subscriptions.update).toHaveBeenCalledWith(
        'sub_stripe_123',
        expect.objectContaining({
          items: expect.arrayContaining([
            expect.objectContaining({
              id: 'si_test_123',
              price: 'price_new_123',
            }),
          ]),
        }),
      );
    });

    it('should update Stripe subscription when billing cycle changes', async () => {
      await service.updateSubscription(
        'sub-1',
        { billingCycle: 'annual' },
        'user-1',
      );

      expect(mockStripe.subscriptions.update).toHaveBeenCalled();
    });
  });

  describe('cancelSubscription with Stripe', () => {
    const mockUser = {
      id: 'user-1',
      companyId: 'company-1',
      mainUser: true,
    };

    const mockSubscription = {
      id: 'sub-1',
      companyId: 'company-1',
      isTrial: false,
      stripeSubscriptionId: 'sub_stripe_123',
      company: { id: 'company-1' },
    };

    beforeEach(() => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.companySubscription.findUnique.mockResolvedValue(
        mockSubscription,
      );
      mockStripe.subscriptions.cancel = jest.fn().mockResolvedValue({}) as any;
    });

    it('should cancel Stripe subscription', async () => {
      prismaService.companySubscription.update = jest.fn().mockResolvedValue({
        ...mockSubscription,
        status: 'cancelled',
        isActive: false,
        plan: { id: 'plan-1', name: 'Plan' },
      });

      await service.cancelSubscription('sub-1', 'user-1');

      expect(mockStripe.subscriptions.cancel).toHaveBeenCalledWith(
        'sub_stripe_123',
        {
          invoice_now: false,
          prorate: false,
        },
      );
    });

    it('should handle Stripe subscription already cancelled', async () => {
      const stripeError = new Stripe.errors.StripeInvalidRequestError({
        code: 'resource_missing',
        message: 'Subscription not found',
      } as any);
      mockStripe.subscriptions.cancel = jest
        .fn()
        .mockRejectedValue(stripeError) as any;

      prismaService.companySubscription.update = jest.fn().mockResolvedValue({
        ...mockSubscription,
        status: 'cancelled',
        isActive: false,
        plan: { id: 'plan-1', name: 'Plan' },
      });

      const loggerSpy = jest.spyOn((service as any).logger, 'warn');

      await service.cancelSubscription('sub-1', 'user-1');

      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('Stripe subscription sub_stripe_123 not found'),
      );
    });
  });

  describe('updateSubscription with Stripe integration', () => {
    const mockUser = {
      id: 'user-1',
      companyId: 'company-1',
      mainUser: true,
    };

    const mockSubscription = {
      id: 'sub-1',
      companyId: 'company-1',
      planId: 'plan-1',
      billingCycle: 'monthly',
      stripeSubscriptionId: 'sub_stripe_123',
      stripePriceId: 'price_old_123',
      company: { id: 'company-1' },
      plan: {
        id: 'plan-1',
        name: 'Avançado',
        status: 'active',
      },
    };

    const mockNewPlan = {
      id: 'plan-2',
      name: 'Padrão',
      status: 'active',
    };

    beforeEach(() => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.companySubscription.findUnique.mockResolvedValue(
        mockSubscription,
      );
      prismaService.plan.findUnique.mockResolvedValue(mockNewPlan);
      mockStripe.subscriptions.retrieve = jest.fn().mockResolvedValue({
        items: { data: [{ id: 'si_test_123' }] },
      }) as any;
      mockStripe.prices.list = jest
        .fn()
        .mockResolvedValue({ data: [{ id: 'price_new_123' }] }) as any;
      mockStripe.subscriptions.update = jest.fn().mockResolvedValue({}) as any;
    });

    it('should not update Stripe if subscription has no Stripe subscription ID', async () => {
      prismaService.companySubscription.findUnique.mockResolvedValue({
        ...mockSubscription,
        stripeSubscriptionId: null,
      });
      prismaService.companySubscription.update = jest.fn().mockResolvedValue({
        ...mockSubscription,
        planId: 'plan-2',
        plan: mockNewPlan,
      });

      await service.updateSubscription('sub-1', { planId: 'plan-2' }, 'user-1');

      expect(mockStripe.subscriptions.update).not.toHaveBeenCalled();
    });

    it('should not update Stripe if Stripe is not configured', async () => {
      (service as any).stripe = null;
      prismaService.companySubscription.update = jest.fn().mockResolvedValue({
        ...mockSubscription,
        planId: 'plan-2',
        plan: mockNewPlan,
      });

      await service.updateSubscription('sub-1', { planId: 'plan-2' }, 'user-1');

      expect(mockStripe.subscriptions.update).not.toHaveBeenCalled();
    });

    it('should handle Stripe error during update', async () => {
      const stripeError = new Error('Stripe API error');
      mockStripe.prices.list = jest.fn().mockRejectedValue(stripeError) as any;

      await expect(
        service.updateSubscription('sub-1', { planId: 'plan-2' }, 'user-1'),
      ).rejects.toThrow();
    });
  });

  describe('createSubscriptionWithPaymentMethod - full flow', () => {
    const mockUser = {
      id: 'user-1',
      companyId: 'company-1',
      mainUser: true,
      email: 'test@example.com',
    };

    const mockPlan = {
      id: 'plan-1',
      name: 'Avançado',
      status: 'active',
    };

    const mockCompany = {
      id: 'company-1',
      stripeCustomerId: null,
    };

    const mockPaymentMethod = {
      id: 'pm_test_123',
      type: 'card',
    };

    const mockPrice = {
      id: 'price_test_123',
      product: 'prod_test_123',
    };

    const mockCustomer = {
      id: 'cus_test_123',
    };

    const mockSubscription = {
      id: 'sub_test_123',
      status: 'active',
      latest_invoice: {
        id: 'in_test_123',
        status: 'paid',
        amount_paid: 10000,
      },
    };

    const mockNewSubscription = {
      id: 'sub-db-123',
      companyId: 'company-1',
      planId: 'plan-1',
      status: 'active',
      isActive: true,
      plan: mockPlan,
    };

    beforeEach(() => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.plan.findUnique.mockResolvedValue(mockPlan);
      prismaService.company.findUnique.mockResolvedValue(mockCompany);
      prismaService.company.update = jest.fn().mockResolvedValue({});
      mockStripe.paymentMethods.retrieve = jest
        .fn()
        .mockResolvedValue(mockPaymentMethod) as any;
      mockStripe.prices.list = jest
        .fn()
        .mockResolvedValue({ data: [mockPrice] }) as any;
      mockStripe.customers.create = jest
        .fn()
        .mockResolvedValue(mockCustomer) as any;
      mockStripe.paymentMethods.attach = jest.fn().mockResolvedValue({}) as any;
      mockStripe.customers.update = jest.fn().mockResolvedValue({}) as any;
      mockStripe.subscriptions.create = jest
        .fn()
        .mockResolvedValue(mockSubscription) as any;

      const mockTransaction = {
        companySubscription: {
          updateMany: jest.fn().mockResolvedValue({}),
          create: jest.fn().mockResolvedValue(mockNewSubscription),
        },
        company: {
          findUnique: jest.fn().mockResolvedValue(mockCompany),
          update: jest.fn().mockResolvedValue({}),
        },
      };

      prismaService.$transaction.mockImplementation(async (callback) => {
        return callback(mockTransaction as any);
      });
    });

    it('should handle draft invoice status', async () => {
      mockStripe.subscriptions.create = jest.fn().mockResolvedValue({
        ...mockSubscription,
        latest_invoice: {
          id: 'in_test_123',
          status: 'draft',
        },
      }) as any;
      mockStripe.invoices.finalizeInvoice = jest.fn().mockResolvedValue({
        id: 'in_test_123',
        status: 'open',
      }) as any;
      mockStripe.invoices.pay = jest.fn().mockResolvedValue({}) as any;

      jest
        .spyOn(service, 'createSubscription')
        .mockResolvedValue(mockNewSubscription as any);

      await service.createSubscriptionWithPaymentMethod(
        'company-1',
        'plan-1',
        'monthly',
        'pm_test_123',
        'user-1',
      );

      expect(mockStripe.invoices.finalizeInvoice).toHaveBeenCalled();
    });

    it('should handle incomplete subscription status', async () => {
      mockStripe.subscriptions.create = jest.fn().mockResolvedValue({
        ...mockSubscription,
        status: 'incomplete',
        latest_invoice: {
          id: 'in_test_123',
          status: 'open',
        },
      }) as any;

      jest
        .spyOn(service, 'createSubscription')
        .mockResolvedValue(mockNewSubscription as any);

      const loggerSpy = jest.spyOn((service as any).logger, 'warn');

      await service.createSubscriptionWithPaymentMethod(
        'company-1',
        'plan-1',
        'monthly',
        'pm_test_123',
        'user-1',
      );

      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('created but payment incomplete'),
      );
    });

    it('should handle cancelled subscription status', async () => {
      mockStripe.subscriptions.create = jest.fn().mockResolvedValue({
        ...mockSubscription,
        status: 'canceled',
      }) as any;

      jest
        .spyOn(service, 'createSubscription')
        .mockResolvedValue(mockNewSubscription as any);
      prismaService.companySubscription.update = jest.fn().mockResolvedValue({
        ...mockNewSubscription,
        status: 'cancelled',
      });

      await service.createSubscriptionWithPaymentMethod(
        'company-1',
        'plan-1',
        'monthly',
        'pm_test_123',
        'user-1',
      );

      expect(prismaService.companySubscription.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { status: 'cancelled' },
        }),
      );
    });
  });

  describe('syncSubscriptionStatus - status mapping', () => {
    const mockUser = {
      id: 'user-1',
      companyId: 'company-1',
      mainUser: true,
    };

    const mockSubscription = {
      id: 'sub-1',
      companyId: 'company-1',
      status: 'active',
      isActive: true,
      stripeSubscriptionId: 'sub_stripe_123',
      company: { id: 'company-1' },
    };

    beforeEach(() => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.companySubscription.findUnique.mockResolvedValue(
        mockSubscription,
      );
    });

    it('should handle past_due status', async () => {
      const subscriptionWithDifferentStatus = {
        ...mockSubscription,
        status: 'cancelled',
        isActive: false,
      };
      prismaService.companySubscription.findUnique.mockResolvedValue(
        subscriptionWithDifferentStatus,
      );

      mockStripe.subscriptions.retrieve = jest.fn().mockResolvedValue({
        id: 'sub_stripe_123',
        status: 'past_due',
        cancel_at: null,
        current_period_end: Math.floor(Date.now() / 1000) + 86400,
      }) as any;

      prismaService.companySubscription.update = jest.fn().mockResolvedValue({
        ...subscriptionWithDifferentStatus,
        status: 'active',
        isActive: true,
      });

      await service.syncSubscriptionStatus('sub-1', 'user-1');

      expect(prismaService.companySubscription.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'active',
            isActive: true,
          }),
        }),
      );
    });

    it('should handle trialing status', async () => {
      const subscriptionWithDifferentStatus = {
        ...mockSubscription,
        status: 'cancelled',
        isActive: false,
      };
      prismaService.companySubscription.findUnique.mockResolvedValue(
        subscriptionWithDifferentStatus,
      );

      mockStripe.subscriptions.retrieve = jest.fn().mockResolvedValue({
        id: 'sub_stripe_123',
        status: 'trialing',
        cancel_at: null,
        current_period_end: Math.floor(Date.now() / 1000) + 86400,
      }) as any;

      prismaService.companySubscription.update = jest.fn().mockResolvedValue({
        ...subscriptionWithDifferentStatus,
        status: 'active',
        isActive: true,
      });

      await service.syncSubscriptionStatus('sub-1', 'user-1');

      expect(prismaService.companySubscription.update).toHaveBeenCalled();
    });

    it('should handle incomplete_expired status', async () => {
      mockStripe.subscriptions.retrieve = jest.fn().mockResolvedValue({
        id: 'sub_stripe_123',
        status: 'incomplete_expired',
        cancel_at: null,
        current_period_end: Math.floor(Date.now() / 1000) + 86400,
      }) as any;

      prismaService.companySubscription.update = jest.fn().mockResolvedValue({
        ...mockSubscription,
        status: 'active',
        isActive: false,
      });

      await service.syncSubscriptionStatus('sub-1', 'user-1');

      expect(prismaService.companySubscription.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'active',
            isActive: false,
          }),
        }),
      );
    });

    it('should not update if status has not changed', async () => {
      mockStripe.subscriptions.retrieve = jest.fn().mockResolvedValue({
        id: 'sub_stripe_123',
        status: 'active',
        cancel_at: null,
        current_period_end: Math.floor(Date.now() / 1000) + 86400,
      }) as any;

      const result = await service.syncSubscriptionStatus('sub-1', 'user-1');

      expect(prismaService.companySubscription.update).not.toHaveBeenCalled();
      expect(result).toEqual(mockSubscription);
    });

    it('should set endDate from cancel_at', async () => {
      const cancelAt = Math.floor(Date.now() / 1000) + 86400;
      mockStripe.subscriptions.retrieve = jest.fn().mockResolvedValue({
        id: 'sub_stripe_123',
        status: 'canceled',
        cancel_at: cancelAt,
        current_period_end: null,
      }) as any;

      prismaService.companySubscription.update = jest.fn().mockResolvedValue({
        ...mockSubscription,
        status: 'cancelled',
        isActive: false,
        endDate: new Date(cancelAt * 1000),
      });

      await service.syncSubscriptionStatus('sub-1', 'user-1');

      expect(prismaService.companySubscription.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            endDate: new Date(cancelAt * 1000),
          }),
        }),
      );
    });

    it('should handle Stripe error', async () => {
      const stripeError = new Error('Stripe API error');
      mockStripe.subscriptions.retrieve = jest
        .fn()
        .mockRejectedValue(stripeError) as any;

      await expect(
        service.syncSubscriptionStatus('sub-1', 'user-1'),
      ).rejects.toThrow();
    });
  });

  describe('handleStripeError', () => {
    it('should handle StripeInvalidRequestError', () => {
      const error = new Stripe.errors.StripeInvalidRequestError({
        message: 'Invalid request',
      } as any);

      expect(() => {
        (service as any).handleStripeError(error);
      }).toThrow(BadRequestException);
    });

    it('should handle StripeAPIError', () => {
      const error = new Stripe.errors.StripeAPIError({
        message: 'API error',
      } as any);

      expect(() => {
        (service as any).handleStripeError(error);
      }).toThrow(BadRequestException);
    });

    it('should handle StripeAuthenticationError', () => {
      const error = new Stripe.errors.StripeAuthenticationError({
        message: 'Auth error',
      } as any);

      expect(() => {
        (service as any).handleStripeError(error);
      }).toThrow(BadRequestException);
    });

    it('should handle StripePermissionError', () => {
      const error = new Stripe.errors.StripePermissionError({
        message: 'Permission error',
      } as any);

      expect(() => {
        (service as any).handleStripeError(error);
      }).toThrow(ForbiddenException);
    });

    it('should handle StripeRateLimitError', () => {
      const error = new Stripe.errors.StripeRateLimitError({
        message: 'Rate limit error',
      } as any);

      expect(() => {
        (service as any).handleStripeError(error);
      }).toThrow(BadRequestException);
    });

    it('should handle generic StripeError', () => {
      const error = new Stripe.errors.StripeError({
        message: 'Generic error',
      } as any);

      expect(() => {
        (service as any).handleStripeError(error);
      }).toThrow(BadRequestException);
    });

    it('should re-throw non-Stripe errors', () => {
      const error = new Error('Non-Stripe error');

      expect(() => {
        (service as any).handleStripeError(error);
      }).toThrow('Non-Stripe error');
    });
  });
});
