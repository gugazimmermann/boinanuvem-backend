import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { PrismaService } from '../common/services/prisma.service';
import { AuthService } from '../auth/auth.service';
import { TrialService } from '../common/services/trial.service';
import { EmailService } from '../email/email.service';

describe('UsersService', () => {
  let service: UsersService;

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    company: {
      update: jest.fn(),
    },
    companySubscription: {
      update: jest.fn(),
    },
    refreshToken: {
      deleteMany: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const mockAuthService = {
    hashPassword: jest.fn(),
    generateEmailVerificationToken: jest.fn(),
    _enhanceCompanyWithTrialInfo: jest.fn(),
  };

  const mockTrialService = {
    calculateTrialInfo: jest.fn(),
    shouldUpdateTrialStatus: jest.fn(),
  };

  const mockEmailService = {
    sendEmailVerification: jest.fn(),
    sendTeamMemberInvitation: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: AuthService, useValue: mockAuthService },
        { provide: TrialService, useValue: mockTrialService },
        { provide: EmailService, useValue: mockEmailService },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getCurrentUser', () => {
    it('should return current user', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'test@example.com',
        name: 'Test User',
        company: {
          id: 'company-1',
          name: 'Test Company',
          subscriptions: [],
        },
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockTrialService.calculateTrialInfo.mockReturnValue({
        isOnTrial: true,
        isTrialExpired: false,
        trialDaysRemaining: 14,
        trialStatus: 'active',
      });
      mockTrialService.shouldUpdateTrialStatus.mockReturnValue(false);

      const result = await service.getCurrentUser('user-1');

      expect(result).toEqual({
        ...mockUser,
        company: {
          ...mockUser.company,
          trial: {
            isOnTrial: true,
            isTrialExpired: false,
            trialDaysRemaining: 14,
            trialStatus: 'active',
          },
          currentPlan: null,
          currentSubscription: null,
        },
      });
      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
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

    it('should throw error when user not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.getCurrentUser('nonexistent-id')).rejects.toThrow(
        'User not found',
      );
    });

    it('should update trial status when expired', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'test@example.com',
        name: 'Test User',
        company: {
          id: 'company-1',
          name: 'Test Company',
          trialStartDate: new Date('2024-01-01'),
          trialEndDate: new Date('2024-01-15'),
          trialStatus: 'active',
          createdAt: new Date('2024-01-01'),
          subscriptions: [],
        },
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockTrialService.calculateTrialInfo.mockReturnValue({
        isOnTrial: false,
        isTrialExpired: true,
        trialDaysRemaining: 0,
        trialStatus: 'expired',
      });
      mockTrialService.shouldUpdateTrialStatus.mockReturnValue(true);
      mockPrismaService.company.update.mockResolvedValue({});
      mockPrismaService.companySubscription.update.mockResolvedValue({});

      await service.getCurrentUser('user-1');

      expect(mockPrismaService.company.update).toHaveBeenCalledWith({
        where: { id: 'company-1' },
        data: { trialStatus: 'expired' },
      });
    });

    it('should update trial subscription status when expired', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'test@example.com',
        name: 'Test User',
        company: {
          id: 'company-1',
          name: 'Test Company',
          trialStartDate: new Date('2024-01-01'),
          trialEndDate: new Date('2024-01-15'),
          trialStatus: 'active',
          createdAt: new Date('2024-01-01'),
          subscriptions: [
            {
              id: 'sub-1',
              isTrial: true,
              isActive: true,
              status: 'trial',
            },
          ],
        },
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockTrialService.calculateTrialInfo.mockReturnValue({
        isOnTrial: false,
        isTrialExpired: true,
        trialDaysRemaining: 0,
        trialStatus: 'expired',
      });
      mockTrialService.shouldUpdateTrialStatus.mockReturnValue(true);
      mockPrismaService.company.update.mockResolvedValue({});
      mockPrismaService.companySubscription.update.mockResolvedValue({});

      await service.getCurrentUser('user-1');

      expect(mockPrismaService.companySubscription.update).toHaveBeenCalledWith(
        {
          where: { id: 'sub-1' },
          data: { status: 'expired', isActive: false },
        },
      );
    });

    it('should include active subscription in response', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'test@example.com',
        name: 'Test User',
        company: {
          id: 'company-1',
          name: 'Test Company',
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

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockTrialService.calculateTrialInfo.mockReturnValue({
        isOnTrial: false,
        isTrialExpired: false,
        trialDaysRemaining: 0,
        trialStatus: 'expired',
      });
      mockTrialService.shouldUpdateTrialStatus.mockReturnValue(false);

      const result = await service.getCurrentUser('user-1');

      expect(
        (result as { company: { currentPlan: unknown } }).company.currentPlan,
      ).toEqual({
        id: 'plan-1',
        name: 'Avançado',
      });
    });
  });

  describe('getTeamMembers', () => {
    it('should return team members for main user', async () => {
      const mockMainUser = {
        id: 'main-user',
        companyId: 'company-1',
        mainUser: true,
      };
      const mockTeamMembers = [
        { id: 'member-1', name: 'Member 1', mainUser: false },
        { id: 'member-2', name: 'Member 2', mainUser: false },
      ];

      mockPrismaService.user.findUnique.mockResolvedValue(mockMainUser);
      mockPrismaService.user.findMany.mockResolvedValue(mockTeamMembers);

      const result = await service.getTeamMembers('main-user');

      expect(result).toEqual(mockTeamMembers);
      expect(mockPrismaService.user.findMany).toHaveBeenCalledWith({
        where: {
          companyId: 'company-1',
        },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          cpf: true,
          status: true,
          emailVerifiedAt: true,
          permissions: true,
          createdAt: true,
          lastAccess: true,
          mainUser: true,
        },
        orderBy: [{ mainUser: 'desc' }, { createdAt: 'asc' }],
      });
    });

    it('should throw error when user is not main user', async () => {
      const mockUser = {
        id: 'regular-user',
        companyId: 'company-1',
        mainUser: false,
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      await expect(service.getTeamMembers('regular-user')).rejects.toThrow(
        'Only main users can view team members',
      );
    });
  });

  describe('updateCurrentUser', () => {
    it('should update current user successfully', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'user@test.com',
        name: 'Test User',
        phone: '(11) 99999-9999',
        cpf: '123.456.789-00',
        companyId: 'company-1',
        mainUser: true,
        status: 'active',
      };

      const updateDto = {
        name: 'Updated Name',
        phone: '(11) 88888-8888',
      };

      const updatedUser = { ...mockUser, ...updateDto };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.user.update.mockResolvedValue(updatedUser);

      const result = await service.updateCurrentUser('user-1', updateDto);

      expect(result).toEqual(updatedUser);
      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: {
          ...updateDto,
          cpf: null, // Service sets cpf to null when not provided
        },
        include: { company: true },
      });
    });

    it('should throw error when user not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(
        service.updateCurrentUser('nonexistent-user', { name: 'New Name' }),
      ).rejects.toThrow('User not found');
    });

    it('should handle email change with verification', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'user@test.com',
        name: 'Test User',
        status: 'active',
      };

      const updateDto = {
        email: 'newemail@test.com',
        name: 'Updated Name',
      };

      mockPrismaService.user.findUnique
        .mockResolvedValueOnce(mockUser) // First call for current user
        .mockResolvedValueOnce(null); // Second call for email check (not exists)
      mockAuthService.generateEmailVerificationToken.mockResolvedValue(
        'verification-token',
      );
      mockEmailService.sendEmailVerification.mockResolvedValue(undefined);
      mockPrismaService.user.update.mockResolvedValue({
        id: 'user-1',
        name: 'Updated Name',
        email: 'newemail@test.com',
        status: 'pending',
      });

      const result = await service.updateCurrentUser('user-1', updateDto);

      expect(result).toEqual({
        id: 'user-1',
        name: 'Updated Name',
        email: 'newemail@test.com',
        status: 'pending',
        message: 'Profile updated. Please verify your new email address.',
      });
      expect(
        mockAuthService.generateEmailVerificationToken,
      ).toHaveBeenCalledWith('user-1', 'newemail@test.com');
      expect(mockEmailService.sendEmailVerification).toHaveBeenCalledWith(
        'newemail@test.com',
        'Updated Name',
        'verification-token',
      );
      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: {
          ...updateDto,
          cpf: null,
          status: 'pending',
          emailVerifiedAt: null,
        },
        select: {
          id: true,
          name: true,
          email: true,
          status: true,
        },
      });
    });

    it('should handle email conflicts when email already exists', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'user@test.com',
        name: 'Test User',
      };

      const existingUser = {
        id: 'user-2',
        email: 'existing@test.com',
      };

      mockPrismaService.user.findUnique
        .mockResolvedValueOnce(mockUser) // First call for current user
        .mockResolvedValueOnce(existingUser); // Second call for email check (exists)

      await expect(
        service.updateCurrentUser('user-1', { email: 'existing@test.com' }),
      ).rejects.toThrow('User with this email already exists');
    });

    it('should not change email when same email is provided', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'user@test.com',
        name: 'Test User',
        phone: '(11) 99999-9999',
        companyId: 'company-1',
        mainUser: true,
        status: 'active',
      };

      const updateDto = {
        email: 'user@test.com', // Same email
        name: 'Updated Name',
      };

      const updatedUser = { ...mockUser, ...updateDto };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.user.update.mockResolvedValue(updatedUser);

      const result = await service.updateCurrentUser('user-1', updateDto);

      expect(result).toEqual(updatedUser);
      expect(
        mockAuthService.generateEmailVerificationToken,
      ).not.toHaveBeenCalled();
      expect(mockEmailService.sendEmailVerification).not.toHaveBeenCalled();
    });

    it('should handle CPF with whitespace correctly', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'user@test.com',
        name: 'Test User',
        cpf: '123.456.789-00',
      };

      const updateDto = {
        cpf: '   ', // Whitespace only
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.user.update.mockResolvedValue({
        ...mockUser,
        cpf: null,
      });

      await service.updateCurrentUser('user-1', updateDto);

      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: {
          ...updateDto,
          cpf: null,
        },
        include: { company: true },
      });
    });
  });

  describe('createTeamMember', () => {
    it('should create team member successfully', async () => {
      const mockMainUser = {
        id: 'main-user-1',
        email: 'main@test.com',
        companyId: 'company-1',
        mainUser: true,
        status: 'active',
        name: 'Main User',
        company: {
          companyName: 'Test Company',
        },
      };

      const createDto = {
        email: 'team@test.com',
        name: 'Team Member',
        phone: '(11) 99999-9999',
        cpf: '987.654.321-00',
        password: 'password123',
        permissions: {
          registration: {
            animals: { view: true, add: false, edit: false, remove: false },
          },
        },
      };

      const createdUser = {
        id: 'team-user-1',
        ...createDto,
        password: 'hashed-password',
        companyId: 'company-1',
        mainUser: false,
        status: 'pending',
      };

      mockPrismaService.user.findUnique
        .mockResolvedValueOnce(mockMainUser) // First call for main user
        .mockResolvedValueOnce(null); // Second call for email check
      mockAuthService.hashPassword.mockResolvedValue('hashed-password');
      mockAuthService.generateEmailVerificationToken.mockResolvedValue(
        'verification-token',
      );
      mockPrismaService.user.create.mockResolvedValue(createdUser);
      mockEmailService.sendTeamMemberInvitation.mockResolvedValue(undefined);

      const result = await service.createTeamMember('main-user-1', createDto);

      expect(result).toEqual(
        expect.objectContaining({
          ...createdUser,
          message: 'Team member created successfully. Invitation email sent.',
        }),
      );
      expect(mockAuthService.hashPassword).toHaveBeenCalledWith('password123');
      expect(mockPrismaService.user.create).toHaveBeenCalledWith({
        data: {
          email: 'team@test.com',
          name: 'Team Member',
          phone: '(11) 99999-9999',
          cpf: '987.654.321-00',
          password: 'hashed-password',
          companyId: 'company-1',
          mainUser: false,
          status: 'pending',
          permissions: expect.any(Object), // Full default permissions structure
        },
        select: {
          id: true,
          name: true,
          email: true,
          mainUser: true,
          status: true,
          createdAt: true,
        },
      });
      expect(mockEmailService.sendTeamMemberInvitation).toHaveBeenCalled();
    });

    it('should create team member without password (generate random)', async () => {
      const mockMainUser = {
        id: 'main-user-1',
        email: 'main@test.com',
        companyId: 'company-1',
        mainUser: true,
        status: 'active',
        name: 'Main User',
        company: {
          companyName: 'Test Company',
        },
      };

      const createDto = {
        email: 'team@test.com',
        name: 'Team Member',
        phone: '(11) 99999-9999',
        cpf: '987.654.321-00',
        // No password provided
      };

      const createdUser = {
        id: 'team-user-1',
        ...createDto,
        password: 'hashed-random-password',
        companyId: 'company-1',
        mainUser: false,
        status: 'pending',
      };

      mockPrismaService.user.findUnique
        .mockResolvedValueOnce(mockMainUser)
        .mockResolvedValueOnce(null);
      mockAuthService.hashPassword.mockResolvedValue('hashed-random-password');
      mockAuthService.generateEmailVerificationToken.mockResolvedValue(
        'verification-token',
      );
      mockPrismaService.user.create.mockResolvedValue(createdUser);
      mockEmailService.sendTeamMemberInvitation.mockResolvedValue(undefined);

      await service.createTeamMember('main-user-1', createDto);

      expect(mockAuthService.hashPassword).toHaveBeenCalled();
      const hashCall = mockAuthService.hashPassword.mock.calls[0][0];
      expect(hashCall).toBeDefined();
      expect(typeof hashCall).toBe('string');
      expect(hashCall.length).toBeGreaterThan(0);
    });

    it('should handle CPF with whitespace correctly when creating team member', async () => {
      const mockMainUser = {
        id: 'main-user-1',
        email: 'main@test.com',
        companyId: 'company-1',
        mainUser: true,
        status: 'active',
        name: 'Main User',
        company: {
          companyName: 'Test Company',
        },
      };

      const createDto = {
        email: 'team@test.com',
        name: 'Team Member',
        phone: '(11) 99999-9999',
        cpf: '   ', // Whitespace only
      };

      mockPrismaService.user.findUnique
        .mockResolvedValueOnce(mockMainUser)
        .mockResolvedValueOnce(null);
      mockAuthService.hashPassword.mockResolvedValue('hashed-password');
      mockAuthService.generateEmailVerificationToken.mockResolvedValue(
        'verification-token',
      );
      mockPrismaService.user.create.mockResolvedValue({
        id: 'team-user-1',
        ...createDto,
        cpf: null,
      });
      mockEmailService.sendTeamMemberInvitation.mockResolvedValue(undefined);

      await service.createTeamMember('main-user-1', createDto);

      expect(mockPrismaService.user.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          cpf: null,
        }),
        select: expect.any(Object),
      });
    });

    it('should throw error when main user not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(
        service.createTeamMember('nonexistent-user', {
          email: 'team@test.com',
          name: 'Team Member',
          phone: '(11) 99999-9999',
          cpf: '987.654.321-00',
          password: 'password123',
        }),
      ).rejects.toThrow('User not found');
    });

    it('should throw error when user is not main user', async () => {
      const mockTeamUser = {
        id: 'team-user-1',
        email: 'team@test.com',
        companyId: 'company-1',
        mainUser: false,
        status: 'active',
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockTeamUser);

      await expect(
        service.createTeamMember('team-user-1', {
          email: 'newteam@test.com',
          name: 'New Team Member',
          phone: '(11) 99999-9999',
          cpf: '987.654.321-00',
          password: 'password123',
        }),
      ).rejects.toThrow('Only main users can create team members');
    });

    it('should handle email conflicts during creation', async () => {
      const mockMainUser = {
        id: 'main-user-1',
        email: 'main@test.com',
        companyId: 'company-1',
        mainUser: true,
        status: 'active',
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockMainUser);
      mockAuthService.hashPassword.mockResolvedValue('hashed-password');
      mockPrismaService.user.create.mockRejectedValue(
        new Error('Email already exists'),
      );

      await expect(
        service.createTeamMember('main-user-1', {
          email: 'existing@test.com',
          name: 'Team Member',
          phone: '(11) 99999-9999',
          cpf: '987.654.321-00',
          password: 'password123',
        }),
      ).rejects.toThrow('User with this email already exists');
    });
  });

  describe('updateTeamMember', () => {
    it('should update team member successfully', async () => {
      const mockMainUser = {
        id: 'main-user-1',
        email: 'main@test.com',
        companyId: 'company-1',
        mainUser: true,
        status: 'active',
      };

      const mockTeamMember = {
        id: 'team-user-1',
        email: 'team@test.com',
        name: 'Team Member',
        companyId: 'company-1',
        mainUser: false,
        status: 'active',
      };

      const updateDto = {
        name: 'Updated Team Member',
        phone: '(11) 88888-8888',
      };

      const updatedUser = { ...mockTeamMember, ...updateDto };

      mockPrismaService.user.findUnique
        .mockResolvedValueOnce(mockMainUser)
        .mockResolvedValueOnce(mockTeamMember);
      mockPrismaService.user.update.mockResolvedValue(updatedUser);

      const result = await service.updateTeamMember(
        'main-user-1',
        'team-user-1',
        updateDto,
      );

      expect(result).toEqual(updatedUser);
      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: 'team-user-1' },
        data: {
          ...updateDto,
          cpf: null, // Service sets cpf to null when not provided
        },
        select: {
          id: true,
          name: true,
          cpf: true,
          email: true,
          phone: true,
          street: true,
          number: true,
          complement: true,
          neighborhood: true,
          city: true,
          state: true,
          zipCode: true,
          mainUser: true,
          status: true,
          permissions: true,
          lastAccess: true,
          emailVerifiedAt: true,
          createdAt: true,
        },
      });
    });

    it('should throw error when main user not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(
        service.updateTeamMember('nonexistent-user', 'team-user-1', {
          name: 'Updated Name',
        }),
      ).rejects.toThrow('User not found');
    });

    it('should throw error when target user not found', async () => {
      const mockMainUser = {
        id: 'main-user-1',
        email: 'main@test.com',
        companyId: 'company-1',
        mainUser: true,
        status: 'active',
      };

      mockPrismaService.user.findUnique
        .mockResolvedValueOnce(mockMainUser)
        .mockResolvedValueOnce(null);

      await expect(
        service.updateTeamMember('main-user-1', 'nonexistent-team-user', {
          name: 'Updated Name',
        }),
      ).rejects.toThrow('Target user not found');
    });

    it('should throw error when trying to update user from different company', async () => {
      const mockMainUser = {
        id: 'main-user-1',
        email: 'main@test.com',
        companyId: 'company-1',
        mainUser: true,
        status: 'active',
      };

      const mockOtherCompanyUser = {
        id: 'other-user-1',
        email: 'other@test.com',
        companyId: 'company-2',
        mainUser: false,
        status: 'active',
      };

      mockPrismaService.user.findUnique
        .mockResolvedValueOnce(mockMainUser)
        .mockResolvedValueOnce(mockOtherCompanyUser);

      await expect(
        service.updateTeamMember('main-user-1', 'other-user-1', {
          name: 'Updated Name',
        }),
      ).rejects.toThrow('Cannot update users from different companies');
    });

    it('should handle email change for team member with verification', async () => {
      const mockMainUser = {
        id: 'main-user-1',
        email: 'main@test.com',
        companyId: 'company-1',
        mainUser: true,
        status: 'active',
      };

      const mockTeamMember = {
        id: 'team-user-1',
        email: 'team@test.com',
        name: 'Team Member',
        companyId: 'company-1',
        mainUser: false,
        status: 'active',
      };

      const updateDto = {
        email: 'newemail@test.com',
        name: 'Updated Team Member',
      };

      mockPrismaService.user.findUnique
        .mockResolvedValueOnce(mockMainUser)
        .mockResolvedValueOnce(mockTeamMember)
        .mockResolvedValueOnce(null); // Email check (not exists)
      mockAuthService.generateEmailVerificationToken.mockResolvedValue(
        'verification-token',
      );
      mockEmailService.sendEmailVerification.mockResolvedValue(undefined);
      mockPrismaService.user.update.mockResolvedValue({
        id: 'team-user-1',
        name: 'Updated Team Member',
        email: 'newemail@test.com',
        status: 'pending',
        mainUser: false,
      });

      const result = await service.updateTeamMember(
        'main-user-1',
        'team-user-1',
        updateDto,
      );

      expect(result).toEqual({
        id: 'team-user-1',
        name: 'Updated Team Member',
        email: 'newemail@test.com',
        status: 'pending',
        mainUser: false,
        message: 'User updated. Email verification sent to new address.',
      });
      expect(
        mockAuthService.generateEmailVerificationToken,
      ).toHaveBeenCalledWith('team-user-1', 'newemail@test.com');
      expect(mockEmailService.sendEmailVerification).toHaveBeenCalledWith(
        'newemail@test.com',
        'Updated Team Member',
        'verification-token',
      );
    });

    it('should handle email conflicts when updating team member', async () => {
      const mockMainUser = {
        id: 'main-user-1',
        email: 'main@test.com',
        companyId: 'company-1',
        mainUser: true,
        status: 'active',
      };

      const mockTeamMember = {
        id: 'team-user-1',
        email: 'team@test.com',
        name: 'Team Member',
        companyId: 'company-1',
        mainUser: false,
        status: 'active',
      };

      const existingUser = {
        id: 'user-2',
        email: 'existing@test.com',
      };

      mockPrismaService.user.findUnique
        .mockResolvedValueOnce(mockMainUser)
        .mockResolvedValueOnce(mockTeamMember)
        .mockResolvedValueOnce(existingUser); // Email check (exists)

      await expect(
        service.updateTeamMember('main-user-1', 'team-user-1', {
          email: 'existing@test.com',
        }),
      ).rejects.toThrow('User with this email already exists');
    });

    it('should not change email when same email is provided for team member', async () => {
      const mockMainUser = {
        id: 'main-user-1',
        email: 'main@test.com',
        companyId: 'company-1',
        mainUser: true,
        status: 'active',
      };

      const mockTeamMember = {
        id: 'team-user-1',
        email: 'team@test.com',
        name: 'Team Member',
        companyId: 'company-1',
        mainUser: false,
        status: 'active',
      };

      const updateDto = {
        email: 'team@test.com', // Same email
        name: 'Updated Team Member',
      };

      const updatedUser = { ...mockTeamMember, ...updateDto };

      mockPrismaService.user.findUnique
        .mockResolvedValueOnce(mockMainUser)
        .mockResolvedValueOnce(mockTeamMember);
      mockPrismaService.user.update.mockResolvedValue(updatedUser);

      const result = await service.updateTeamMember(
        'main-user-1',
        'team-user-1',
        updateDto,
      );

      expect(result).toEqual(updatedUser);
      expect(
        mockAuthService.generateEmailVerificationToken,
      ).not.toHaveBeenCalled();
      expect(mockEmailService.sendEmailVerification).not.toHaveBeenCalled();
    });

    it('should handle CPF with whitespace correctly for team member', async () => {
      const mockMainUser = {
        id: 'main-user-1',
        email: 'main@test.com',
        companyId: 'company-1',
        mainUser: true,
        status: 'active',
      };

      const mockTeamMember = {
        id: 'team-user-1',
        email: 'team@test.com',
        name: 'Team Member',
        companyId: 'company-1',
        mainUser: false,
        status: 'active',
        cpf: '123.456.789-00',
      };

      const updateDto = {
        cpf: '   ', // Whitespace only
      };

      mockPrismaService.user.findUnique
        .mockResolvedValueOnce(mockMainUser)
        .mockResolvedValueOnce(mockTeamMember);
      mockPrismaService.user.update.mockResolvedValue({
        ...mockTeamMember,
        cpf: null,
      });

      await service.updateTeamMember('main-user-1', 'team-user-1', updateDto);

      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: 'team-user-1' },
        data: {
          ...updateDto,
          cpf: null,
        },
        select: expect.any(Object),
      });
    });
  });

  describe('updateUserPermissions', () => {
    it('should update user permissions successfully', async () => {
      const mockMainUser = {
        id: 'main-user-1',
        email: 'main@test.com',
        companyId: 'company-1',
        mainUser: true,
        status: 'active',
      };

      const mockTeamMember = {
        id: 'team-user-1',
        email: 'team@test.com',
        companyId: 'company-1',
        mainUser: false,
        status: 'active',
        permissions: null,
      };

      const permissionsDto = {
        permissions: {
          registration: {
            animals: { view: true, add: true, edit: true, remove: false },
          },
        },
      };

      const updatedUser = { ...mockTeamMember, ...permissionsDto };

      mockPrismaService.user.findUnique
        .mockResolvedValueOnce(mockMainUser)
        .mockResolvedValueOnce(mockTeamMember);
      mockPrismaService.user.update.mockResolvedValue(updatedUser);

      const result = await service.updateUserPermissions(
        'main-user-1',
        'team-user-1',
        permissionsDto,
      );

      expect(result).toEqual(
        expect.objectContaining({
          permissions: permissionsDto.permissions,
          message: 'Permissions updated successfully',
        }),
      );
      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: 'team-user-1' },
        data: {
          permissions: {
            permissions: {
              registration: {
                animals: { view: true, add: true, edit: true, remove: false },
              },
            },
          },
        },
        select: {
          id: true,
          name: true,
          email: true,
          permissions: true,
        },
      });
    });

    it('should throw error when trying to update main user permissions', async () => {
      const mockMainUser = {
        id: 'main-user-1',
        email: 'main@test.com',
        companyId: 'company-1',
        mainUser: true,
        status: 'active',
      };

      mockPrismaService.user.findUnique
        .mockResolvedValueOnce(mockMainUser)
        .mockResolvedValueOnce(mockMainUser);

      await expect(
        service.updateUserPermissions('main-user-1', 'main-user-1', {
          permissions: {
            registration: {
              animals: { view: true, add: true, edit: true, remove: true },
            },
          },
        }),
      ).rejects.toThrow('Cannot update permissions for main user');
    });
  });

  describe('deactivateUser', () => {
    it('should deactivate user successfully', async () => {
      const mockMainUser = {
        id: 'main-user-1',
        email: 'main@test.com',
        companyId: 'company-1',
        mainUser: true,
        status: 'active',
      };

      const mockTeamMember = {
        id: 'team-user-1',
        email: 'team@test.com',
        companyId: 'company-1',
        mainUser: false,
        status: 'active',
      };

      const deactivatedUser = { ...mockTeamMember, status: 'inactive' };

      mockPrismaService.user.findUnique
        .mockResolvedValueOnce(mockMainUser)
        .mockResolvedValueOnce(mockTeamMember);

      // Mock the transaction
      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        const mockTx = {
          user: { update: jest.fn().mockResolvedValue(deactivatedUser) },
          refreshToken: { deleteMany: jest.fn() },
        };
        return callback(mockTx);
      });

      const result = await service.deactivateUser('main-user-1', 'team-user-1');

      expect(result).toEqual({ message: 'User deactivated successfully' });
      expect(mockPrismaService.$transaction).toHaveBeenCalled();
    });

    it('should throw error when trying to deactivate main user', async () => {
      const mockMainUser = {
        id: 'main-user-1',
        email: 'main@test.com',
        companyId: 'company-1',
        mainUser: true,
        status: 'active',
      };

      mockPrismaService.user.findUnique
        .mockResolvedValueOnce(mockMainUser)
        .mockResolvedValueOnce(mockMainUser);

      await expect(
        service.deactivateUser('main-user-1', 'main-user-1'),
      ).rejects.toThrow('Cannot deactivate main user');
    });

    it('should deactivate user even if already inactive', async () => {
      const mockMainUser = {
        id: 'main-user-1',
        email: 'main@test.com',
        companyId: 'company-1',
        mainUser: true,
        status: 'active',
      };

      const mockInactiveUser = {
        id: 'team-user-1',
        email: 'team@test.com',
        companyId: 'company-1',
        mainUser: false,
        status: 'inactive',
      };

      mockPrismaService.user.findUnique
        .mockResolvedValueOnce(mockMainUser)
        .mockResolvedValueOnce(mockInactiveUser);

      const result = await service.deactivateUser('main-user-1', 'team-user-1');

      expect(result).toEqual({ message: 'User deactivated successfully' });
    });
  });
});
