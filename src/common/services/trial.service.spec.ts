import { Test, TestingModule } from '@nestjs/testing';
import { TrialService } from './trial.service';

describe('TrialService', () => {
  let service: TrialService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TrialService],
    }).compile();

    service = module.get<TrialService>(TrialService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('calculateTrialInfo', () => {
    it('should return not on trial when company has active paid subscription', () => {
      const company = {
        trialStartDate: new Date('2025-01-01'),
        trialEndDate: new Date('2025-01-15'),
        trialStatus: 'active',
        createdAt: new Date('2025-01-01'),
        subscriptions: [
          {
            status: 'active',
            isActive: true,
            isTrial: false,
            endDate: null,
          },
        ],
      };

      const result = service.calculateTrialInfo(company);

      expect(result.isOnTrial).toBe(false);
      expect(result.isTrialExpired).toBe(false);
      expect(result.trialDaysRemaining).toBe(0);
      expect(result.trialStatus).toBe('active');
    });

    it('should return active trial info for company on trial', () => {
      const now = new Date();
      const trialStart = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000); // 5 days ago
      const trialEnd = new Date(now.getTime() + 9 * 24 * 60 * 60 * 1000); // 9 days from now

      const company = {
        trialStartDate: trialStart,
        trialEndDate: trialEnd,
        trialStatus: 'active',
        createdAt: trialStart,
        subscriptions: [
          {
            status: 'trial',
            isActive: true,
            isTrial: true,
            endDate: null,
          },
        ],
      };

      const result = service.calculateTrialInfo(company);

      expect(result.isOnTrial).toBe(true);
      expect(result.isTrialExpired).toBe(false);
      expect(result.trialDaysRemaining).toBe(9);
      expect(result.trialStatus).toBe('active');
      expect(result.trialStartDate).toEqual(trialStart);
      expect(result.trialEndDate).toEqual(trialEnd);
    });

    it('should return expired trial info for expired trial', () => {
      const now = new Date();
      const trialStart = new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000); // 20 days ago
      const trialEnd = new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000); // 6 days ago

      const company = {
        trialStartDate: trialStart,
        trialEndDate: trialEnd,
        trialStatus: 'active',
        createdAt: trialStart,
        subscriptions: [
          {
            status: 'trial',
            isActive: true,
            isTrial: true,
            endDate: null,
          },
        ],
      };

      const result = service.calculateTrialInfo(company);

      expect(result.isOnTrial).toBe(true);
      expect(result.isTrialExpired).toBe(true);
      expect(result.trialDaysRemaining).toBe(0);
      expect(result.trialStatus).toBe('active');
    });

    it('should calculate trial dates from company creation when not provided', () => {
      const createdAt = new Date('2025-01-01');
      const company = {
        trialStartDate: null,
        trialEndDate: null,
        trialStatus: 'active',
        createdAt,
        subscriptions: [],
      };

      const result = service.calculateTrialInfo(company);

      expect(result.isOnTrial).toBe(true);
      expect(result.trialStartDate).toEqual(createdAt);

      // Should be 14 days after creation
      const expectedEndDate = new Date(
        createdAt.getTime() + 14 * 24 * 60 * 60 * 1000,
      );
      expect(result.trialEndDate).toEqual(expectedEndDate);
    });

    it('should handle company with no subscriptions', () => {
      const now = new Date();
      const company = {
        trialStartDate: now,
        trialEndDate: new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000),
        trialStatus: 'active',
        createdAt: now,
      };

      const result = service.calculateTrialInfo(company);

      expect(result.isOnTrial).toBe(true);
      expect(result.trialDaysRemaining).toBe(10);
    });

    it('should auto-determine trial status based on expiration', () => {
      const now = new Date();
      const trialEnd = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000); // 1 day ago

      const company = {
        trialStartDate: new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000),
        trialEndDate: trialEnd,
        trialStatus: null,
        createdAt: new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000),
        subscriptions: [],
      };

      const result = service.calculateTrialInfo(company);

      expect(result.isOnTrial).toBe(true);
      expect(result.isTrialExpired).toBe(true);
      expect(result.trialStatus).toBe('expired');
    });
  });

  describe('initializeTrial', () => {
    it('should initialize trial with 14 days duration', () => {
      const createdAt = new Date('2025-01-01T10:00:00.000Z');

      const result = service.initializeTrial(createdAt);

      expect(result.trialStartDate).toEqual(createdAt);
      expect(result.trialStatus).toBe('active');

      // Should be exactly 14 days later
      const expectedEndDate = new Date('2025-01-15T10:00:00.000Z');
      expect(result.trialEndDate).toEqual(expectedEndDate);
    });

    it('should use current date when no date provided', () => {
      const beforeCall = new Date();
      const result = service.initializeTrial();
      const afterCall = new Date();

      expect(result.trialStartDate.getTime()).toBeGreaterThanOrEqual(
        beforeCall.getTime(),
      );
      expect(result.trialStartDate.getTime()).toBeLessThanOrEqual(
        afterCall.getTime(),
      );
      expect(result.trialStatus).toBe('active');

      // End date should be 14 days after start
      const expectedEndTime =
        result.trialStartDate.getTime() + 14 * 24 * 60 * 60 * 1000;
      expect(result.trialEndDate.getTime()).toBe(expectedEndTime);
    });
  });

  describe('createTrialSubscription', () => {
    it('should create trial subscription data with correct structure', () => {
      const companyId = 'company-123';
      const planId = 'plan-456';
      const createdAt = new Date('2025-01-01T10:00:00.000Z');

      const result = service.createTrialSubscription(
        companyId,
        planId,
        createdAt,
      );

      expect(result).toEqual({
        companyId,
        planId,
        status: 'trial',
        startDate: createdAt,
        endDate: null,
        billingCycle: 'monthly',
        isActive: true,
        isTrial: true,
        trialEndDate: new Date('2025-01-15T10:00:00.000Z'), // 14 days later
      });
    });

    it('should use current date when no date provided', () => {
      const companyId = 'company-123';
      const planId = 'plan-456';

      const beforeCall = new Date();
      const result = service.createTrialSubscription(companyId, planId);
      const afterCall = new Date();

      expect(result.companyId).toBe(companyId);
      expect(result.planId).toBe(planId);
      expect(result.status).toBe('trial');
      expect(result.isTrial).toBe(true);
      expect(result.isActive).toBe(true);
      expect(result.startDate.getTime()).toBeGreaterThanOrEqual(
        beforeCall.getTime(),
      );
      expect(result.startDate.getTime()).toBeLessThanOrEqual(
        afterCall.getTime(),
      );
    });
  });

  describe('shouldUpdateTrialStatus', () => {
    it('should return false if trial is already expired', () => {
      const company = {
        trialStatus: 'expired',
        trialEndDate: new Date(),
        createdAt: new Date(),
        subscriptions: [],
      };

      const result = service.shouldUpdateTrialStatus(company);

      expect(result).toBe(false);
    });

    it('should return false if trial is already converted', () => {
      const company = {
        trialStatus: 'converted',
        trialEndDate: new Date(),
        createdAt: new Date(),
        subscriptions: [],
      };

      const result = service.shouldUpdateTrialStatus(company);

      expect(result).toBe(false);
    });

    it('should return true if trial has expired but status is not updated', () => {
      const now = new Date();
      const expiredDate = new Date(now.getTime() - 24 * 60 * 60 * 1000); // 1 day ago

      const company = {
        trialStatus: 'active',
        trialEndDate: expiredDate,
        createdAt: new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000),
        subscriptions: [],
      };

      const result = service.shouldUpdateTrialStatus(company);

      expect(result).toBe(true);
    });

    it('should return false if trial is still active', () => {
      const now = new Date();
      const futureDate = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000); // 5 days from now

      const company = {
        trialStatus: 'active',
        trialEndDate: futureDate,
        createdAt: new Date(now.getTime() - 9 * 24 * 60 * 60 * 1000),
        subscriptions: [],
      };

      const result = service.shouldUpdateTrialStatus(company);

      expect(result).toBe(false);
    });

    it('should handle company with subscriptions', () => {
      const now = new Date();
      const expiredDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      const company = {
        trialStatus: 'active',
        trialEndDate: expiredDate,
        createdAt: new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000),
        subscriptions: [
          {
            status: 'trial',
            isActive: true,
            isTrial: true,
            endDate: null,
          },
        ],
      };

      const result = service.shouldUpdateTrialStatus(company);

      expect(result).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('should handle null/undefined values gracefully', () => {
      const company = {
        trialStartDate: null,
        trialEndDate: null,
        trialStatus: null,
        createdAt: new Date(),
      };

      const result = service.calculateTrialInfo(company);

      expect(result.isOnTrial).toBe(true);
      expect(result.trialStartDate).toEqual(company.createdAt);
    });

    it('should handle empty subscriptions array', () => {
      const company = {
        trialStartDate: new Date(),
        trialEndDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
        trialStatus: 'active',
        createdAt: new Date(),
        subscriptions: [],
      };

      const result = service.calculateTrialInfo(company);

      expect(result.isOnTrial).toBe(true);
    });

    it('should prioritize active paid subscription over trial subscription', () => {
      const company = {
        trialStartDate: new Date(),
        trialEndDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
        trialStatus: 'active',
        createdAt: new Date(),
        subscriptions: [
          {
            status: 'trial',
            isActive: true,
            isTrial: true,
            endDate: null,
          },
          {
            status: 'active',
            isActive: true,
            isTrial: false,
            endDate: null,
          },
        ],
      };

      const result = service.calculateTrialInfo(company);

      expect(result.isOnTrial).toBe(false);
    });
  });
});
