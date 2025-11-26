import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../common/services/prisma.service';

export interface CreateSubscriptionDto {
  companyId: string;
  planId: string;
  billingCycle: 'monthly' | 'annual';
}

export interface UpdateSubscriptionDto {
  planId?: string;
  billingCycle?: 'monthly' | 'annual';
  status?: 'active' | 'cancelled' | 'expired';
}

@Injectable()
export class SubscriptionsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Get all subscriptions for a company
   */
  async getCompanySubscriptions(companyId: string, userId: string) {
    // Verify user belongs to the company
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || user.companyId !== companyId) {
      throw new ForbiddenException('Access denied to this company');
    }

    return this.prisma.companySubscription.findMany({
      where: { companyId },
      include: {
        plan: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  /**
   * Get current active subscription for a company
   */
  async getCurrentSubscription(companyId: string, userId: string) {
    // Verify user belongs to the company
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || user.companyId !== companyId) {
      throw new ForbiddenException('Access denied to this company');
    }

    const subscription = await this.prisma.companySubscription.findFirst({
      where: {
        companyId,
        isActive: true,
      },
      include: {
        plan: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (!subscription) {
      throw new NotFoundException('No active subscription found');
    }

    return subscription;
  }

  /**
   * Create a new subscription (upgrade from trial or change plan)
   */
  async createSubscription(dto: CreateSubscriptionDto, userId: string) {
    // Verify user belongs to the company and is main user
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || user.companyId !== dto.companyId) {
      throw new ForbiddenException('Access denied to this company');
    }

    if (!user.mainUser) {
      throw new ForbiddenException('Only main users can manage subscriptions');
    }

    // Verify plan exists
    const plan = await this.prisma.plan.findUnique({
      where: { id: dto.planId },
    });

    if (!plan || plan.status !== 'active') {
      throw new NotFoundException('Plan not found or inactive');
    }

    return this.prisma.$transaction(async (tx) => {
      // Deactivate current active subscription
      await tx.companySubscription.updateMany({
        where: {
          companyId: dto.companyId,
          isActive: true,
        },
        data: {
          isActive: false,
          status: 'cancelled',
        },
      });

      // Create new subscription
      const subscription = await tx.companySubscription.create({
        data: {
          companyId: dto.companyId,
          planId: dto.planId,
          billingCycle: dto.billingCycle,
          status: 'active',
          isActive: true,
          isTrial: false,
        },
        include: {
          plan: true,
        },
      });

      // Update company trial status to converted
      await tx.company.update({
        where: { id: dto.companyId },
        data: { trialStatus: 'converted' },
      });

      return subscription;
    });
  }

  /**
   * Update an existing subscription
   */
  async updateSubscription(
    subscriptionId: string,
    dto: UpdateSubscriptionDto,
    userId: string,
  ) {
    // Get subscription and verify access
    const subscription = await this.prisma.companySubscription.findUnique({
      where: { id: subscriptionId },
      include: { company: true },
    });

    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }

    // Verify user belongs to the company and is main user
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || user.companyId !== subscription.companyId) {
      throw new ForbiddenException('Access denied to this subscription');
    }

    if (!user.mainUser) {
      throw new ForbiddenException('Only main users can manage subscriptions');
    }

    // If changing plan, verify new plan exists
    if (dto.planId) {
      const plan = await this.prisma.plan.findUnique({
        where: { id: dto.planId },
      });

      if (!plan || plan.status !== 'active') {
        throw new NotFoundException('Plan not found or inactive');
      }
    }

    return this.prisma.companySubscription.update({
      where: { id: subscriptionId },
      data: dto,
      include: {
        plan: true,
      },
    });
  }

  /**
   * Cancel a subscription
   */
  async cancelSubscription(subscriptionId: string, userId: string) {
    // Get subscription and verify access
    const subscription = await this.prisma.companySubscription.findUnique({
      where: { id: subscriptionId },
      include: { company: true },
    });

    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }

    // Verify user belongs to the company and is main user
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || user.companyId !== subscription.companyId) {
      throw new ForbiddenException('Access denied to this subscription');
    }

    if (!user.mainUser) {
      throw new ForbiddenException('Only main users can manage subscriptions');
    }

    if (subscription.isTrial) {
      throw new BadRequestException('Cannot cancel trial subscription');
    }

    return this.prisma.companySubscription.update({
      where: { id: subscriptionId },
      data: {
        status: 'cancelled',
        isActive: false,
      },
      include: {
        plan: true,
      },
    });
  }

  /**
   * Get subscription usage and limits
   */
  async getSubscriptionUsage(companyId: string, userId: string) {
    // Verify user belongs to the company
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || user.companyId !== companyId) {
      throw new ForbiddenException('Access denied to this company');
    }

    const subscription = await this.getCurrentSubscription(companyId, userId);

    // Get current usage (this would be implemented based on your business logic)
    const usage = {
      properties: 0, // Count from properties table
      locations: 0, // Count from locations table
      animals: 0, // Count from animals table
      members: 0, // Count from users table
    };

    // Get plan limits
    const limits = subscription.plan.limits as Record<string, unknown>;

    return {
      subscription,
      usage,
      limits,
      isWithinLimits: {
        properties: this.checkLimit(
          usage.properties,
          limits.properties as string,
        ),
        locations: this.checkLimit(usage.locations, limits.locations as string),
        animals: this.checkLimit(usage.animals, limits.animals as string),
        members: this.checkLimit(usage.members, limits.members as string),
      },
    };
  }

  private checkLimit(current: number, limit: string): boolean {
    if (limit === 'Ilimitados' || limit === 'Ilimitadas') {
      return true;
    }

    const numericLimit = parseInt(limit.replace(/\D/g, ''));
    return current <= numericLimit;
  }
}
