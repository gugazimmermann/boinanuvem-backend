import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { CompaniesService } from './companies.service';
import { PrismaService } from '../common/services/prisma.service';
import { AuthService } from '../auth/auth.service';
import { EmailService } from '../email/email.service';
import { TrialService } from '../common/services/trial.service';
import { RegisterCompanyDto, UpdateCompanyDto } from './dto';

// Skip integration tests if database is not available
const describeOrSkip = process.env.SKIP_INTEGRATION_TESTS
  ? describe.skip
  : describe;

describeOrSkip('CompaniesService Integration Tests', () => {
  let service: CompaniesService;
  let prisma: PrismaClient;
  let testPlan: any;

  beforeAll(async () => {
    // Use test database URL or in-memory database for testing
    const testDatabaseUrl =
      process.env.TEST_DATABASE_URL ??
      process.env.DATABASE_URL ??
      'postgresql://postgres:postgres@localhost:5432/boinanuvem_test';

    prisma = new PrismaClient({
      datasources: {
        db: {
          url: testDatabaseUrl,
        },
      },
    });

    // Ensure database connection
    await prisma.$connect();

    // Find or create test plan
    testPlan = await prisma.plan.findUnique({
      where: { name: 'Avançado' },
    });

    if (!testPlan) {
      testPlan = await prisma.plan.create({
        data: {
          name: 'Avançado',
          description: 'Advanced plan for testing',
          monthlyPrice: 'R$ 149,90',
          annualPrice: 'R$ 1.439,00',
          limits: {
            properties: 'Ilimitadas',
            locations: 'Ilimitadas',
            animals: 'Ilimitados',
            members: 'Ilimitados',
          },
          features: ['All Features'],
          popular: false,
          status: 'active',
        },
      });
    }
  });

  beforeEach(async () => {
    const mockAuthService = {
      generateEmailVerificationToken: jest.fn().mockResolvedValue('test-token'),
      hashPassword: jest.fn().mockResolvedValue('hashed-password'),
    };

    const mockEmailService = {
      sendEmailVerification: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CompaniesService,
        {
          provide: PrismaService,
          useValue: prisma,
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

    service = module.get<CompaniesService>(CompaniesService);

    // Clean up existing test data
    await prisma.user.deleteMany({
      where: {
        OR: [
          { email: { contains: 'test-company' } },
          { email: { contains: 'testcompany' } },
        ],
      },
    });
    await prisma.companySubscription.deleteMany({
      where: {
        company: {
          OR: [
            { companyName: { contains: 'Test Company' } },
            { email: { contains: 'test-company' } },
          ],
        },
      },
    });
    await prisma.company.deleteMany({
      where: {
        OR: [
          { companyName: { contains: 'Test Company' } },
          { email: { contains: 'test-company' } },
          { cnpj: { startsWith: '11.222' } },
        ],
      },
    });
  });

  afterEach(async () => {
    // Clean up test data after each test
    await prisma.user.deleteMany({
      where: {
        OR: [
          { email: { contains: 'test-company' } },
          { email: { contains: 'testcompany' } },
        ],
      },
    });
    await prisma.companySubscription.deleteMany({
      where: {
        company: {
          OR: [
            { companyName: { contains: 'Test Company' } },
            { email: { contains: 'test-company' } },
          ],
        },
      },
    });
    await prisma.company.deleteMany({
      where: {
        OR: [
          { companyName: { contains: 'Test Company' } },
          { email: { contains: 'test-company' } },
          { cnpj: { startsWith: '11.222' } },
        ],
      },
    });
  });

  afterAll(async () => {
    await prisma.user.deleteMany({
      where: {
        OR: [
          { email: { contains: 'test-company' } },
          { email: { contains: 'testcompany' } },
        ],
      },
    });
    await prisma.companySubscription.deleteMany({
      where: {
        company: {
          OR: [
            { companyName: { contains: 'Test Company' } },
            { email: { contains: 'test-company' } },
          ],
        },
      },
    });
    await prisma.company.deleteMany({
      where: {
        OR: [
          { companyName: { contains: 'Test Company' } },
          { email: { contains: 'test-company' } },
          { cnpj: { startsWith: '11.222' } },
        ],
      },
    });
    // Don't delete the plan if it was pre-existing (not created by us)
    // Only delete if we created it in this test
    // For now, we'll skip deletion to avoid foreign key issues

    if (prisma) {
      await prisma.$disconnect();
    }
  });

  describe('registerCompany with real database', () => {
    it('should register a company successfully', async () => {
      const registerDto: RegisterCompanyDto = {
        cnpj: '11.222.333/0001-55',
        companyName: 'Test Company Integration',
        email: 'test-company@integration.com',
        phone: '(47) 99999-9999',
        street: 'Test Street',
        number: '123',
        neighborhood: 'Test Neighborhood',
        city: 'Test City',
        state: 'SC',
        zipCode: '88303-030',
        userName: 'Test User',
        userEmail: 'test-user@integration.com',
        userPhone: '(47) 99999-8888',
        password: 'password123',
      };

      const result = await service.registerCompany(registerDto);

      expect(result).toHaveProperty('company');
      expect(result).toHaveProperty('mainUser');
      expect(result.company).toMatchObject({
        cnpj: '11.222.333/0001-55',
        companyName: 'Test Company Integration',
        email: 'test-company@integration.com',
      });

      // Verify company was created
      const company = await prisma.company.findUnique({
        where: { cnpj: '11.222.333/0001-55' },
      });
      expect(company).toBeDefined();
      expect(company?.trialStatus).toBe('active');

      // Verify user was created
      const user = await prisma.user.findUnique({
        where: { email: 'test-user@integration.com' },
      });
      expect(user).toBeDefined();
      expect(user?.mainUser).toBe(true);
      expect(user?.companyId).toBe(company?.id);

      // Verify subscription was created
      const subscription = await prisma.companySubscription.findFirst({
        where: { companyId: company?.id },
      });
      expect(subscription).toBeDefined();
      expect(subscription?.isTrial).toBe(true);
    });

    it('should fail with duplicate CNPJ', async () => {
      const registerDto1: RegisterCompanyDto = {
        cnpj: '11.222.333/0001-55',
        companyName: 'Test Company 1',
        email: 'test-company1@integration.com',
        phone: '(47) 99999-9999',
        street: 'Test Street',
        number: '123',
        neighborhood: 'Test Neighborhood',
        city: 'Test City',
        state: 'SC',
        zipCode: '88303-030',
        userName: 'Test User 1',
        userEmail: 'test-user1@integration.com',
        userPhone: '(47) 99999-8888',
        password: 'password123',
      };

      await service.registerCompany(registerDto1);

      const registerDto2: RegisterCompanyDto = {
        ...registerDto1,
        companyName: 'Test Company 2',
        email: 'test-company2@integration.com',
        userEmail: 'test-user2@integration.com',
      };

      await expect(service.registerCompany(registerDto2)).rejects.toThrow(
        'Company with this CNPJ already exists',
      );
    });

    it('should fail with duplicate company email', async () => {
      const registerDto1: RegisterCompanyDto = {
        cnpj: '11.222.333/0001-55',
        companyName: 'Test Company 1',
        email: 'test-company@integration.com',
        phone: '(47) 99999-9999',
        street: 'Test Street',
        number: '123',
        neighborhood: 'Test Neighborhood',
        city: 'Test City',
        state: 'SC',
        zipCode: '88303-030',
        userName: 'Test User 1',
        userEmail: 'test-user1@integration.com',
        userPhone: '(47) 99999-8888',
        password: 'password123',
      };

      await service.registerCompany(registerDto1);

      const registerDto2: RegisterCompanyDto = {
        ...registerDto1,
        cnpj: '22.333.444/0001-66',
        userEmail: 'test-user2@integration.com',
      };

      await expect(service.registerCompany(registerDto2)).rejects.toThrow(
        'Company with this email already exists',
      );
    });

    it('should fail with duplicate user email', async () => {
      const registerDto1: RegisterCompanyDto = {
        cnpj: '11.222.333/0001-55',
        companyName: 'Test Company 1',
        email: 'test-company1@integration.com',
        phone: '(47) 99999-9999',
        street: 'Test Street',
        number: '123',
        neighborhood: 'Test Neighborhood',
        city: 'Test City',
        state: 'SC',
        zipCode: '88303-030',
        userName: 'Test User 1',
        userEmail: 'test-user@integration.com',
        userPhone: '(47) 99999-8888',
        password: 'password123',
      };

      await service.registerCompany(registerDto1);

      const registerDto2: RegisterCompanyDto = {
        ...registerDto1,
        cnpj: '22.333.444/0001-66',
        companyName: 'Test Company 2',
        email: 'test-company2@integration.com',
      };

      await expect(service.registerCompany(registerDto2)).rejects.toThrow(
        'User with this email already exists',
      );
    });
  });

  describe('updateCompany with real database', () => {
    let testCompany: any;
    let testUser: any;

    beforeEach(async () => {
      testCompany = await prisma.company.create({
        data: {
          cnpj: '11.222.333/0001-55',
          companyName: 'Test Company Update',
          email: 'test-company-update@integration.com',
          phone: '(47) 99999-9999',
          street: 'Test Street',
          number: '123',
          neighborhood: 'Test Neighborhood',
          city: 'Test City',
          state: 'SC',
          zipCode: '88303-030',
          trialStartDate: new Date(),
          trialEndDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
          trialStatus: 'active',
        },
      });

      const hashedPassword = await require('bcrypt').hash('password123', 10);
      testUser = await prisma.user.create({
        data: {
          name: 'Test User',
          email: 'test-user-update@integration.com',
          phone: '(47) 99999-8888',
          password: hashedPassword,
          companyId: testCompany.id,
          mainUser: true,
          status: 'active',
          emailVerifiedAt: new Date(),
          permissions: {},
        },
      });
    });

    it('should update company successfully', async () => {
      const updateDto: UpdateCompanyDto = {
        companyName: 'Updated Company Name',
        phone: '(47) 88888-8888',
      };

      const result = await service.updateCompany(
        testCompany.id,
        updateDto,
        testUser.id,
      );

      expect(result).toMatchObject({
        companyName: 'Updated Company Name',
        phone: '(47) 88888-8888',
      });

      // Verify in database
      const company = await prisma.company.findUnique({
        where: { id: testCompany.id },
      });
      expect(company?.companyName).toBe('Updated Company Name');
      expect(company?.phone).toBe('(47) 88888-8888');
    });

    it('should fail if user does not belong to company', async () => {
      // Create another company and user
      const otherCompany = await prisma.company.create({
        data: {
          cnpj: '22.333.444/0001-66',
          companyName: 'Other Company',
          email: 'other@integration.com',
          phone: '(47) 99999-7777',
          street: 'Other Street',
          number: '456',
          neighborhood: 'Other Neighborhood',
          city: 'Other City',
          state: 'SC',
          zipCode: '88303-030',
          trialStartDate: new Date(),
          trialEndDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
          trialStatus: 'active',
        },
      });

      const hashedPassword = await require('bcrypt').hash('password123', 10);
      const otherUser = await prisma.user.create({
        data: {
          name: 'Other User',
          email: 'other-user@integration.com',
          phone: '(47) 99999-6666',
          password: hashedPassword,
          companyId: otherCompany.id,
          mainUser: true,
          status: 'active',
          emailVerifiedAt: new Date(),
          permissions: {},
        },
      });

      const updateDto: UpdateCompanyDto = {
        companyName: 'Hacked Name',
      };

      await expect(
        service.updateCompany(otherUser.id, updateDto),
      ).rejects.toThrow();

      // Cleanup
      await prisma.user.deleteMany({
        where: { companyId: otherCompany.id },
      });
      await prisma.company.deleteMany({
        where: { id: otherCompany.id },
      });
    });
  });
});
