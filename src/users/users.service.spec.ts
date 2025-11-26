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
        data: updateDto,
        include: { company: true },
      });
    });

    it('should throw error when user not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(
        service.updateCurrentUser('nonexistent-user', { name: 'New Name' }),
      ).rejects.toThrow('User not found');
    });

    it('should handle email conflicts', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'user@test.com',
        name: 'Test User',
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.user.update.mockRejectedValue(
        new Error('Email already exists'),
      );

      await expect(
        service.updateCurrentUser('user-1', { email: 'existing@test.com' }),
      ).rejects.toThrow('User with this email already exists');
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
        data: updateDto,
        select: expect.any(Object),
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
