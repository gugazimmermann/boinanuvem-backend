import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { PrismaService } from '../common/services/prisma.service';
import { TrialService } from '../common/services/trial.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { EmailService } from '../email/email.service';
import * as bcrypt from 'bcrypt';

// Mock bcrypt
jest.mock('bcrypt');
const mockedBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;

interface MockPrismaService {
  user: {
    findUnique: jest.Mock;
    update: jest.Mock;
  };
  company: {
    update: jest.Mock;
  };
  companySubscription: {
    update: jest.Mock;
  };
  refreshToken: {
    findUnique: jest.Mock;
    create: jest.Mock;
    delete: jest.Mock;
    deleteMany: jest.Mock;
  };
}

describe('AuthService', () => {
  let service: AuthService;
  let prismaService: MockPrismaService;
  let trialService: jest.Mocked<TrialService>;
  let jwtService: jest.Mocked<JwtService>;

  const mockPrismaService: MockPrismaService = {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    company: {
      update: jest.fn(),
    },
    companySubscription: {
      update: jest.fn(),
    },
    refreshToken: {
      findUnique: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
    },
  };

  const mockTrialService = {
    calculateTrialInfo: jest.fn(),
    shouldUpdateTrialStatus: jest.fn(),
  } as jest.Mocked<TrialService>;

  const mockJwtService = {
    sign: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn().mockReturnValue('test-secret'),
  };

  const mockEmailService = {
    sendEmailVerification: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: TrialService, useValue: mockTrialService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: EmailService, useValue: mockEmailService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    prismaService = module.get<MockPrismaService>(PrismaService);
    trialService = module.get<jest.Mocked<TrialService>>(TrialService);
    jwtService = module.get<jest.Mocked<JwtService>>(JwtService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('hashPassword', () => {
    it('should hash a password', async () => {
      mockedBcrypt.hash.mockResolvedValue('hashed-password' as never);

      const result = await service.hashPassword('password');

      expect(result).toBe('hashed-password');
      expect(mockedBcrypt.hash).toHaveBeenCalledWith('password', 12);
    });
  });

  describe('validateUser', () => {
    const mockCompany = {
      id: 'company-1',
      subscriptions: [
        {
          id: 'sub-1',
          status: 'trial',
          isActive: true,
          isTrial: true,
          plan: {
            id: 'plan-1',
            name: 'Avançado',
            description: 'Advanced plan',
          },
        },
      ],
    } as const;

    const mockUser = {
      id: 'user-1',
      email: 'test@example.com',
      name: 'Test User',
      password: 'hashed-password',
      status: 'active',
      companyId: 'company-1',
      mainUser: true,
      permissions: { test: true },
      company: mockCompany,
    } as const;

    it('should return null when user does not exist', async () => {
      prismaService.user.findUnique.mockResolvedValue(null);

      const result = await service.validateUser('test@example.com', 'password');

      expect(result).toBeNull();
    });

    it('should return null when password is invalid', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      mockedBcrypt.compare.mockResolvedValue(false as never);

      const result = await service.validateUser(
        'test@example.com',
        'wrong-password',
      );

      expect(result).toBeNull();
    });

    it('should throw UnauthorizedException when user is not active', async () => {
      const inactiveUser = { ...mockUser, status: 'pending' };
      prismaService.user.findUnique.mockResolvedValue(inactiveUser);
      mockedBcrypt.compare.mockResolvedValue(true as never);

      await expect(
        service.validateUser('test@example.com', 'password'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should return user without password when validation succeeds', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.user.update.mockResolvedValue(mockUser);
      mockedBcrypt.compare.mockResolvedValue(true as never);

      const result = await service.validateUser('test@example.com', 'password');

      expect(result).toEqual({
        id: 'user-1',
        email: 'test@example.com',
        name: 'Test User',
        status: 'active',
        companyId: 'company-1',
        mainUser: true,
        permissions: { test: true },
        company: mockCompany,
      });
      expect(result).not.toHaveProperty('password');
    });

    it('should update user lastAccess on successful validation', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.user.update.mockResolvedValue(mockUser);
      mockedBcrypt.compare.mockResolvedValue(true as never);

      await service.validateUser('test@example.com', 'password');

      expect(prismaService.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { lastAccess: expect.any(Date) as Date },
      });
    });

    it('should include company with subscriptions in query', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.user.update.mockResolvedValue(mockUser);
      mockedBcrypt.compare.mockResolvedValue(true as never);

      await service.validateUser('test@example.com', 'password');

      expect(prismaService.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
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
    });
  });

  describe('login', () => {
    const mockUser = {
      id: 'user-1',
      email: 'test@example.com',
      name: 'Test User',
      companyId: 'company-1',
      mainUser: true,
      permissions: { test: true },
      company: {
        id: 'company-1',
        subscriptions: [],
      },
    };

    const mockTrialInfo = {
      isOnTrial: true,
      isTrialExpired: false,
      trialDaysRemaining: 14,
      trialStartDate: new Date(),
      trialEndDate: new Date(),
      trialStatus: 'active' as const,
    };

    beforeEach(() => {
      jwtService.sign.mockReturnValue('mock-jwt-token');
      trialService.calculateTrialInfo.mockReturnValue(mockTrialInfo);
      trialService.shouldUpdateTrialStatus.mockReturnValue(false);
      jest
        .spyOn(service, 'generateRefreshToken')
        .mockImplementation(() => Promise.resolve('mock-refresh-token'));
    });

    it('should return login response with enhanced company data', async () => {
      const result = await service.login(mockUser);

      expect(result).toEqual({
        access_token: 'mock-jwt-token',
        refresh_token: 'mock-refresh-token',
        user: {
          id: 'user-1',
          email: 'test@example.com',
          name: 'Test User',
          mainUser: true,
          companyId: 'company-1',
          permissions: { test: true },
          company: {
            id: 'company-1',
            subscriptions: [],
            trial: mockTrialInfo,
            currentPlan: null,
            currentSubscription: null,
          },
        },
      });
    });

    it('should generate JWT with correct payload', async () => {
      await service.login(mockUser);

      expect(jwtService.sign).toHaveBeenCalledWith(
        {
          sub: 'user-1',
          email: 'test@example.com',
          companyId: 'company-1',
          mainUser: true,
        },
        { expiresIn: '7d' },
      );
    });

    it('should enhance company data with trial information', async () => {
      await service.login(mockUser);

      expect(trialService.calculateTrialInfo).toHaveBeenCalledWith({
        trialStartDate: undefined,
        trialEndDate: undefined,
        trialStatus: undefined,
        createdAt: undefined,
        subscriptions: [],
      });
    });

    it('should update trial status if needed', async () => {
      trialService.shouldUpdateTrialStatus.mockReturnValue(true);
      prismaService.company.update.mockResolvedValue({});

      await service.login(mockUser);

      expect(prismaService.company.update).toHaveBeenCalledWith({
        where: { id: 'company-1' },
        data: { trialStatus: 'expired' },
      });
    });

    it('should include current plan and subscription when available', async () => {
      const userWithSubscription = {
        ...mockUser,
        company: {
          id: 'company-1',
          subscriptions: [
            {
              id: 'sub-1',
              status: 'active',
              isActive: true,
              isTrial: false,
              plan: {
                id: 'plan-1',
                name: 'Avançado',
              },
            },
          ],
        },
      };

      const result = (await service.login(userWithSubscription)) as any;

      expect(result.user.company.currentPlan).toEqual({
        id: 'plan-1',
        name: 'Avançado',
      });
      expect(result.user.company.currentSubscription).toEqual({
        id: 'sub-1',
        status: 'active',
        isActive: true,
        isTrial: false,
        plan: {
          id: 'plan-1',
          name: 'Avançado',
        },
      });
    });
  });

  describe('refreshToken', () => {
    const mockTokenRecord = {
      id: 'token-1',
      token: 'refresh-token',
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 1 day from now
      user: {
        id: 'user-1',
        email: 'test@example.com',
        name: 'Test User',
        status: 'active',
        companyId: 'company-1',
        mainUser: true,
        permissions: { test: true },
        company: {
          id: 'company-1',
          subscriptions: [],
        },
      },
    };

    beforeEach(() => {
      jwtService.sign.mockReturnValue('new-jwt-token');
      trialService.calculateTrialInfo.mockReturnValue({
        isOnTrial: true,
        isTrialExpired: false,
        trialDaysRemaining: 14,
        trialStartDate: new Date(),
        trialEndDate: new Date(),
        trialStatus: 'active' as const,
      });
      trialService.shouldUpdateTrialStatus.mockReturnValue(false);
      jest
        .spyOn(service, 'generateRefreshToken')
        .mockImplementation(() => Promise.resolve('new-refresh-token'));
    });

    it('should throw UnauthorizedException for invalid token', async () => {
      prismaService.refreshToken.findUnique.mockResolvedValue(null);

      await expect(service.refreshToken('invalid-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException for expired token', async () => {
      const expiredTokenRecord = {
        ...mockTokenRecord,
        expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
      };
      prismaService.refreshToken.findUnique.mockResolvedValue(
        expiredTokenRecord,
      );

      await expect(service.refreshToken('expired-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException for inactive user', async () => {
      const inactiveUserTokenRecord = {
        ...mockTokenRecord,
        user: { ...mockTokenRecord.user, status: 'inactive' },
      };
      prismaService.refreshToken.findUnique.mockResolvedValue(
        inactiveUserTokenRecord,
      );

      await expect(service.refreshToken('token')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should return new tokens with enhanced company data', async () => {
      prismaService.refreshToken.findUnique.mockResolvedValue(mockTokenRecord);
      prismaService.refreshToken.delete.mockResolvedValue({});

      const result = await service.refreshToken('valid-token');

      expect(result).toEqual({
        access_token: 'new-jwt-token',
        refresh_token: 'new-refresh-token',
        user: {
          id: 'user-1',
          email: 'test@example.com',
          name: 'Test User',
          mainUser: true,
          companyId: 'company-1',
          permissions: { test: true },
          company: {
            id: 'company-1',
            subscriptions: [],
            trial: expect.any(Object) as Record<string, unknown>,
            currentPlan: null,
            currentSubscription: null,
          },
        },
      });
    });

    it('should delete old refresh token', async () => {
      prismaService.refreshToken.findUnique.mockResolvedValue(mockTokenRecord);
      prismaService.refreshToken.delete.mockResolvedValue({});

      await service.refreshToken('valid-token');

      expect(prismaService.refreshToken.delete).toHaveBeenCalledWith({
        where: { id: 'token-1' },
      });
    });

    it('should include company subscriptions in query', async () => {
      prismaService.refreshToken.findUnique.mockResolvedValue(mockTokenRecord);
      prismaService.refreshToken.delete.mockResolvedValue({});

      await service.refreshToken('valid-token');

      expect(prismaService.refreshToken.findUnique).toHaveBeenCalledWith({
        where: { token: 'valid-token' },
        include: {
          user: {
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
          },
        },
      });
    });
  });
});
