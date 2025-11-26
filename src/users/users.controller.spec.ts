import { Test, TestingModule } from '@nestjs/testing';
import { ThrottlerModule } from '@nestjs/throttler';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { CreateUserDto, UpdateUserDto, UpdatePermissionsDto } from './dto';
import type { CurrentUser } from '../auth/decorators/current-user.decorator';

describe('UsersController', () => {
  let controller: UsersController;
  let usersService: jest.Mocked<UsersService>;

  const mockCurrentUser: CurrentUser = {
    id: 'user-1',
    email: 'main@test.com',
    companyId: 'company-1',
    mainUser: true,
  };

  // Team member mock is created inline in tests where needed

  const mockUserProfile = {
    id: 'user-1',
    email: 'main@test.com',
    name: 'Main User',
    phone: '(11) 99999-9999',
    cpf: '123.456.789-00',
    companyId: 'company-1',
    mainUser: true,
    status: 'active',
    emailVerifiedAt: new Date(),
    permissions: null,
    lastAccess: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockTeamMembers = [
    {
      id: 'user-2',
      email: 'team1@test.com',
      name: 'Team Member 1',
      phone: '(11) 88888-8888',
      companyId: 'company-1',
      mainUser: false,
      status: 'active',
      permissions: {
        registration: {
          animals: { view: true, add: false, edit: false, remove: false },
        },
      },
    },
    {
      id: 'user-3',
      email: 'team2@test.com',
      name: 'Team Member 2',
      phone: '(11) 77777-7777',
      companyId: 'company-1',
      mainUser: false,
      status: 'active',
      permissions: {
        registration: {
          animals: { view: true, add: true, edit: true, remove: false },
        },
      },
    },
  ];

  const mockCreateUserDto: CreateUserDto = {
    email: 'newuser@test.com',
    name: 'New User',
    phone: '(11) 66666-6666',
    cpf: '987.654.321-00',
    password: 'password123',
    permissions: {
      registration: {
        animals: { view: true, add: false, edit: false, remove: false },
      },
    },
  };

  const mockUpdateUserDto: UpdateUserDto = {
    name: 'Updated Name',
    phone: '(11) 55555-5555',
  };

  const mockUpdatePermissionsDto: UpdatePermissionsDto = {
    permissions: {
      registration: {
        animals: { view: true, add: true, edit: true, remove: true },
      },
    },
  };

  beforeEach(async () => {
    const mockUsersService = {
      getCurrentUser: jest.fn(),
      updateCurrentUser: jest.fn(),
      getTeamMembers: jest.fn(),
      createTeamMember: jest.fn(),
      updateTeamMember: jest.fn(),
      updateUserPermissions: jest.fn(),
      deactivateUser: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ThrottlerModule.forRoot([
          {
            ttl: 60000,
            limit: 10,
          },
        ]),
      ],
      controllers: [UsersController],
      providers: [
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .overrideGuard(PermissionsGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .compile();

    controller = module.get<UsersController>(UsersController);
    usersService = module.get(UsersService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getCurrentUser', () => {
    it('should get current user profile successfully', async () => {
      usersService.getCurrentUser.mockResolvedValue(mockUserProfile);

      const result = await controller.getCurrentUser(mockCurrentUser);

      expect(result).toEqual(mockUserProfile);
      expect(usersService.getCurrentUser).toHaveBeenCalledWith('user-1');
    });

    it('should handle user not found', async () => {
      const error = new Error('User not found');
      usersService.getCurrentUser.mockRejectedValue(error);

      await expect(controller.getCurrentUser(mockCurrentUser)).rejects.toThrow(
        'User not found',
      );
      expect(usersService.getCurrentUser).toHaveBeenCalledWith('user-1');
    });
  });

  describe('updateCurrentUser', () => {
    it('should update current user profile successfully', async () => {
      const updatedProfile = { ...mockUserProfile, ...mockUpdateUserDto };
      usersService.updateCurrentUser.mockResolvedValue(updatedProfile);

      const result = await controller.updateCurrentUser(
        mockCurrentUser,
        mockUpdateUserDto,
      );

      expect(result).toEqual(updatedProfile);
      expect(usersService.updateCurrentUser).toHaveBeenCalledWith(
        'user-1',
        mockUpdateUserDto,
      );
    });

    it('should handle email conflict during update', async () => {
      const error = new Error('Email already exists');
      usersService.updateCurrentUser.mockRejectedValue(error);

      await expect(
        controller.updateCurrentUser(mockCurrentUser, {
          email: 'existing@test.com',
        }),
      ).rejects.toThrow('Email already exists');
    });

    it('should handle validation errors', async () => {
      const invalidDto = { email: 'invalid-email' } as UpdateUserDto;
      const error = new Error('Invalid email format');
      usersService.updateCurrentUser.mockRejectedValue(error);

      await expect(
        controller.updateCurrentUser(mockCurrentUser, invalidDto),
      ).rejects.toThrow('Invalid email format');
    });
  });

  describe('getTeamMembers', () => {
    it('should get team members successfully for main user', async () => {
      usersService.getTeamMembers.mockResolvedValue(mockTeamMembers);

      const result = await controller.getTeamMembers(mockCurrentUser);

      expect(result).toEqual(mockTeamMembers);
      expect(usersService.getTeamMembers).toHaveBeenCalledWith('user-1');
    });

    it('should handle empty team members list', async () => {
      usersService.getTeamMembers.mockResolvedValue([]);

      const result = await controller.getTeamMembers(mockCurrentUser);

      expect(result).toEqual([]);
      expect(usersService.getTeamMembers).toHaveBeenCalledWith('user-1');
    });

    it('should handle service errors', async () => {
      const error = new Error('Database connection failed');
      usersService.getTeamMembers.mockRejectedValue(error);

      await expect(controller.getTeamMembers(mockCurrentUser)).rejects.toThrow(
        'Database connection failed',
      );
    });
  });

  describe('createTeamMember', () => {
    it('should create team member successfully', async () => {
      const createdUser = {
        id: 'user-4',
        ...mockCreateUserDto,
        companyId: 'company-1',
        mainUser: false,
        status: 'pending',
      };
      usersService.createTeamMember.mockResolvedValue(createdUser);

      const result = await controller.createTeamMember(
        mockCurrentUser,
        mockCreateUserDto,
      );

      expect(result).toEqual(createdUser);
      expect(usersService.createTeamMember).toHaveBeenCalledWith(
        'user-1',
        mockCreateUserDto,
      );
    });

    it('should handle email conflict during creation', async () => {
      const error = new Error('User with email already exists');
      usersService.createTeamMember.mockRejectedValue(error);

      await expect(
        controller.createTeamMember(mockCurrentUser, mockCreateUserDto),
      ).rejects.toThrow('User with email already exists');
    });

    it('should handle invalid permissions in creation', async () => {
      const invalidDto = {
        ...mockCreateUserDto,
        permissions: { invalid: 'permissions' },
      } as any;
      const error = new Error('Invalid permissions structure');
      usersService.createTeamMember.mockRejectedValue(error);

      await expect(
        controller.createTeamMember(mockCurrentUser, invalidDto),
      ).rejects.toThrow('Invalid permissions structure');
    });

    it('should handle missing required fields', async () => {
      const incompleteDto = { email: 'test@test.com' } as CreateUserDto;
      const error = new Error('Missing required fields');
      usersService.createTeamMember.mockRejectedValue(error);

      await expect(
        controller.createTeamMember(mockCurrentUser, incompleteDto),
      ).rejects.toThrow('Missing required fields');
    });
  });

  describe('updateTeamMember', () => {
    it('should update team member successfully', async () => {
      const updatedUser = {
        ...mockTeamMembers[0],
        ...mockUpdateUserDto,
      };
      usersService.updateTeamMember.mockResolvedValue(updatedUser);

      const result = await controller.updateTeamMember(
        mockCurrentUser,
        'user-2',
        mockUpdateUserDto,
      );

      expect(result).toEqual(updatedUser);
      expect(usersService.updateTeamMember).toHaveBeenCalledWith(
        'user-1',
        'user-2',
        mockUpdateUserDto,
      );
    });

    it('should handle user not found during update', async () => {
      const error = new Error('User not found');
      usersService.updateTeamMember.mockRejectedValue(error);

      await expect(
        controller.updateTeamMember(
          mockCurrentUser,
          'nonexistent-id',
          mockUpdateUserDto,
        ),
      ).rejects.toThrow('User not found');
    });

    it('should handle email conflict during team member update', async () => {
      const error = new Error('Email already exists');
      usersService.updateTeamMember.mockRejectedValue(error);

      await expect(
        controller.updateTeamMember(mockCurrentUser, 'user-2', {
          email: 'existing@test.com',
        }),
      ).rejects.toThrow('Email already exists');
    });

    it('should handle unauthorized access to other company users', async () => {
      const error = new Error('Access denied');
      usersService.updateTeamMember.mockRejectedValue(error);

      await expect(
        controller.updateTeamMember(
          mockCurrentUser,
          'other-company-user',
          mockUpdateUserDto,
        ),
      ).rejects.toThrow('Access denied');
    });
  });

  describe('updateUserPermissions', () => {
    it('should update user permissions successfully', async () => {
      const updatedUser = {
        ...mockTeamMembers[0],
        permissions: mockUpdatePermissionsDto.permissions,
      };
      usersService.updateUserPermissions.mockResolvedValue(updatedUser);

      const result = await controller.updateUserPermissions(
        mockCurrentUser,
        'user-2',
        mockUpdatePermissionsDto,
      );

      expect(result).toEqual(updatedUser);
      expect(usersService.updateUserPermissions).toHaveBeenCalledWith(
        'user-1',
        'user-2',
        mockUpdatePermissionsDto,
      );
    });

    it('should handle user not found during permissions update', async () => {
      const error = new Error('User not found');
      usersService.updateUserPermissions.mockRejectedValue(error);

      await expect(
        controller.updateUserPermissions(
          mockCurrentUser,
          'nonexistent-id',
          mockUpdatePermissionsDto,
        ),
      ).rejects.toThrow('User not found');
    });

    it('should handle invalid permissions structure', async () => {
      const invalidPermissions = {
        permissions: { invalid: 'structure' },
      } as any;
      const error = new Error('Invalid permissions structure');
      usersService.updateUserPermissions.mockRejectedValue(error);

      await expect(
        controller.updateUserPermissions(
          mockCurrentUser,
          'user-2',
          invalidPermissions,
        ),
      ).rejects.toThrow('Invalid permissions structure');
    });

    it('should handle attempt to update main user permissions', async () => {
      const error = new Error('Cannot update main user permissions');
      usersService.updateUserPermissions.mockRejectedValue(error);

      await expect(
        controller.updateUserPermissions(
          mockCurrentUser,
          'main-user-id',
          mockUpdatePermissionsDto,
        ),
      ).rejects.toThrow('Cannot update main user permissions');
    });
  });

  describe('deactivateUser', () => {
    it('should deactivate user successfully', async () => {
      const deactivatedUser = {
        ...mockTeamMembers[0],
        status: 'inactive',
      };
      usersService.deactivateUser.mockResolvedValue(deactivatedUser);

      const result = await controller.deactivateUser(mockCurrentUser, 'user-2');

      expect(result).toEqual(deactivatedUser);
      expect(usersService.deactivateUser).toHaveBeenCalledWith(
        'user-1',
        'user-2',
      );
    });

    it('should handle user not found during deactivation', async () => {
      const error = new Error('User not found');
      usersService.deactivateUser.mockRejectedValue(error);

      await expect(
        controller.deactivateUser(mockCurrentUser, 'nonexistent-id'),
      ).rejects.toThrow('User not found');
    });

    it('should handle attempt to deactivate main user', async () => {
      const error = new Error('Cannot deactivate main user');
      usersService.deactivateUser.mockRejectedValue(error);

      await expect(
        controller.deactivateUser(mockCurrentUser, 'main-user-id'),
      ).rejects.toThrow('Cannot deactivate main user');
    });

    it('should handle attempt to deactivate already inactive user', async () => {
      const error = new Error('User is already inactive');
      usersService.deactivateUser.mockRejectedValue(error);

      await expect(
        controller.deactivateUser(mockCurrentUser, 'inactive-user-id'),
      ).rejects.toThrow('User is already inactive');
    });

    it('should handle unauthorized access to other company users', async () => {
      const error = new Error('Access denied');
      usersService.deactivateUser.mockRejectedValue(error);

      await expect(
        controller.deactivateUser(mockCurrentUser, 'other-company-user'),
      ).rejects.toThrow('Access denied');
    });
  });

  describe('error handling', () => {
    it('should handle service unavailable errors', async () => {
      const error = new Error('Service temporarily unavailable');
      usersService.getCurrentUser.mockRejectedValue(error);

      await expect(controller.getCurrentUser(mockCurrentUser)).rejects.toThrow(
        'Service temporarily unavailable',
      );
    });

    it('should handle database connection errors', async () => {
      const error = new Error('Database connection failed');
      usersService.getTeamMembers.mockRejectedValue(error);

      await expect(controller.getTeamMembers(mockCurrentUser)).rejects.toThrow(
        'Database connection failed',
      );
    });

    it('should handle timeout errors', async () => {
      const error = new Error('Request timeout');
      error.name = 'TimeoutError';
      usersService.createTeamMember.mockRejectedValue(error);

      await expect(
        controller.createTeamMember(mockCurrentUser, mockCreateUserDto),
      ).rejects.toThrow('Request timeout');
    });
  });

  describe('edge cases', () => {
    it('should handle empty update data', async () => {
      const emptyUpdate = {};
      usersService.updateCurrentUser.mockResolvedValue(mockUserProfile);

      const result = await controller.updateCurrentUser(
        mockCurrentUser,
        emptyUpdate,
      );

      expect(result).toEqual(mockUserProfile);
      expect(usersService.updateCurrentUser).toHaveBeenCalledWith(
        'user-1',
        emptyUpdate,
      );
    });

    it('should handle null permissions update', async () => {
      const nullPermissions = { permissions: null } as any;
      const updatedUser = { ...mockTeamMembers[0], permissions: null };
      usersService.updateUserPermissions.mockResolvedValue(updatedUser);

      const result = await controller.updateUserPermissions(
        mockCurrentUser,
        'user-2',
        nullPermissions,
      );

      expect(result).toEqual(updatedUser);
    });

    it('should handle very long user IDs', async () => {
      const longId = 'a'.repeat(100);
      const error = new Error('Invalid user ID format');
      usersService.updateTeamMember.mockRejectedValue(error);

      await expect(
        controller.updateTeamMember(mockCurrentUser, longId, mockUpdateUserDto),
      ).rejects.toThrow('Invalid user ID format');
    });
  });
});
