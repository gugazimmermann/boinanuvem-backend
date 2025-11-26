import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { PrismaService } from '../common/services/prisma.service';
import { AuthService } from '../auth/auth.service';
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
  };

  const mockAuthService = {
    hashPassword: jest.fn(),
    generateEmailVerificationToken: jest.fn(),
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
        company: { id: 'company-1', name: 'Test Company' },
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.getCurrentUser('user-1');

      expect(result).toEqual(mockUser);
      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        include: { company: true },
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
});
