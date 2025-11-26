import { Injectable } from '@nestjs/common';

interface SubscriptionLike {
  isActive: boolean;
  status: string;
  isTrial: boolean;
  endDate?: Date | null;
}

export interface TrialInfo {
  isOnTrial: boolean;
  isTrialExpired: boolean;
  trialDaysRemaining: number;
  trialStartDate: Date | null;
  trialEndDate: Date | null;
  trialStatus: 'active' | 'expired' | 'converted' | null;
}

@Injectable()
export class TrialService {
  private readonly TRIAL_DURATION_DAYS = 14; // 14 days trial period

  /**
   * Calculate trial information for a company
   */
  calculateTrialInfo(company: {
    trialStartDate: Date | null;
    trialEndDate: Date | null;
    trialStatus: string | null;
    createdAt: Date;
    subscriptions: unknown[] | undefined;
  }): TrialInfo {
    const now = new Date();

    // Check if company has an active paid subscription
    const activePaidSubscription = company.subscriptions?.find(
      (sub): sub is SubscriptionLike => {
        const subscription = sub as SubscriptionLike;
        return (
          subscription.isActive &&
          subscription.status === 'active' &&
          !subscription.isTrial
        );
      },
    );

    if (activePaidSubscription) {
      return {
        isOnTrial: false,
        isTrialExpired: false,
        trialDaysRemaining: 0,
        trialStartDate: company.trialStartDate,
        trialEndDate: company.trialEndDate,
        trialStatus: company.trialStatus as 'converted' | null,
      };
    }

    // Determine trial start date
    const trialStartDate = company.trialStartDate ?? company.createdAt;

    // Calculate trial end date
    const trialEndDate =
      company.trialEndDate ??
      new Date(
        trialStartDate.getTime() +
          this.TRIAL_DURATION_DAYS * 24 * 60 * 60 * 1000,
      );

    // Check if trial is expired
    const isTrialExpired = now > trialEndDate;

    // Calculate days remaining
    const timeDiff = trialEndDate.getTime() - now.getTime();
    const trialDaysRemaining = Math.max(
      0,
      Math.ceil(timeDiff / (24 * 60 * 60 * 1000)),
    );

    // Determine trial status
    let trialStatus: 'active' | 'expired' | 'converted' | null =
      company.trialStatus as 'active' | 'expired' | 'converted' | null;
    if (!trialStatus) {
      trialStatus = isTrialExpired ? 'expired' : 'active';
    }

    return {
      isOnTrial: true,
      isTrialExpired,
      trialDaysRemaining,
      trialStartDate,
      trialEndDate,
      trialStatus,
    };
  }

  /**
   * Initialize trial for a new company
   */
  initializeTrial(createdAt: Date = new Date()): {
    trialStartDate: Date;
    trialEndDate: Date;
    trialStatus: string;
  } {
    const trialStartDate = createdAt;
    const trialEndDate = new Date(
      trialStartDate.getTime() + this.TRIAL_DURATION_DAYS * 24 * 60 * 60 * 1000,
    );

    return {
      trialStartDate,
      trialEndDate,
      trialStatus: 'active',
    };
  }

  /**
   * Create trial subscription data for "Avançado" plan
   */
  createTrialSubscription(
    companyId: string,
    advancedPlanId: string,
    createdAt: Date = new Date(),
  ) {
    const trialEndDate = new Date(
      createdAt.getTime() + this.TRIAL_DURATION_DAYS * 24 * 60 * 60 * 1000,
    );

    return {
      companyId,
      planId: advancedPlanId,
      status: 'trial',
      startDate: createdAt,
      endDate: null, // No end date for subscription itself
      billingCycle: 'monthly',
      isActive: true,
      isTrial: true,
      trialEndDate,
    };
  }

  /**
   * Check if a company's trial has expired and needs to be updated
   */
  shouldUpdateTrialStatus(company: {
    trialStatus: string | null;
    trialEndDate: Date | null;
    createdAt: Date;
    subscriptions: unknown[] | undefined;
  }): boolean {
    if (
      company.trialStatus === 'expired' ||
      company.trialStatus === 'converted'
    ) {
      return false;
    }

    const trialInfo = this.calculateTrialInfo({
      trialStartDate: null,
      trialEndDate: company.trialEndDate,
      trialStatus: company.trialStatus,
      createdAt: company.createdAt,
      subscriptions: company.subscriptions ?? [],
    });

    return trialInfo.isTrialExpired && company.trialStatus !== 'expired';
  }
}
