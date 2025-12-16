import { Test, TestingModule } from '@nestjs/testing';
import { SubscriptionsController } from './subscriptions.controller';
import { SubscriptionsService } from './subscriptions.service';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';

describe('SubscriptionsController', () => {
  let controller: SubscriptionsController;
  let service: jest.Mocked<SubscriptionsService>;

  const mockSubscriptionsService = {
    createCheckoutSession: jest.fn(),
    createSubscriptionWithPaymentMethod: jest.fn(),
    confirmSubscription: jest.fn(),
    cancelSubscription: jest.fn(),
    syncSubscriptionStatus: jest.fn(),
    createCustomerPortalSession: jest.fn(),
  };

  const mockUser = {
    id: 'user-1',
    companyId: 'company-1',
    email: 'test@example.com',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SubscriptionsController],
      providers: [
        {
          provide: SubscriptionsService,
          useValue: mockSubscriptionsService,
        },
      ],
    })
      .overrideGuard(ThrottlerGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(PermissionsGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<SubscriptionsController>(SubscriptionsController);
    service = module.get(SubscriptionsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createCheckoutSession', () => {
    it('should create checkout session', async () => {
      const dto = {
        planId: 'plan-1',
        billingCycle: 'monthly' as const,
      };
      const expectedResult = {
        sessionId: 'cs_test_123',
        url: 'https://checkout.stripe.com/test',
      };

      service.createCheckoutSession.mockResolvedValue(expectedResult);

      const result = await controller.createCheckoutSession(dto, mockUser);

      expect(result).toEqual(expectedResult);
      expect(service.createCheckoutSession).toHaveBeenCalledWith(
        'company-1',
        'plan-1',
        'monthly',
        'user-1',
      );
    });

    it('should propagate errors from service', async () => {
      const dto = {
        planId: 'plan-1',
        billingCycle: 'monthly' as const,
      };

      service.createCheckoutSession.mockRejectedValue(
        new BadRequestException('Plan not found'),
      );

      await expect(
        controller.createCheckoutSession(dto, mockUser),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('createSubscriptionWithPaymentMethod', () => {
    it('should create subscription with payment method', async () => {
      const dto = {
        planId: 'plan-1',
        billingCycle: 'monthly' as const,
        paymentMethodId: 'pm_test_123',
      };
      const expectedResult = {
        id: 'sub-1',
        companyId: 'company-1',
        status: 'active',
      };

      service.createSubscriptionWithPaymentMethod.mockResolvedValue(
        expectedResult as any,
      );

      const result = await controller.createSubscriptionWithPaymentMethod(
        dto,
        mockUser,
      );

      expect(result).toEqual(expectedResult);
      expect(service.createSubscriptionWithPaymentMethod).toHaveBeenCalledWith(
        'company-1',
        'plan-1',
        'monthly',
        'pm_test_123',
        'user-1',
      );
    });

    it('should propagate errors from service', async () => {
      const dto = {
        planId: 'plan-1',
        billingCycle: 'monthly' as const,
        paymentMethodId: 'pm_test_123',
      };

      service.createSubscriptionWithPaymentMethod.mockRejectedValue(
        new ForbiddenException('Access denied'),
      );

      await expect(
        controller.createSubscriptionWithPaymentMethod(dto, mockUser),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('confirmSubscription', () => {
    it('should confirm subscription', async () => {
      const dto = {
        sessionId: 'cs_test_123',
      };
      const expectedResult = {
        id: 'sub-1',
        companyId: 'company-1',
        status: 'active',
      };

      service.confirmSubscription.mockResolvedValue(expectedResult as any);

      const result = await controller.confirmSubscription(dto, mockUser);

      expect(result).toEqual(expectedResult);
      expect(service.confirmSubscription).toHaveBeenCalledWith(
        'cs_test_123',
        'user-1',
      );
    });

    it('should propagate errors from service', async () => {
      const dto = {
        sessionId: 'cs_test_123',
      };

      service.confirmSubscription.mockRejectedValue(
        new BadRequestException('Payment not completed'),
      );

      await expect(
        controller.confirmSubscription(dto, mockUser),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('cancelSubscription', () => {
    it('should cancel subscription', async () => {
      const dto = {
        cancelImmediately: false,
      };
      const expectedResult = {
        id: 'sub-1',
        status: 'cancelled',
        isActive: false,
      };

      service.cancelSubscription.mockResolvedValue(expectedResult as any);

      const result = await controller.cancelSubscription(
        'sub-1',
        dto,
        mockUser,
      );

      expect(result).toEqual(expectedResult);
      expect(service.cancelSubscription).toHaveBeenCalledWith(
        'sub-1',
        'user-1',
        false,
      );
    });

    it('should cancel subscription immediately', async () => {
      const dto = {
        cancelImmediately: true,
      };

      service.cancelSubscription.mockResolvedValue({} as any);

      await controller.cancelSubscription('sub-1', dto, mockUser);

      expect(service.cancelSubscription).toHaveBeenCalledWith(
        'sub-1',
        'user-1',
        true,
      );
    });
  });

  describe('syncSubscriptionStatus', () => {
    it('should sync subscription status', async () => {
      const expectedResult = {
        id: 'sub-1',
        status: 'active',
        isActive: true,
      };

      service.syncSubscriptionStatus.mockResolvedValue(expectedResult as any);

      const result = await controller.syncSubscriptionStatus('sub-1', mockUser);

      expect(result).toEqual(expectedResult);
      expect(service.syncSubscriptionStatus).toHaveBeenCalledWith(
        'sub-1',
        'user-1',
      );
    });

    it('should propagate errors from service', async () => {
      service.syncSubscriptionStatus.mockRejectedValue(
        new BadRequestException('Stripe is not configured'),
      );

      await expect(
        controller.syncSubscriptionStatus('sub-1', mockUser),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('createCustomerPortalSession', () => {
    it('should create customer portal session', async () => {
      const dto = {
        returnUrl: 'https://custom-return-url.com',
      };
      const expectedResult = {
        url: 'https://billing.stripe.com/test',
      };

      service.createCustomerPortalSession.mockResolvedValue(expectedResult);

      const result = await controller.createCustomerPortalSession(
        dto,
        mockUser,
      );

      expect(result).toEqual(expectedResult);
      expect(service.createCustomerPortalSession).toHaveBeenCalledWith(
        'company-1',
        'user-1',
        'https://custom-return-url.com',
      );
    });

    it('should create customer portal session without return URL', async () => {
      const dto = {};
      const expectedResult = {
        url: 'https://billing.stripe.com/test',
      };

      service.createCustomerPortalSession.mockResolvedValue(expectedResult);

      const result = await controller.createCustomerPortalSession(
        dto,
        mockUser,
      );

      expect(result).toEqual(expectedResult);
      expect(service.createCustomerPortalSession).toHaveBeenCalledWith(
        'company-1',
        'user-1',
        undefined,
      );
    });

    it('should propagate errors from service', async () => {
      const dto = {};

      service.createCustomerPortalSession.mockRejectedValue(
        new BadRequestException('Company does not have a Stripe customer ID'),
      );

      await expect(
        controller.createCustomerPortalSession(dto, mockUser),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
