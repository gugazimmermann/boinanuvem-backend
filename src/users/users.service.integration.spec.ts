import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { UsersService } from './users.service';
import { PrismaService } from '../common/services/prisma.service';
import { AuthService } from '../auth/auth.service';
import { EmailService } from '../email/email.service';
import { TrialService } from '../common/services/trial.service';
import { CreateUserDto, UpdateUserDto, UpdatePermissionsDto } from './dto';
import {
  describeOrSkip,
  setupIntegrationTest,
  teardownIntegrationTest,
  IntegrationTestContext,
} from '../../test/integration-test-helpers';

describeOrSkip('UsersService Integration Tests', () => {
  let service: UsersService;
  let context: IntegrationTestContext;
  let testUser: any;
  let mainUser: any;

  beforeAll(async () => {
    context = await setupIntegrationTest({
      cnpj: '11.222.333/0001-05',
      companyName: 'Test Users Company',
      email: 'users@testcompany.com',
      userEmail: 'main-user@testcompany.com',
    });
    mainUser = context.testUser;
  });

  afterAll(async () => {
    await teardownIntegrationTest(context, {
      tables: ['user'],
    });
  });

  beforeEach(async () => {
    const mockAuthService = {
      generateEmailVerificationToken: jest.fn().mockResolvedValue('test-token'),
      hashPassword: jest.fn().mockResolvedValue('hashed-password'),
    };

    const mockEmailService = {
      sendTeamMemberInvitation: jest.fn().mockResolvedValue(undefined),
      sendEmailVerification: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: PrismaService,
          useValue: context.prisma,
        },
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
        {
          provide: EmailService,
          useValue: mockEmailService,
        },
        TrialService,
        Logger,
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);

    // Clean up existing test users (except main user)
    await context.prisma.user.deleteMany({
      where: {
        companyId: context.testCompany.id,
        mainUser: false,
        email: { not: 'main-user@testcompany.com' },
      },
    });
  });

  afterEach(async () => {
    await context.prisma.user.deleteMany({
      where: {
        companyId: context.testCompany.id,
        mainUser: false,
        email: { not: 'main-user@testcompany.com' },
      },
    });
  });

  describe('createUser with real database', () => {
    it('should create a user successfully', async () => {
      const createDto: CreateUserDto = {
        name: 'Test User',
        email: 'test-user@testcompany.com',
        phone: '(47) 99999-7777',
        permissions: {
          registration: {
            animals: { view: true, add: true, edit: false, remove: false },
          },
        },
      };

      const result = await service.createTeamMember(mainUser.id, createDto);

      expect(result).toMatchObject({
        name: 'Test User',
        email: 'test-user@testcompany.com',
        status: 'pending',
        mainUser: false,
      });
      expect(result.id).toBeDefined();
      expect(result.message).toBeDefined();
      // Note: createTeamMember returns selected fields, not full user object

      // Verify in database
      const user = await context.prisma.user.findUnique({
        where: { email: 'test-user@testcompany.com' },
      });
      expect(user).toBeDefined();
      expect(user?.companyId).toBe(context.testCompany.id);
      expect(user?.mainUser).toBe(false);
    });

    it('should fail with duplicate email', async () => {
      const createDto: CreateUserDto = {
        name: 'Test User',
        email: 'duplicate@testcompany.com',
        phone: '(47) 99999-7777',
      };

      await service.createTeamMember(mainUser.id, createDto);

      // Try to create duplicate
      await expect(
        service.createTeamMember(mainUser.id, createDto),
      ).rejects.toThrow('User with this email already exists');
    });
  });

  describe('updateCurrentUser with real database', () => {
    beforeEach(async () => {
      const hashedPassword = await require('bcrypt').hash('password123', 10);
      testUser = await context.prisma.user.create({
        data: {
          name: 'Test User',
          email: 'test-user-update@testcompany.com',
          phone: '(47) 99999-7777',
          password: hashedPassword,
          companyId: context.testCompany.id,
          mainUser: false,
          status: 'active',
          emailVerifiedAt: new Date(),
          permissions: {},
        },
      });
    });

    it('should update user successfully', async () => {
      const updateDto: UpdateUserDto = {
        name: 'Updated User Name',
        phone: '(47) 88888-8888',
      };

      const result = await service.updateCurrentUser(testUser.id, updateDto);

      expect(result).toMatchObject({
        name: 'Updated User Name',
        phone: '(47) 88888-8888',
      });

      // Verify in database
      const user = await context.prisma.user.findUnique({
        where: { id: testUser.id },
      });
      expect(user?.name).toBe('Updated User Name');
      expect(user?.phone).toBe('(47) 88888-8888');
    });

    it('should fail with duplicate email', async () => {
      // Create another user
      const hashedPassword = await require('bcrypt').hash('password123', 10);
      await context.prisma.user.create({
        data: {
          name: 'Other User',
          email: 'other-user@testcompany.com',
          phone: '(47) 99999-6666',
          password: hashedPassword,
          companyId: context.testCompany.id,
          mainUser: false,
          status: 'active',
          emailVerifiedAt: new Date(),
          permissions: {},
        },
      });

      const updateDto: UpdateUserDto = {
        email: 'other-user@testcompany.com',
      };

      await expect(
        service.updateCurrentUser(testUser.id, updateDto),
      ).rejects.toThrow('User with this email already exists');
    });
  });

  describe('updatePermissions with real database', () => {
    beforeEach(async () => {
      const hashedPassword = await require('bcrypt').hash('password123', 10);
      testUser = await prisma.user.create({
        data: {
          name: 'Test User',
          email: 'test-user-permissions@testcompany.com',
          phone: '(47) 99999-7777',
          password: hashedPassword,
          companyId: testCompany.id,
          mainUser: false,
          status: 'active',
          emailVerifiedAt: new Date(),
          permissions: {},
        },
      });
    });

    it('should update user permissions successfully', async () => {
      const updateDto: UpdatePermissionsDto = {
        registration: {
          property: { view: false, add: false, edit: false, remove: false },
          location: { view: false, add: false, edit: false, remove: false },
          employee: { view: false, add: false, edit: false, remove: false },
          serviceProvider: {
            view: false,
            add: false,
            edit: false,
            remove: false,
          },
          supplier: { view: false, add: false, edit: false, remove: false },
          buyer: { view: false, add: false, edit: false, remove: false },
          inventory: { view: false, add: false, edit: false, remove: false },
          animals: { view: true, add: true, edit: true, remove: false },
        },
        records: {
          births: { view: true, add: false, edit: false, remove: false },
          acquisitions: { view: false, add: false, edit: false, remove: false },
          weighings: { view: false, add: false, edit: false, remove: false },
          sales: { view: false, add: false, edit: false, remove: false },
          deaths: { view: false, add: false, edit: false, remove: false },
          sanitaryControls: {
            view: false,
            add: false,
            edit: false,
            remove: false,
          },
          locationMovements: {
            view: false,
            add: false,
            edit: false,
            remove: false,
          },
          animalMovements: {
            view: false,
            add: false,
            edit: false,
            remove: false,
          },
        },
        breedings: {
          breedings: { view: false, add: false, edit: false, remove: false },
          unconfirmedBreedings: {
            view: false,
            add: false,
            edit: false,
            remove: false,
          },
          pregnantCows: { view: false, add: false, edit: false, remove: false },
          reproductiveIndexes: {
            view: false,
            add: false,
            edit: false,
            remove: false,
          },
          birthForecast: {
            view: false,
            add: false,
            edit: false,
            remove: false,
          },
        },
        finances: {
          cashFlow: { view: false, add: false, edit: false, remove: false },
          accountsPayable: {
            view: false,
            add: false,
            edit: false,
            remove: false,
          },
          accountsReceivable: {
            view: false,
            add: false,
            edit: false,
            remove: false,
          },
          bankAccounts: { view: false, add: false, edit: false, remove: false },
        },
      };

      const result = await service.updateUserPermissions(
        mainUser.id,
        testUser.id,
        updateDto,
      );

      expect(result.permissions).toBeDefined();
      // The service stores the UpdatePermissionsDto directly
      const resultPermissions = result.permissions as any;
      // Compare the actual structure - the service stores the DTO directly
      expect(resultPermissions.registration).toBeDefined();
      expect(resultPermissions.records).toBeDefined();
      expect(resultPermissions.registration.animals).toMatchObject(
        updateDto.registration.animals,
      );
      expect(resultPermissions.records.births).toMatchObject(
        updateDto.records.births,
      );

      // Verify in database
      const user = await context.prisma.user.findUnique({
        where: { id: testUser.id },
      });
      expect(user?.permissions).toBeDefined();
      const dbPermissions = user?.permissions as any;
      expect(dbPermissions.registration).toBeDefined();
      expect(dbPermissions.records).toBeDefined();
      expect(dbPermissions.registration.animals).toMatchObject(
        updateDto.registration.animals,
      );
      expect(dbPermissions.records.births).toMatchObject(
        updateDto.records.births,
      );
    });

    it('should fail if user is not main user', async () => {
      const updateDto: UpdatePermissionsDto = {
        registration: {
          property: { view: false, add: false, edit: false, remove: false },
          location: { view: false, add: false, edit: false, remove: false },
          employee: { view: false, add: false, edit: false, remove: false },
          serviceProvider: {
            view: false,
            add: false,
            edit: false,
            remove: false,
          },
          supplier: { view: false, add: false, edit: false, remove: false },
          buyer: { view: false, add: false, edit: false, remove: false },
          inventory: { view: false, add: false, edit: false, remove: false },
          animals: { view: true, add: true, edit: true, remove: false },
        },
        records: {
          births: { view: false, add: false, edit: false, remove: false },
          acquisitions: { view: false, add: false, edit: false, remove: false },
          weighings: { view: false, add: false, edit: false, remove: false },
          sales: { view: false, add: false, edit: false, remove: false },
          deaths: { view: false, add: false, edit: false, remove: false },
          sanitaryControls: {
            view: false,
            add: false,
            edit: false,
            remove: false,
          },
          locationMovements: {
            view: false,
            add: false,
            edit: false,
            remove: false,
          },
          animalMovements: {
            view: false,
            add: false,
            edit: false,
            remove: false,
          },
        },
        breedings: {
          breedings: { view: false, add: false, edit: false, remove: false },
          unconfirmedBreedings: {
            view: false,
            add: false,
            edit: false,
            remove: false,
          },
          pregnantCows: { view: false, add: false, edit: false, remove: false },
          reproductiveIndexes: {
            view: false,
            add: false,
            edit: false,
            remove: false,
          },
          birthForecast: {
            view: false,
            add: false,
            edit: false,
            remove: false,
          },
        },
        finances: {
          cashFlow: { view: false, add: false, edit: false, remove: false },
          accountsPayable: {
            view: false,
            add: false,
            edit: false,
            remove: false,
          },
          accountsReceivable: {
            view: false,
            add: false,
            edit: false,
            remove: false,
          },
          bankAccounts: { view: false, add: false, edit: false, remove: false },
        },
      };

      await expect(
        service.updateUserPermissions(testUser.id, testUser.id, updateDto),
      ).rejects.toThrow('Only main users can update permissions');
    });
  });
});
