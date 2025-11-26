import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtStrategy, JwtPayload } from './jwt.strategy';
import { PrismaService } from '../../common/services/prisma.service';
import { TrialService } from '../../common/services/trial.service';

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;
  let prismaService: jest.Mocked<PrismaService>;
  let trialService: jest.Mocked<TrialService>;
  let configService: jest.Mocked<ConfigService>;

  const mockUser = {
    id: 'user-1',
    email: 'user@test.com',
    name: 'Test User',
    companyId: 'company-1',
    mainUser: true,
    status: 'active',
    permissions: null,
    company: {
      id: 'company-1',
      companyName: 'Test Company',
      trialStartDate: new Date('2023-01-01'),
      trialEndDate: new Date('2023-01-15'),
      trialStatus: 'active',
      createdAt: new Date('2023-01-01'),
      subscriptions: [
        {
          id: 'sub-1',
          isActive: true,
          status: 'trial',
          isTrial: true,
          plan: {
            id: 'plan-1',
            name: 'Trial Plan',
            price: 0,
          },
        },
      ],
    },
  };

  const mockJwtPayload: JwtPayload = {
    sub: 'user-1',
    email: 'user@test.com',
    companyId: 'company-1',
    mainUser: true,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600,
  };

  const mockTrialInfo = {
    isInTrial: true,
    daysRemaining: 10,
    trialEndDate: new Date('2023-01-15'),
    status: 'active',
  };

  beforeEach(async () => {
    const mockPrismaService = {
      user: {
        findUnique: jest.fn(),
      },
      company: {
        update: jest.fn(),
      },
      companySubscription: {
        update: jest.fn(),
      },
    };

    const mockTrialService = {
      calculateTrialInfo: jest.fn(),
      shouldUpdateTrialStatus: jest.fn(),
    };

    const mockConfigService = {
      get: jest.fn().mockReturnValue('test-secret'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtStrategy,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: TrialService,
          useValue: mockTrialService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    strategy = module.get<JwtStrategy>(JwtStrategy);
    prismaService = module.get(PrismaService);
    trialService = module.get(TrialService);
    configService = module.get(ConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should throw error when JWT_SECRET is not provided', () => {
      const mockConfigServiceNoSecret = {
        get: jest.fn().mockReturnValue(undefined),
      };

      expect(() => {
        new JwtStrategy(
          mockConfigServiceNoSecret as any,
          {
            user: { findUnique: jest.fn() },
            company: { update: jest.fn() },
            companySubscription: { update: jest.fn() },
          } as any,
          {
            calculateTrialInfo: jest.fn(),
            shouldUpdateTrialStatus: jest.fn(),
          } as any,
        );
      }).toThrow('JWT_SECRET is required');
    });

    it('should initialize successfully with valid JWT_SECRET', () => {
      expect(() => {
        new JwtStrategy(
          {
            get: jest.fn().mockReturnValue('test-secret'),
          } as any,
          {
            user: { findUnique: jest.fn() },
            company: { update: jest.fn() },
            companySubscription: { update: jest.fn() },
          } as any,
          {
            calculateTrialInfo: jest.fn(),
            shouldUpdateTrialStatus: jest.fn(),
          } as any,
        );
      }).not.toThrow();
    });
  });

  describe('validate', () => {
    beforeEach(() => {
      configService.get.mockReturnValue('test-secret');
      trialService.calculateTrialInfo.mockReturnValue(mockTrialInfo);
      trialService.shouldUpdateTrialStatus.mockReturnValue(false);
    });

    it('should validate user successfully and return user data', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);

      const result = await strategy.validate(mockJwtPayload);

      expect(result).toEqual({
        id: 'user-1',
        email: 'user@test.com',
        name: 'Test User',
        companyId: 'company-1',
        mainUser: true,
        permissions: null,
        company: {
          ...mockUser.company,
          trial: mockTrialInfo,
          currentPlan: mockUser.company.subscriptions[0].plan,
          currentSubscription: mockUser.company.subscriptions[0],
        },
      });

      expect(prismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user-1' },
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

    it('should throw UnauthorizedException when user not found', async () => {
      prismaService.user.findUnique.mockResolvedValue(null);

      await expect(strategy.validate(mockJwtPayload)).rejects.toThrow(
        new UnauthorizedException('User not found or inactive'),
      );
    });

    it('should throw UnauthorizedException when user is inactive', async () => {
      const inactiveUser = { ...mockUser, status: 'inactive' };
      prismaService.user.findUnique.mockResolvedValue(inactiveUser);

      await expect(strategy.validate(mockJwtPayload)).rejects.toThrow(
        new UnauthorizedException('User not found or inactive'),
      );
    });

    it('should handle user without company', async () => {
      const userWithoutCompany = { ...mockUser, company: null };
      prismaService.user.findUnique.mockResolvedValue(userWithoutCompany);

      const result = await strategy.validate(mockJwtPayload);

      expect(result).toEqual({
        id: 'user-1',
        email: 'user@test.com',
        name: 'Test User',
        companyId: 'company-1',
        mainUser: true,
        permissions: null,
        company: null,
      });
    });

    it('should handle user with pending status', async () => {
      const pendingUser = { ...mockUser, status: 'pending' };
      prismaService.user.findUnique.mockResolvedValue(pendingUser);

      await expect(strategy.validate(mockJwtPayload)).rejects.toThrow(
        new UnauthorizedException('User not found or inactive'),
      );
    });

    it('should handle team member (non-main user)', async () => {
      const teamMember = {
        ...mockUser,
        id: 'team-user-1',
        mainUser: false,
        permissions: {
          registration: {
            animals: { view: true, add: false, edit: false, remove: false },
          },
        },
      };
      prismaService.user.findUnique.mockResolvedValue(teamMember);

      const teamPayload = {
        ...mockJwtPayload,
        sub: 'team-user-1',
        mainUser: false,
      };
      const result = await strategy.validate(teamPayload);

      expect(result.mainUser).toBe(false);
      expect(result.permissions).toEqual(teamMember.permissions);
    });

    it('should update trial status when needed', async () => {
      trialService.shouldUpdateTrialStatus.mockReturnValue(true);
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.company.update.mockResolvedValue({});
      prismaService.companySubscription.update.mockResolvedValue({});

      await strategy.validate(mockJwtPayload);

      expect(prismaService.company.update).toHaveBeenCalledWith({
        where: { id: 'company-1' },
        data: { trialStatus: 'expired' },
      });

      expect(prismaService.companySubscription.update).toHaveBeenCalledWith({
        where: { id: 'sub-1' },
        data: { status: 'expired', isActive: false },
      });
    });

    it('should not update trial subscription if no active trial exists', async () => {
      const userWithoutTrialSub = {
        ...mockUser,
        company: {
          ...mockUser.company,
          subscriptions: [
            {
              id: 'sub-1',
              isActive: true,
              status: 'active',
              isTrial: false,
              plan: {
                id: 'plan-1',
                name: 'Paid Plan',
                price: 99,
              },
            },
          ],
        },
      };

      trialService.shouldUpdateTrialStatus.mockReturnValue(true);
      prismaService.user.findUnique.mockResolvedValue(userWithoutTrialSub);
      prismaService.company.update.mockResolvedValue({});

      await strategy.validate(mockJwtPayload);

      expect(prismaService.company.update).toHaveBeenCalled();
      expect(prismaService.companySubscription.update).not.toHaveBeenCalled();
    });

    it('should handle company with no subscriptions', async () => {
      const userWithoutSubscriptions = {
        ...mockUser,
        company: {
          ...mockUser.company,
          subscriptions: [],
        },
      };

      prismaService.user.findUnique.mockResolvedValue(userWithoutSubscriptions);

      const result = await strategy.validate(mockJwtPayload);

      expect(result.company.currentPlan).toBeNull();
      expect(result.company.currentSubscription).toBeNull();
    });

    it('should find active subscription correctly', async () => {
      const userWithMultipleSubscriptions = {
        ...mockUser,
        company: {
          ...mockUser.company,
          subscriptions: [
            {
              id: 'sub-1',
              isActive: false,
              status: 'expired',
              isTrial: true,
              plan: { id: 'plan-1', name: 'Trial Plan' },
            },
            {
              id: 'sub-2',
              isActive: true,
              status: 'active',
              isTrial: false,
              plan: { id: 'plan-2', name: 'Paid Plan' },
            },
          ],
        },
      };

      prismaService.user.findUnique.mockResolvedValue(
        userWithMultipleSubscriptions,
      );

      const result = await strategy.validate(mockJwtPayload);

      expect(result.company.currentSubscription.id).toBe('sub-2');
      expect(result.company.currentPlan.name).toBe('Paid Plan');
    });

    it('should handle database errors gracefully', async () => {
      prismaService.user.findUnique.mockRejectedValue(
        new Error('Database connection failed'),
      );

      await expect(strategy.validate(mockJwtPayload)).rejects.toThrow(
        'Database connection failed',
      );
    });

    it('should handle trial service errors gracefully', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      trialService.calculateTrialInfo.mockImplementation(() => {
        throw new Error('Trial calculation failed');
      });

      await expect(strategy.validate(mockJwtPayload)).rejects.toThrow(
        'Trial calculation failed',
      );
    });

    it('should handle malformed payload', async () => {
      const malformedPayload = { sub: null } as any;

      prismaService.user.findUnique.mockResolvedValue(null);

      await expect(strategy.validate(malformedPayload)).rejects.toThrow(
        new UnauthorizedException('User not found or inactive'),
      );
    });

    it('should handle expired JWT payload', async () => {
      const expiredPayload = {
        ...mockJwtPayload,
        exp: Math.floor(Date.now() / 1000) - 3600, // Expired 1 hour ago
      };

      prismaService.user.findUnique.mockResolvedValue(mockUser);

      const result = await strategy.validate(expiredPayload);

      // Strategy should still validate if user exists and is active
      // JWT expiration is handled by passport-jwt middleware
      expect(result.id).toBe('user-1');
    });
  });

  describe('enhanceCompanyWithTrialInfo', () => {
    beforeEach(() => {
      configService.get.mockReturnValue('test-secret');
    });

    it('should return null company as-is', async () => {
      prismaService.user.findUnique.mockResolvedValue({
        ...mockUser,
        company: null,
      });

      const result = await strategy.validate(mockJwtPayload);

      expect(result.company).toBeNull();
    });

    it('should handle company with undefined subscriptions', async () => {
      const userWithUndefinedSubs = {
        ...mockUser,
        company: {
          ...mockUser.company,
          subscriptions: undefined,
        },
      };

      prismaService.user.findUnique.mockResolvedValue(userWithUndefinedSubs);

      const result = await strategy.validate(mockJwtPayload);

      expect(result.company.currentSubscription).toBeNull();
      expect(result.company.currentPlan).toBeNull();
    });

    it('should handle trial status update errors', async () => {
      trialService.shouldUpdateTrialStatus.mockReturnValue(true);
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.company.update.mockRejectedValue(
        new Error('Update failed'),
      );

      await expect(strategy.validate(mockJwtPayload)).rejects.toThrow(
        'Update failed',
      );
    });
  });
});
