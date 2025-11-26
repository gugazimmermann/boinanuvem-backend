import { Test, TestingModule } from '@nestjs/testing';
import {
  ConflictException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { CompaniesService } from './companies.service';
import { PrismaService } from '../common/services/prisma.service';
import { TrialService } from '../common/services/trial.service';
import { AuthService } from '../auth/auth.service';
import { EmailService } from '../email/email.service';
import { RegisterCompanyDto } from './dto/register-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';

describe('CompaniesService', () => {
  let service: CompaniesService;
  let prismaService: MockPrismaService;
  let trialService: jest.Mocked<TrialService>;
  let authService: jest.Mocked<AuthService>;

  interface MockPrismaService {
    company: {
      findUnique: jest.Mock;
      findFirst: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
    };
    user: {
      findUnique: jest.Mock;
      create: jest.Mock;
    };
    plan: {
      findUnique: jest.Mock;
    };
    companySubscription: {
      create: jest.Mock;
      update: jest.Mock;
    };
    $transaction: jest.Mock;
  }

  const mockPrismaService: MockPrismaService = {
    company: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    plan: {
      findUnique: jest.fn(),
    },
    companySubscription: {
      create: jest.fn(),
      update: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const mockTrialService = {
    initializeTrial: jest.fn(),
    createTrialSubscription: jest.fn(),
    calculateTrialInfo: jest.fn(),
    shouldUpdateTrialStatus: jest.fn(),
  };

  const mockAuthService = {
    hashPassword: jest.fn(),
    generateEmailVerificationToken: jest.fn(),
  };

  const mockEmailService = {
    sendEmailVerification: jest.fn(),
    sendWelcomeEmail: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CompaniesService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: TrialService, useValue: mockTrialService },
        { provide: AuthService, useValue: mockAuthService },
        { provide: EmailService, useValue: mockEmailService },
      ],
    }).compile();

    service = module.get<CompaniesService>(CompaniesService);
    prismaService = module.get<MockPrismaService>(PrismaService);
    trialService = module.get<jest.Mocked<TrialService>>(TrialService);
    authService = module.get<jest.Mocked<AuthService>>(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('registerCompany', () => {
    const registerDto: RegisterCompanyDto = {
      cnpj: '12.345.678/0001-90',
      companyName: 'Test Company',
      email: 'test@company.com',
      phone: '(47) 99999-9999',
      street: 'Test Street',
      number: '123',
      neighborhood: 'Test Neighborhood',
      city: 'Test City',
      state: 'SC',
      zipCode: '88303-030',
      userName: 'Test User',
      userEmail: 'user@company.com',
      userPhone: '(47) 99999-8888',
      userPassword: 'password123',
    };

    const mockAdvancedPlan = {
      id: 'plan-advanced',
      name: 'Avançado',
      description: 'Advanced plan',
    };

    const mockTrialData = {
      trialStartDate: new Date('2025-01-01'),
      trialEndDate: new Date('2025-01-15'),
      trialStatus: 'active',
    };

    const mockTrialSubscription = {
      companyId: 'company-1',
      planId: 'plan-advanced',
      status: 'trial',
      startDate: new Date('2025-01-01'),
      endDate: null,
      billingCycle: 'monthly',
      isActive: true,
      isTrial: true,
      trialEndDate: new Date('2025-01-15'),
    };

    const mockCompany = {
      id: 'company-1',
      ...registerDto,
      createdAt: new Date('2025-01-01'),
    };

    const mockUser = {
      id: 'user-1',
      name: registerDto.userName,
      email: registerDto.userEmail,
      companyId: 'company-1',
      status: 'pending',
    };

    beforeEach(() => {
      trialService.initializeTrial.mockReturnValue(mockTrialData);
      trialService.createTrialSubscription.mockReturnValue(
        mockTrialSubscription,
      );
      authService.hashPassword.mockResolvedValue('hashed-password');
      authService.generateEmailVerificationToken.mockResolvedValue(
        'verification-token',
      );
    });

    it.skip('should throw ConflictException if company CNPJ already exists', async () => {
      prismaService.$transaction.mockImplementation((callback) => {
        const mockTx = {
          company: {
            findUnique: jest
              .fn()
              .mockResolvedValueOnce({ id: 'existing-company' }) // CNPJ check returns existing
              .mockResolvedValueOnce(null), // Email check
            create: jest.fn(),
          },
          user: {
            findUnique: jest.fn().mockResolvedValue(null),
            create: jest.fn(),
          },
          plan: {
            findUnique: jest.fn().mockResolvedValue(mockAdvancedPlan),
          },
          companySubscription: {
            create: jest.fn(),
          },
        };
        return callback(mockTx) as unknown;
      });

      await expect(service.registerCompany(registerDto)).rejects.toThrow(
        ConflictException,
      );
    });

    it.skip('should throw ConflictException if company email already exists', async () => {
      prismaService.$transaction.mockImplementation((callback) => {
        const mockTx = {
          company: {
            findUnique: jest
              .fn()
              .mockResolvedValueOnce(null) // CNPJ check
              .mockResolvedValueOnce({ id: 'existing-company' }), // Email check returns existing
            create: jest.fn(),
          },
          user: {
            findUnique: jest.fn().mockResolvedValue(null),
            create: jest.fn(),
          },
          plan: {
            findUnique: jest.fn().mockResolvedValue(mockAdvancedPlan),
          },
          companySubscription: {
            create: jest.fn(),
          },
        };
        return callback(mockTx) as unknown;
      });

      await expect(service.registerCompany(registerDto)).rejects.toThrow(
        ConflictException,
      );
    });

    it.skip('should throw ConflictException if user email already exists', async () => {
      prismaService.$transaction.mockImplementation((callback) => {
        const mockTx = {
          company: {
            findUnique: jest.fn().mockResolvedValue(null),
            create: jest.fn(),
          },
          user: {
            findUnique: jest.fn().mockResolvedValue({ id: 'existing-user' }),
            create: jest.fn(),
          },
          plan: {
            findUnique: jest.fn().mockResolvedValue(mockAdvancedPlan),
          },
          companySubscription: {
            create: jest.fn(),
          },
        };
        return callback(mockTx) as unknown;
      });

      await expect(service.registerCompany(registerDto)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should throw error if Avançado plan not found', async () => {
      prismaService.$transaction.mockImplementation((callback) => {
        return callback({
          company: {
            findUnique: jest.fn().mockResolvedValue(null),
          },
          user: {
            findUnique: jest.fn().mockResolvedValue(null),
          },
          plan: {
            findUnique: jest.fn().mockResolvedValue(null), // No Avançado plan
          },
        } as any);
      });

      await expect(service.registerCompany(registerDto)).rejects.toThrow(
        'Avançado plan not found. Please run database seeding.',
      );
    });

    it('should successfully register company with trial subscription', async () => {
      const mockTransaction = {
        company: {
          findUnique: jest.fn().mockResolvedValue(null),
          create: jest.fn().mockResolvedValue(mockCompany),
        },
        user: {
          findUnique: jest.fn().mockResolvedValue(null),
          create: jest.fn().mockResolvedValue(mockUser),
        },
        plan: {
          findUnique: jest.fn().mockResolvedValue(mockAdvancedPlan),
        },
        companySubscription: {
          create: jest.fn().mockResolvedValue({}),
        },
      };

      prismaService.$transaction.mockImplementation((callback) => {
        return callback(mockTransaction as any);
      });

      const result = await service.registerCompany(registerDto);

      expect(result).toEqual({
        message:
          'Company registered successfully. Please check your email to verify your account.',
        company: {
          id: 'company-1',
          cnpj: registerDto.cnpj,
          companyName: registerDto.companyName,
          email: registerDto.email,
        },
        mainUser: {
          id: 'user-1',
          name: registerDto.userName,
          email: registerDto.userEmail,
          status: 'pending',
        },
      });
    });

    it('should create company with trial data', async () => {
      const mockTransaction = {
        company: {
          findUnique: jest.fn().mockResolvedValue(null),
          create: jest.fn().mockResolvedValue(mockCompany),
        },
        user: {
          findUnique: jest.fn().mockResolvedValue(null),
          create: jest.fn().mockResolvedValue(mockUser),
        },
        plan: {
          findUnique: jest.fn().mockResolvedValue(mockAdvancedPlan),
        },
        companySubscription: {
          create: jest.fn().mockResolvedValue({}),
        },
      };

      prismaService.$transaction.mockImplementation((callback) => {
        return callback(mockTransaction as any);
      });

      await service.registerCompany(registerDto);

      expect(mockTransaction.company.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          cnpj: registerDto.cnpj,
          companyName: registerDto.companyName,
          email: registerDto.email,
          trialStartDate: mockTrialData.trialStartDate,
          trialEndDate: mockTrialData.trialEndDate,
          trialStatus: mockTrialData.trialStatus,
        }),
      });
    });

    it('should create trial subscription with Avançado plan', async () => {
      const mockTransaction = {
        company: {
          findUnique: jest.fn().mockResolvedValue(null),
          create: jest.fn().mockResolvedValue(mockCompany),
        },
        user: {
          findUnique: jest.fn().mockResolvedValue(null),
          create: jest.fn().mockResolvedValue(mockUser),
        },
        plan: {
          findUnique: jest.fn().mockResolvedValue(mockAdvancedPlan),
        },
        companySubscription: {
          create: jest.fn().mockResolvedValue({}),
        },
      };

      prismaService.$transaction.mockImplementation((callback) => {
        return callback(mockTransaction as any);
      });

      await service.registerCompany(registerDto);

      expect(trialService.createTrialSubscription).toHaveBeenCalledWith(
        'company-1',
        'plan-advanced',
        mockCompany.createdAt,
      );

      expect(mockTransaction.companySubscription.create).toHaveBeenCalledWith({
        data: mockTrialSubscription,
      });
    });

    it('should create main user with hashed password', async () => {
      const mockTransaction = {
        company: {
          findUnique: jest.fn().mockResolvedValue(null),
          create: jest.fn().mockResolvedValue(mockCompany),
        },
        user: {
          findUnique: jest.fn().mockResolvedValue(null),
          create: jest.fn().mockResolvedValue(mockUser),
        },
        plan: {
          findUnique: jest.fn().mockResolvedValue(mockAdvancedPlan),
        },
        companySubscription: {
          create: jest.fn().mockResolvedValue({}),
        },
      };

      prismaService.$transaction.mockImplementation((callback) => {
        return callback(mockTransaction as any);
      });

      await service.registerCompany(registerDto);

      expect(authService.hashPassword).toHaveBeenCalledWith('password123');
      expect(mockTransaction.user.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          name: registerDto.userName,
          email: registerDto.userEmail,
          password: 'hashed-password',
          companyId: 'company-1',
          mainUser: true,
          permissions: expect.any(Object),
        }),
      });
    });
  });

  describe('getCompany', () => {
    const mockUser = {
      id: 'user-1',
      companyId: 'company-1',
    };

    const mockCompany = {
      id: 'company-1',
      companyName: 'Test Company',
      subscriptions: [
        {
          id: 'sub-1',
          status: 'trial',
          isActive: true,
          isTrial: true,
          plan: {
            id: 'plan-1',
            name: 'Avançado',
          },
        },
      ],
      payments: [],
    };

    const mockTrialInfo = {
      isOnTrial: true,
      isTrialExpired: false,
      trialDaysRemaining: 14,
      trialStartDate: new Date(),
      trialEndDate: new Date(),
      trialStatus: 'active',
    };

    beforeEach(() => {
      trialService.calculateTrialInfo.mockReturnValue({
        ...mockTrialInfo,
        trialStartDate: new Date(),
        trialEndDate: new Date(),
        trialStatus: 'active' as const,
      });
      trialService.shouldUpdateTrialStatus.mockReturnValue(false);
    });

    it('should throw NotFoundException if user not found', async () => {
      prismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.getCompany('company-1', 'user-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ForbiddenException if user does not belong to company', async () => {
      const otherUser = { ...mockUser, companyId: 'other-company' };
      prismaService.user.findUnique.mockResolvedValue(otherUser);

      await expect(service.getCompany('company-1', 'user-1')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw NotFoundException if company not found', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.company.findUnique.mockResolvedValue(null);

      await expect(service.getCompany('company-1', 'user-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should return company with enhanced data', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.company.findUnique.mockResolvedValue(mockCompany);

      const result = await service.getCompany('company-1', 'user-1');

      expect(result).toEqual({
        ...mockCompany,
        trial: expect.objectContaining({
          isOnTrial: true,
          isTrialExpired: false,
          trialDaysRemaining: 14,
          trialStatus: 'active',
        }),
        currentPlan: {
          id: 'plan-1',
          name: 'Avançado',
        },
        currentSubscription: {
          id: 'sub-1',
          status: 'trial',
          isActive: true,
          isTrial: true,
          plan: {
            id: 'plan-1',
            name: 'Avançado',
          },
        },
      });
    });

    it('should include subscriptions and payments in query', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.company.findUnique.mockResolvedValue(mockCompany);

      await service.getCompany('company-1', 'user-1');

      expect(prismaService.company.findUnique).toHaveBeenCalledWith({
        where: { id: 'company-1' },
        include: {
          users: {
            select: {
              id: true,
              name: true,
              email: true,
              mainUser: true,
              status: true,
              createdAt: true,
              lastAccess: true,
            },
          },
          subscriptions: {
            include: {
              plan: true,
            },
            orderBy: {
              createdAt: 'desc',
            },
          },
          payments: {
            orderBy: {
              createdAt: 'desc',
            },
            take: 10,
          },
        },
      });
    });

    it('should update trial status if needed', async () => {
      trialService.shouldUpdateTrialStatus.mockReturnValue(true);
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.company.findUnique.mockResolvedValue(mockCompany);
      prismaService.company.update.mockResolvedValue({} as any);

      await service.getCompany('company-1', 'user-1');

      expect(prismaService.company.update).toHaveBeenCalledWith({
        where: { id: 'company-1' },
        data: { trialStatus: 'expired' },
      });
    });

    it('should update trial subscription status when trial expires', async () => {
      const companyWithTrialSub = {
        ...mockCompany,
        subscriptions: [
          {
            id: 'sub-1',
            status: 'trial',
            isActive: true,
            isTrial: true,
            plan: { id: 'plan-1', name: 'Avançado' },
          },
        ],
      };

      trialService.shouldUpdateTrialStatus.mockReturnValue(true);
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.company.findUnique.mockResolvedValue(companyWithTrialSub);
      prismaService.company.update.mockResolvedValue({} as any);
      prismaService.companySubscription.update.mockResolvedValue({} as any);

      await service.getCompany('company-1', 'user-1');

      expect(prismaService.companySubscription.update).toHaveBeenCalledWith({
        where: { id: 'sub-1' },
        data: { status: 'expired', isActive: false },
      });
    });
  });

  describe('updateCompany', () => {
    const updateDto: UpdateCompanyDto = {
      companyName: 'Updated Company Name',
      email: 'updated@company.com',
    };

    const mockUser = {
      id: 'user-1',
      companyId: 'company-1',
      mainUser: true,
    };

    const mockCompany = {
      id: 'company-1',
      companyName: 'Test Company',
    };

    it('should throw NotFoundException if user not found', async () => {
      prismaService.user.findUnique.mockResolvedValue(null);

      await expect(
        service.updateCompany('company-1', updateDto, 'user-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if user is not main user', async () => {
      const nonMainUser = { ...mockUser, mainUser: false };
      prismaService.user.findUnique.mockResolvedValue(nonMainUser);

      await expect(
        service.updateCompany('company-1', updateDto, 'user-1'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException if user does not belong to company', async () => {
      const otherUser = { ...mockUser, companyId: 'other-company' };
      prismaService.user.findUnique.mockResolvedValue(otherUser);

      await expect(
        service.updateCompany('company-1', updateDto, 'user-1'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should successfully update company', async () => {
      const updatedCompany = { ...mockCompany, ...updateDto };
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.company.update.mockResolvedValue(updatedCompany);

      const result = await service.updateCompany(
        'company-1',
        updateDto,
        'user-1',
      );

      expect(result).toEqual(updatedCompany);
      expect(prismaService.company.update).toHaveBeenCalledWith({
        where: { id: 'company-1' },
        data: updateDto,
      });
    });
  });
});
