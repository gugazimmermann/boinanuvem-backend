// Type definitions for test mocks to avoid unsafe any usage

export interface MockPrismaService {
  user: {
    findUnique: jest.Mock;
    update: jest.Mock;
    create?: jest.Mock;
  };
  company: {
    findUnique: jest.Mock;
    findFirst?: jest.Mock;
    create?: jest.Mock;
    update: jest.Mock;
  };
  companySubscription?: {
    findMany?: jest.Mock;
    findFirst?: jest.Mock;
    findUnique?: jest.Mock;
    create?: jest.Mock;
    update: jest.Mock;
    updateMany?: jest.Mock;
  };
  companyPayment?: {
    findMany?: jest.Mock;
    findUnique?: jest.Mock;
    create?: jest.Mock;
    update?: jest.Mock;
    count?: jest.Mock;
    aggregate?: jest.Mock;
  };
  plan?: {
    findUnique?: jest.Mock;
  };
  refreshToken: {
    findUnique: jest.Mock;
    create: jest.Mock;
    delete: jest.Mock;
    deleteMany?: jest.Mock;
  };
  $transaction?: jest.Mock;
}

export interface MockJwtService {
  sign: jest.Mock;
  verify?: jest.Mock;
}

export interface MockTrialService {
  calculateTrialInfo: jest.Mock;
  shouldUpdateTrialStatus: jest.Mock;
  initializeTrial?: jest.Mock;
  createTrialSubscription?: jest.Mock;
}

export interface MockAuthService {
  hashPassword?: jest.Mock;
  generateEmailVerificationToken?: jest.Mock;
  generateRefreshToken?: jest.Mock;
  enhanceCompanyWithTrialInfo?: jest.Mock;
}

export interface MockEmailService {
  sendEmailVerification?: jest.Mock;
  sendWelcomeEmail?: jest.Mock;
}

export interface TestUser {
  id: string;
  name: string;
  email: string;
  companyId: string;
  status?: string;
  mainUser?: boolean;
  permissions?: unknown;
  company?: TestCompany;
}

export interface TestCompany {
  id: string;
  name?: string;
  companyName?: string;
  subscriptions?: unknown[];
  plan?: unknown;
  trial?: {
    isOnTrial: boolean;
    isTrialExpired: boolean;
    trialDaysRemaining: number;
    trialStartDate?: Date | null;
    trialEndDate?: Date | null;
    trialStatus: string;
  };
  currentPlan?: unknown;
  currentSubscription?: unknown;
}

export interface TestRefreshToken {
  id: string;
  token: string;
  userId: string;
  expiresAt: Date;
  user?: TestUser;
}
