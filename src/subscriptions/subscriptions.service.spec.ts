import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import {
  SubscriptionsService,
  CreateSubscriptionDto,
  UpdateSubscriptionDto,
} from './subscriptions.service';
import { PrismaService } from '../common/services/prisma.service';

describe('SubscriptionsService', () => {
  let service: SubscriptionsService;
  let prismaService: MockPrismaService;

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
      update: jest.Mock;
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
      update: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubscriptionsService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<SubscriptionsService>(SubscriptionsService);
    prismaService = module.get<MockPrismaService>(PrismaService);
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
});
