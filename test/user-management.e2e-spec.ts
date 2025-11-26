import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/common/services/prisma.service';
import { EmailService } from '../src/email/email.service';
import { createTestCompany, cleanupTestData } from './test-utils';

describe('User Management Flow (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let testCompany: any;
  let testUser: any;
  let authToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(EmailService)
      .useValue({
        sendEmailVerification: jest.fn().mockResolvedValue(undefined),
        sendPasswordReset: jest.fn().mockResolvedValue(undefined),
        sendWelcomeEmail: jest.fn().mockResolvedValue(undefined),
        sendTeamMemberInvitation: jest.fn().mockResolvedValue(undefined),
        sendEmail: jest.fn().mockResolvedValue(undefined),
      })
      .compile();

    app = moduleFixture.createNestApplication();
    prisma = moduleFixture.get<PrismaService>(PrismaService);

    // Add validation pipe for E2E tests
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    await app.init();
  });

  beforeEach(async () => {
    await cleanupTestData(prisma);

    // Create test company with main user
    const testData = await createTestCompany(prisma, {
      companyName: 'User Management Test Company',
      email: 'usermgmt@testcompany.com',
      cnpj: '11.222.333/0001-44',
      planName: 'Avançado',
      isTrial: true,
    });

    testCompany = testData.company;
    testUser = testData.user;

    // Activate the user for testing
    await prisma.user.update({
      where: { id: testUser.id },
      data: {
        status: 'active',
        emailVerifiedAt: new Date(),
      },
    });

    // Login to get auth token
    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: testUser.email,
        password: 'password123',
      })
      .expect(200);

    authToken = loginResponse.body.access_token;
  });

  afterAll(async () => {
    await cleanupTestData(prisma);
    await app.close();
  });

  describe('User Profile Management', () => {
    it('should get current user profile', async () => {
      const response = await request(app.getHttpServer())
        .get('/users/me')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        id: testUser.id,
        email: testUser.email,
        name: testUser.name,
        companyId: testCompany.id,
        mainUser: true,
        status: 'active',
      });
    });

    it('should update current user profile', async () => {
      const updateData = {
        name: 'Updated User Name',
        phone: '(11) 98765-4321',
      };

      const response = await request(app.getHttpServer())
        .put('/users/me')
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body).toMatchObject({
        id: testUser.id,
        name: updateData.name,
        phone: updateData.phone,
      });

      // Verify in database
      const updatedUser = await prisma.user.findUnique({
        where: { id: testUser.id },
      });
      expect(updatedUser.name).toBe(updateData.name);
      expect(updatedUser.phone).toBe(updateData.phone);
    });

    it('should handle email conflict during profile update', async () => {
      // Create another user with existing email
      await prisma.user.create({
        data: {
          email: 'existing@test.com',
          name: 'Existing User',
          phone: '(11) 99999-9999',
          cpf: '999.888.777-66',
          password: 'hashedpassword',
          companyId: testCompany.id,
          mainUser: false,
          status: 'active',
        },
      });

      await request(app.getHttpServer())
        .put('/users/me')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ email: 'existing@test.com' })
        .expect(409);
    });
  });

  describe('Team Member Management', () => {
    it('should create team member successfully', async () => {
      const teamMemberData = {
        email: 'teammember@test.com',
        name: 'Team Member',
        phone: '(11) 88888-8888',
        cpf: '123.456.789-00',
        password: 'password123',
      };

      const response = await request(app.getHttpServer())
        .post('/users')
        .set('Authorization', `Bearer ${authToken}`)
        .send(teamMemberData)
        .expect(201);

      expect(response.body).toMatchObject({
        email: teamMemberData.email,
        name: teamMemberData.name,
        mainUser: false,
        status: 'pending',
      });

      // Verify the user was created in the database with all fields
      const createdTeamMember = await prisma.user.findUnique({
        where: { email: teamMemberData.email },
      });
      expect(createdTeamMember).toMatchObject({
        email: teamMemberData.email,
        name: teamMemberData.name,
        phone: teamMemberData.phone,
        cpf: teamMemberData.cpf,
        companyId: testCompany.id,
        mainUser: false,
        status: 'pending',
      });

      // Verify in database
      const createdUser = await prisma.user.findUnique({
        where: { email: teamMemberData.email },
      });
      expect(createdUser).toBeTruthy();
      expect(createdUser.mainUser).toBe(false);
    });

    it('should get team members list', async () => {
      // Create a team member first
      const teamMember = await prisma.user.create({
        data: {
          email: 'team1@test.com',
          name: 'Team Member 1',
          phone: '(11) 77777-7777',
          cpf: '987.654.321-00',
          password: 'hashedpassword',
          companyId: testCompany.id,
          mainUser: false,
          status: 'active',
          permissions: {
            registration: {
              animals: { view: true, add: false, edit: false, remove: false },
            },
          },
        },
      });

      const response = await request(app.getHttpServer())
        .get('/users')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveLength(2); // Main user + team member

      // Find the team member (not the main user)
      const teamMemberInResponse = response.body.find((user) => !user.mainUser);
      expect(teamMemberInResponse).toMatchObject({
        id: teamMember.id,
        email: teamMember.email,
        name: teamMember.name,
        mainUser: false,
      });
    });

    it('should update team member', async () => {
      // Create a team member first
      const teamMember = await prisma.user.create({
        data: {
          email: 'team2@test.com',
          name: 'Team Member 2',
          phone: '(11) 66666-6666',
          cpf: '111.222.333-44',
          password: 'hashedpassword',
          companyId: testCompany.id,
          mainUser: false,
          status: 'active',
        },
      });

      const updateData = {
        name: 'Updated Team Member',
        phone: '(11) 55555-5555',
      };

      const response = await request(app.getHttpServer())
        .put(`/users/${teamMember.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body).toMatchObject({
        id: teamMember.id,
        name: updateData.name,
        phone: updateData.phone,
      });
    });

    it('should update team member permissions', async () => {
      // Create a team member first
      const teamMember = await prisma.user.create({
        data: {
          email: 'team3@test.com',
          name: 'Team Member 3',
          phone: '(11) 44444-4444',
          cpf: '555.666.777-88',
          password: 'hashedpassword',
          companyId: testCompany.id,
          mainUser: false,
          status: 'active',
          permissions: null,
        },
      });

      const permissionsData = {
        registration: {
          property: { view: true, add: false, edit: false, remove: false },
          location: { view: true, add: false, edit: false, remove: false },
          employee: { view: true, add: false, edit: false, remove: false },
          serviceProvider: {
            view: true,
            add: false,
            edit: false,
            remove: false,
          },
          supplier: { view: true, add: false, edit: false, remove: false },
          buyer: { view: true, add: false, edit: false, remove: false },
          inventory: { view: true, add: false, edit: false, remove: false },
          animals: { view: true, add: true, edit: true, remove: true },
        },
        records: {
          births: { view: true, add: false, edit: false, remove: false },
          acquisitions: { view: true, add: false, edit: false, remove: false },
          weighings: { view: true, add: false, edit: false, remove: false },
          sales: { view: true, add: false, edit: false, remove: false },
          deaths: { view: true, add: false, edit: false, remove: false },
          sanitaryControls: {
            view: true,
            add: false,
            edit: false,
            remove: false,
          },
          locationMovements: {
            view: true,
            add: false,
            edit: false,
            remove: false,
          },
          animalMovements: {
            view: true,
            add: false,
            edit: false,
            remove: false,
          },
        },
        breedings: {
          breedings: { view: true, add: false, edit: false, remove: false },
          unconfirmedBreedings: {
            view: true,
            add: false,
            edit: false,
            remove: false,
          },
          pregnantCows: { view: true, add: false, edit: false, remove: false },
          birthForecast: { view: true, add: false, edit: false, remove: false },
          reproductiveIndexes: {
            view: true,
            add: false,
            edit: false,
            remove: false,
          },
        },
        finances: {
          accountsReceivable: {
            view: true,
            add: false,
            edit: false,
            remove: false,
          },
          accountsPayable: {
            view: true,
            add: false,
            edit: false,
            remove: false,
          },
          cashFlow: { view: true, add: false, edit: false, remove: false },
          bankAccounts: { view: true, add: false, edit: false, remove: false },
        },
      };

      const response = await request(app.getHttpServer())
        .put(`/users/${teamMember.id}/permissions`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(permissionsData)
        .expect(200);

      expect(response.body.permissions).toEqual(permissionsData);
    });

    it('should deactivate team member', async () => {
      // Create a team member first
      const teamMember = await prisma.user.create({
        data: {
          email: 'team4@test.com',
          name: 'Team Member 4',
          phone: '(11) 33333-3333',
          cpf: '999.888.777-66',
          password: 'hashedpassword',
          companyId: testCompany.id,
          mainUser: false,
          status: 'active',
        },
      });

      const response = await request(app.getHttpServer())
        .delete(`/users/${teamMember.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.message).toBe('User deactivated successfully');

      // Verify in database
      const deactivatedUser = await prisma.user.findUnique({
        where: { id: teamMember.id },
      });
      expect(deactivatedUser.status).toBe('inactive');
    });

    it('should prevent team member from creating other team members', async () => {
      // Create a team member
      const teamMember = await prisma.user.create({
        data: {
          email: 'team5@test.com',
          name: 'Team Member 5',
          phone: '(11) 22222-2222',
          cpf: '111.111.111-11',
          password: await require('bcrypt').hash('password123', 10),
          companyId: testCompany.id,
          mainUser: false,
          status: 'active',
        },
      });

      // Login as team member
      const teamLoginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: teamMember.email,
          password: 'password123',
        })
        .expect(200);

      const teamAuthToken = teamLoginResponse.body.access_token;

      // Try to create another team member (should fail)
      await request(app.getHttpServer())
        .post('/users')
        .set('Authorization', `Bearer ${teamAuthToken}`)
        .send({
          email: 'newteam@test.com',
          name: 'New Team Member',
          phone: '(11) 11111-1111',
          cpf: '222.222.222-22',
          password: 'password123',
        })
        .expect(403);
    });
  });

  describe('Authorization and Security', () => {
    it('should require authentication for protected routes', async () => {
      await request(app.getHttpServer()).get('/users/me').expect(401);

      await request(app.getHttpServer()).get('/users').expect(401);

      await request(app.getHttpServer())
        .post('/users')
        .send({
          email: 'test@test.com',
          name: 'Test User',
        })
        .expect(401);
    });

    it('should prevent access to other company users', async () => {
      // Create another company and user
      const otherCompanyData = await createTestCompany(prisma, {
        companyName: 'Other Company',
        email: 'other@company.com',
        cnpj: '99.888.777/0001-66',
        planName: 'Básico',
        isTrial: false,
      });

      const otherUser = await prisma.user.create({
        data: {
          email: 'otheruser@test.com',
          name: 'Other User',
          phone: '(11) 99999-9999',
          cpf: '333.333.333-33',
          password: 'hashedpassword',
          companyId: otherCompanyData.company.id,
          mainUser: false,
          status: 'active',
        },
      });

      // Try to update other company's user (should fail)
      await request(app.getHttpServer())
        .put(`/users/${otherUser.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Hacked Name' })
        .expect(403);
    });

    it('should handle invalid JWT tokens', async () => {
      await request(app.getHttpServer())
        .get('/users/me')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });

    it('should handle expired JWT tokens', async () => {
      // This would require mocking time or using a very short-lived token
      // For now, we'll test with a malformed token
      await request(app.getHttpServer())
        .get('/users/me')
        .set('Authorization', 'Bearer expired.jwt.token')
        .expect(401);
    });
  });

  describe('Data Validation', () => {
    it('should validate email format during user creation', async () => {
      await request(app.getHttpServer())
        .post('/users')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          email: 'invalid-email',
          name: 'Test User',
          phone: '(11) 99999-9999',
          cpf: '123.456.789-00',
          password: 'password123',
        })
        .expect(400);
    });

    it('should validate CPF format during user creation', async () => {
      await request(app.getHttpServer())
        .post('/users')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          email: 'test@test.com',
          name: 'Test User',
          phone: '(11) 99999-9999',
          cpf: 'invalid-cpf',
          password: 'password123',
        })
        .expect(400);
    });

    it('should accept any string as phone format', async () => {
      await request(app.getHttpServer())
        .post('/users')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          email: 'phonetest@test.com',
          name: 'Test User',
          phone: 'invalid-phone', // Phone validation is not strict in CreateUserDto
          cpf: '123.456.789-00',
          password: 'password123',
        })
        .expect(201);
    });

    it('should require strong password during user creation', async () => {
      await request(app.getHttpServer())
        .post('/users')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          email: 'test@test.com',
          name: 'Test User',
          phone: '(11) 99999-9999',
          cpf: '123.456.789-00',
          password: '123', // Too short
        })
        .expect(400);
    });
  });
});
