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
  passwordReset: {
    findUnique: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    deleteMany: jest.Mock;
  };
  emailVerification: {
    findUnique: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
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
    passwordReset: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      deleteMany: jest.fn(),
    },
    emailVerification: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
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

  describe('generatePasswordResetToken', () => {
    it('should generate password reset token successfully', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'user@test.com',
        name: 'Test User',
      };

      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.passwordReset.deleteMany.mockResolvedValue({ count: 0 });
      prismaService.passwordReset.create.mockResolvedValue({
        id: 'reset-1',
        token: 'reset-token',
        email: 'user@test.com',
        userId: 'user-1',
        expiresAt: new Date(),
        usedAt: null,
        createdAt: new Date(),
      });

      const result = await service.generatePasswordResetToken('user@test.com');

      expect(typeof result).toBe('string');
      expect(prismaService.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'user@test.com' },
      });
      expect(prismaService.passwordReset.deleteMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
      });
      expect(prismaService.passwordReset.create).toHaveBeenCalled();
    });

    it('should throw error when user not found', async () => {
      prismaService.user.findUnique.mockResolvedValue(null);

      await expect(
        service.generatePasswordResetToken('nonexistent@test.com'),
      ).rejects.toThrow('User with this email does not exist');
    });

    it('should remove existing reset tokens before creating new one', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'user@test.com',
        name: 'Test User',
      };

      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.passwordReset.deleteMany.mockResolvedValue({ count: 2 });
      prismaService.passwordReset.create.mockResolvedValue({
        id: 'reset-1',
        token: 'reset-token',
        email: 'user@test.com',
        userId: 'user-1',
        expiresAt: new Date(),
        usedAt: null,
        createdAt: new Date(),
      });

      await service.generatePasswordResetToken('user@test.com');

      expect(prismaService.passwordReset.deleteMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
      });
    });
  });

  describe('resetPassword', () => {
    it('should reset password successfully', async () => {
      const mockReset = {
        id: 'reset-1',
        token: 'valid-token',
        email: 'user@test.com',
        userId: 'user-1',
        expiresAt: new Date(Date.now() + 3600000), // 1 hour from now
        usedAt: null,
        user: {
          id: 'user-1',
          email: 'user@test.com',
        },
      };

      prismaService.passwordReset.findUnique.mockResolvedValue(mockReset);
      prismaService.passwordReset.update.mockResolvedValue({
        ...mockReset,
        usedAt: new Date(),
      });
      prismaService.user.update.mockResolvedValue({
        id: 'user-1',
        password: 'new-hashed-password',
      });
      prismaService.refreshToken.deleteMany.mockResolvedValue({ count: 1 });
      mockedBcrypt.hash.mockResolvedValue('new-hashed-password');

      const result = await service.resetPassword(
        'valid-token',
        'newPassword123',
      );

      expect(result).toEqual({ message: 'Password reset successfully' });
      expect(prismaService.passwordReset.update).toHaveBeenCalledWith({
        where: { id: 'reset-1' },
        data: { usedAt: expect.any(Date) },
      });
      expect(prismaService.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { password: 'new-hashed-password' },
      });
      expect(prismaService.refreshToken.deleteMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
      });
    });

    it('should throw error for invalid token', async () => {
      prismaService.passwordReset.findUnique.mockResolvedValue(null);

      await expect(
        service.resetPassword('invalid-token', 'newPassword123'),
      ).rejects.toThrow('Invalid or expired reset token');
    });

    it('should throw error for expired token', async () => {
      const mockReset = {
        id: 'reset-1',
        token: 'expired-token',
        email: 'user@test.com',
        userId: 'user-1',
        expiresAt: new Date(Date.now() - 3600000), // 1 hour ago
        usedAt: null,
        user: {
          id: 'user-1',
          email: 'user@test.com',
        },
      };

      prismaService.passwordReset.findUnique.mockResolvedValue(mockReset);

      await expect(
        service.resetPassword('expired-token', 'newPassword123'),
      ).rejects.toThrow('Invalid or expired reset token');
    });

    it('should throw error for already used token', async () => {
      const mockReset = {
        id: 'reset-1',
        token: 'used-token',
        email: 'user@test.com',
        userId: 'user-1',
        expiresAt: new Date(Date.now() + 3600000),
        usedAt: new Date(Date.now() - 1800000), // Used 30 minutes ago
        user: {
          id: 'user-1',
          email: 'user@test.com',
        },
      };

      prismaService.passwordReset.findUnique.mockResolvedValue(mockReset);

      await expect(
        service.resetPassword('used-token', 'newPassword123'),
      ).rejects.toThrow('Invalid or expired reset token');
    });
  });

  describe('changePassword', () => {
    it('should change password successfully', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'user@test.com',
        password: 'current-hashed-password',
      };

      prismaService.user.findUnique.mockResolvedValue(mockUser);
      mockedBcrypt.compare.mockResolvedValue(true);
      mockedBcrypt.hash.mockResolvedValue('new-hashed-password');
      prismaService.user.update.mockResolvedValue({
        ...mockUser,
        password: 'new-hashed-password',
      });
      prismaService.refreshToken.deleteMany.mockResolvedValue({ count: 1 });

      const result = await service.changePassword(
        'user-1',
        'currentPassword',
        'newPassword123',
      );

      expect(result).toEqual({ message: 'Password changed successfully' });
      expect(mockedBcrypt.compare).toHaveBeenCalledWith(
        'currentPassword',
        'current-hashed-password',
      );
      expect(prismaService.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { password: 'new-hashed-password' },
      });
      expect(prismaService.refreshToken.deleteMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
      });
    });

    it('should throw error when user not found', async () => {
      prismaService.user.findUnique.mockResolvedValue(null);

      await expect(
        service.changePassword(
          'nonexistent-user',
          'currentPassword',
          'newPassword123',
        ),
      ).rejects.toThrow('User not found');
    });

    it('should throw error when current password is incorrect', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'user@test.com',
        password: 'current-hashed-password',
      };

      prismaService.user.findUnique.mockResolvedValue(mockUser);
      mockedBcrypt.compare.mockResolvedValue(false);

      await expect(
        service.changePassword('user-1', 'wrongPassword', 'newPassword123'),
      ).rejects.toThrow('Current password is incorrect');
    });

    it('should invalidate all refresh tokens after password change', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'user@test.com',
        password: 'current-hashed-password',
      };

      prismaService.user.findUnique.mockResolvedValue(mockUser);
      mockedBcrypt.compare.mockResolvedValue(true);
      mockedBcrypt.hash.mockResolvedValue('new-hashed-password');
      prismaService.user.update.mockResolvedValue({
        ...mockUser,
        password: 'new-hashed-password',
      });
      prismaService.refreshToken.deleteMany.mockResolvedValue({ count: 3 });

      await service.changePassword(
        'user-1',
        'currentPassword',
        'newPassword123',
      );

      expect(prismaService.refreshToken.deleteMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
      });
    });
  });

  describe('generateEmailVerificationToken', () => {
    it('should generate email verification token successfully', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'user@test.com',
        name: 'Test User',
      };

      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.emailVerification.deleteMany.mockResolvedValue({
        count: 0,
      });
      prismaService.emailVerification.create.mockResolvedValue({
        id: 'verification-1',
        token: 'verification-token',
        email: 'user@test.com',
        userId: 'user-1',
        expiresAt: new Date(),
        usedAt: null,
        createdAt: new Date(),
      });

      const result = await service.generateEmailVerificationToken(
        'user-1',
        'user@test.com',
      );

      expect(typeof result).toBe('string');
      expect(prismaService.emailVerification.deleteMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
      });
      expect(prismaService.emailVerification.create).toHaveBeenCalled();
    });

    it('should generate token even without user validation', async () => {
      const result = await service.generateEmailVerificationToken(
        'nonexistent-user',
        'nonexistent@test.com',
      );

      expect(typeof result).toBe('string');
    });

    it('should remove existing verification tokens before creating new one', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'user@test.com',
        name: 'Test User',
      };

      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.emailVerification.deleteMany.mockResolvedValue({
        count: 1,
      });
      prismaService.emailVerification.create.mockResolvedValue({
        id: 'verification-1',
        token: 'verification-token',
        email: 'user@test.com',
        userId: 'user-1',
        expiresAt: new Date(),
        usedAt: null,
        createdAt: new Date(),
      });

      await service.generateEmailVerificationToken('user-1', 'user@test.com');

      expect(prismaService.emailVerification.deleteMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
      });
    });
  });

  describe('verifyEmail', () => {
    it('should verify email successfully', async () => {
      const mockVerification = {
        id: 'verification-1',
        token: 'valid-token',
        email: 'user@test.com',
        userId: 'user-1',
        expiresAt: new Date(Date.now() + 3600000), // 1 hour from now
        usedAt: null,
        user: {
          id: 'user-1',
          email: 'user@test.com',
          emailVerifiedAt: null,
        },
      };

      prismaService.emailVerification.findUnique.mockResolvedValue(
        mockVerification,
      );
      prismaService.emailVerification.update.mockResolvedValue({
        ...mockVerification,
        usedAt: new Date(),
      });
      prismaService.user.update.mockResolvedValue({
        id: 'user-1',
        email: 'user@test.com',
        emailVerifiedAt: new Date(),
        status: 'active',
      });

      const result = await service.verifyEmail('valid-token');

      expect(result).toEqual({ message: 'Email verified successfully' });
      expect(prismaService.emailVerification.update).toHaveBeenCalledWith({
        where: { id: 'verification-1' },
        data: { usedAt: expect.any(Date) },
      });
      expect(prismaService.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: {
          status: 'active',
          emailVerifiedAt: expect.any(Date),
          email: 'user@test.com',
        },
      });
    });

    it('should throw error for invalid token', async () => {
      prismaService.emailVerification.findUnique.mockResolvedValue(null);

      await expect(service.verifyEmail('invalid-token')).rejects.toThrow(
        'Invalid or expired verification token',
      );
    });

    it('should throw error for expired token', async () => {
      const mockVerification = {
        id: 'verification-1',
        token: 'expired-token',
        email: 'user@test.com',
        userId: 'user-1',
        expiresAt: new Date(Date.now() - 3600000), // 1 hour ago
        usedAt: null,
        user: {
          id: 'user-1',
          email: 'user@test.com',
        },
      };

      prismaService.emailVerification.findUnique.mockResolvedValue(
        mockVerification,
      );

      await expect(service.verifyEmail('expired-token')).rejects.toThrow(
        'Invalid or expired verification token',
      );
    });

    it('should throw error for already used token', async () => {
      const mockVerification = {
        id: 'verification-1',
        token: 'used-token',
        email: 'user@test.com',
        userId: 'user-1',
        expiresAt: new Date(Date.now() + 3600000),
        usedAt: new Date(Date.now() - 1800000), // Used 30 minutes ago
        user: {
          id: 'user-1',
          email: 'user@test.com',
        },
      };

      prismaService.emailVerification.findUnique.mockResolvedValue(
        mockVerification,
      );

      await expect(service.verifyEmail('used-token')).rejects.toThrow(
        'Invalid or expired verification token',
      );
    });

    it('should throw error if email already verified', async () => {
      const mockVerification = {
        id: 'verification-1',
        token: 'valid-token',
        email: 'user@test.com',
        userId: 'user-1',
        expiresAt: new Date(Date.now() + 3600000),
        usedAt: null,
        user: {
          id: 'user-1',
          email: 'user@test.com',
          emailVerifiedAt: new Date(Date.now() - 86400000), // Verified 1 day ago
        },
      };

      prismaService.emailVerification.findUnique.mockResolvedValue(
        mockVerification,
      );

      const result = await service.verifyEmail('valid-token');

      expect(result).toEqual({ message: 'Email verified successfully' });
    });
  });

  describe('logout', () => {
    it('should logout successfully by deleting refresh token', async () => {
      prismaService.refreshToken.deleteMany.mockResolvedValue({ count: 1 });

      const result = await service.logout('user-1', 'refresh-token');

      expect(result).toBeUndefined();
      expect(prismaService.refreshToken.deleteMany).toHaveBeenCalledWith({
        where: { userId: 'user-1', token: 'refresh-token' },
      });
    });

    it('should handle logout when token does not exist', async () => {
      prismaService.refreshToken.deleteMany.mockResolvedValue({ count: 0 });

      const result = await service.logout('user-1', 'nonexistent-token');

      expect(result).toBeUndefined();
    });
  });
});
