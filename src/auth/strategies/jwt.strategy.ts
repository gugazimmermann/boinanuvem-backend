import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../common/services/prisma.service';
import { TrialService } from '../../common/services/trial.service';

export interface JwtPayload {
  sub: string;
  email: string;
  companyId: string;
  mainUser: boolean;
  iat?: number;
  exp?: number;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    private prisma: PrismaService,
    private trialService: TrialService,
  ) {
    const secret = configService.get<string>('JWT_SECRET');
    if (!secret) {
      throw new Error('JWT_SECRET is required');
    }

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  async validate(payload: JwtPayload): Promise<unknown> {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: {
        company: {
          include: {
            subscriptions: {
              include: {
                plan: true,
              },
              orderBy: {
                createdAt: 'desc',
              },
            },
          },
        },
      },
    });

    if (!user || user.status !== 'active') {
      throw new UnauthorizedException('User not found or inactive');
    }

    // Enhance company data with trial information
    const enhancedCompany = await this.enhanceCompanyWithTrialInfo(
      user.company,
    );

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      companyId: user.companyId,
      mainUser: user.mainUser,
      permissions: user.permissions,
      company: enhancedCompany,
    };
  }

  /**
   * Enhance company data with trial information and plan details
   */
  private async enhanceCompanyWithTrialInfo(
    company: unknown,
  ): Promise<unknown> {
    if (!company) {
      return company;
    }

    // Get current active subscription
    const companyData = company as Record<string, unknown>;
    const subscriptions = companyData.subscriptions as unknown[] | undefined;
    const activeSubscription = subscriptions?.find((sub: unknown) => {
      const subscription = sub as Record<string, unknown>;
      return (
        subscription.isActive &&
        (subscription.status === 'active' || subscription.status === 'trial')
      );
    });

    // Calculate trial information
    const trialInfo = this.trialService.calculateTrialInfo({
      trialStartDate: companyData.trialStartDate as Date | null,
      trialEndDate: companyData.trialEndDate as Date | null,
      trialStatus: companyData.trialStatus as string | null,
      createdAt: companyData.createdAt as Date,
      subscriptions: subscriptions,
    });

    // Update trial status in database if needed
    if (
      this.trialService.shouldUpdateTrialStatus({
        trialStatus: companyData.trialStatus as string | null,
        trialEndDate: companyData.trialEndDate as Date | null,
        createdAt: companyData.createdAt as Date,
        subscriptions: subscriptions,
      })
    ) {
      await this.prisma.company.update({
        where: { id: companyData.id as string },
        data: { trialStatus: 'expired' },
      });

      // Also update trial subscription status if it exists
      const trialSubscription = subscriptions?.find((sub: unknown) => {
        const subscription = sub as Record<string, unknown>;
        return subscription.isTrial && subscription.isActive;
      });
      if (trialSubscription) {
        const trialSub = trialSubscription as Record<string, unknown>;
        await this.prisma.companySubscription.update({
          where: { id: trialSub.id as string },
          data: { status: 'expired', isActive: false },
        });
      }
    }

    const activeSubscriptionData = activeSubscription as
      | Record<string, unknown>
      | undefined;
    return {
      ...companyData,
      trial: trialInfo,
      currentPlan: activeSubscriptionData?.plan || null,
      currentSubscription: activeSubscription || null,
    };
  }
}
