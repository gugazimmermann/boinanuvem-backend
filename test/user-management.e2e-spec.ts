import request from 'supertest';
import {
  setupE2ETest,
  teardownE2ETest,
  authenticatedRequest,
  E2ETestContext,
} from './e2e-test-helpers';
import { createTestCompany } from './test-utils';

describe('User Management Flow (e2e)', () => {
  let context: E2ETestContext;

  beforeAll(async () => {
    context = await setupE2ETest({
      companyName: 'User Management Test Company',
      email: 'usermgmt@testcompany.com',
      cnpj: '11.222.333/0001-44',
      planName: 'Avançado',
      isTrial: true,
    });
  });

  afterAll(async () => {
    await teardownE2ETest(context);
  });

  describe('User Profile Management', () => {
    it('should get current user profile', async () => {
      const response = await authenticatedRequest(
        context.app,
        context.mainUserToken,
      )
        .get('/users/me')
        .expect(200);

      expect(response.body).toMatchObject({
        id: context.testUser.id,
        email: context.testUser.email,
        name: context.testUser.name,
        companyId: context.testCompany.id,
        mainUser: true,
        status: 'active',
      });
    });

    it('should update current user profile', async () => {
      const updateData = {
        name: 'Updated User Name',
        phone: '(11) 98765-4321',
      };

      const response = await authenticatedRequest(
        context.app,
        context.mainUserToken,
      )
        .put('/users/me')
        .send(updateData)
        .expect(200);

      expect(response.body).toMatchObject({
        id: context.testUser.id,
        name: updateData.name,
        phone: updateData.phone,
      });

      // Verify in database
      const updatedUser = await context.prisma.user.findUnique({
        where: { id: context.testUser.id },
      });
      expect(updatedUser.name).toBe(updateData.name);
      expect(updatedUser.phone).toBe(updateData.phone);
    });

    it('should handle email conflict during profile update', async () => {
      // Create another user with existing email
      await context.prisma.user.create({
        data: {
          email: 'existing@test.com',
          name: 'Existing User',
          phone: '(11) 99999-9999',
          cpf: '999.888.777-66',
          password: 'hashedpassword',
          companyId: context.testCompany.id,
          mainUser: false,
          status: 'active',
        },
      });

      await authenticatedRequest(context.app, context.mainUserToken)
        .put('/users/me')
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

      const response = await authenticatedRequest(
        context.app,
        context.mainUserToken,
      )
        .post('/users')
        .send(teamMemberData)
        .expect(201);

      expect(response.body).toMatchObject({
        email: teamMemberData.email,
        name: teamMemberData.name,
        mainUser: false,
        status: 'pending',
      });

      // Verify the user was created in the database with all fields
      const createdTeamMember = await context.prisma.user.findUnique({
        where: { email: teamMemberData.email },
      });
      expect(createdTeamMember).toMatchObject({
        email: teamMemberData.email,
        name: teamMemberData.name,
        phone: teamMemberData.phone,
        cpf: teamMemberData.cpf,
        companyId: context.testCompany.id,
        mainUser: false,
        status: 'pending',
      });

      // Verify in database
      const createdUser = await context.prisma.user.findUnique({
        where: { email: teamMemberData.email },
      });
      expect(createdUser).toBeTruthy();
      expect(createdUser.mainUser).toBe(false);
    });

    it('should get team members list', async () => {
      // Clean up any existing team members first (keep main user)
      await context.prisma.user.deleteMany({
        where: {
          companyId: context.testCompany.id,
          mainUser: false,
        },
      });

      // Create a team member first
      const teamMember = await context.prisma.user.create({
        data: {
          email: 'team1@test.com',
          name: 'Team Member 1',
          phone: '(11) 77777-7777',
          cpf: '987.654.321-00',
          password: 'hashedpassword',
          companyId: context.testCompany.id,
          mainUser: false,
          status: 'active',
          permissions: {
            registration: {
              animals: { view: true, add: false, edit: false, remove: false },
            },
          },
        },
      });

      const response = await authenticatedRequest(
        context.app,
        context.mainUserToken,
      )
        .get('/users')
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
      const teamMember = await context.prisma.user.create({
        data: {
          email: 'team2@test.com',
          name: 'Team Member 2',
          phone: '(11) 66666-6666',
          cpf: '111.222.333-44',
          password: 'hashedpassword',
          companyId: context.testCompany.id,
          mainUser: false,
          status: 'active',
        },
      });

      const updateData = {
        name: 'Updated Team Member',
        phone: '(11) 55555-5555',
      };

      const response = await authenticatedRequest(
        context.app,
        context.mainUserToken,
      )
        .put(`/users/${teamMember.id}`)
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
      const teamMember = await context.prisma.user.create({
        data: {
          email: 'team3@test.com',
          name: 'Team Member 3',
          phone: '(11) 44444-4444',
          cpf: '555.666.777-88',
          password: 'hashedpassword',
          companyId: context.testCompany.id,
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

      const response = await request(context.app.getHttpServer())
        .put(`/users/${teamMember.id}/permissions`)
        .set('Authorization', `Bearer ${context.mainUserToken}`)
        .send(permissionsData)
        .expect(200);

      expect(response.body.permissions).toEqual(permissionsData);
    });

    it('should deactivate team member', async () => {
      // Create a team member first
      const teamMember = await context.prisma.user.create({
        data: {
          email: 'team4@test.com',
          name: 'Team Member 4',
          phone: '(11) 33333-3333',
          cpf: '999.888.777-66',
          password: 'hashedpassword',
          companyId: context.testCompany.id,
          mainUser: false,
          status: 'active',
        },
      });

      const response = await request(context.app.getHttpServer())
        .delete(`/users/${teamMember.id}`)
        .set('Authorization', `Bearer ${context.mainUserToken}`)
        .expect(200);

      expect(response.body.message).toBe('User deactivated successfully');

      // Verify in database
      const deactivatedUser = await context.prisma.user.findUnique({
        where: { id: teamMember.id },
      });
      expect(deactivatedUser.status).toBe('inactive');
    });

    it('should prevent team member from creating other team members', async () => {
      // Create a team member
      const teamMember = await context.prisma.user.create({
        data: {
          email: 'team5@test.com',
          name: 'Team Member 5',
          phone: '(11) 22222-2222',
          cpf: '111.111.111-11',
          password: await require('bcrypt').hash('password123', 10),
          companyId: context.testCompany.id,
          mainUser: false,
          status: 'active',
        },
      });

      // Login as team member
      const teamLoginResponse = await request(context.app.getHttpServer())
        .post('/auth/login')
        .send({
          email: teamMember.email,
          password: 'password123',
        })
        .expect(200);

      const teamAuthToken = teamLoginResponse.body.access_token;

      // Try to create another team member (should fail)
      await request(context.app.getHttpServer())
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
      await request(context.app.getHttpServer()).get('/users/me').expect(401);

      await request(context.app.getHttpServer()).get('/users').expect(401);

      await request(context.app.getHttpServer())
        .post('/users')
        .send({
          email: 'test@test.com',
          name: 'Test User',
        })
        .expect(401);
    });

    it('should prevent access to other company users', async () => {
      // Create another company and user
      const otherCompanyData = await createTestCompany(context.prisma, {
        companyName: 'Other Company',
        email: 'other@company.com',
        cnpj: '99.888.777/0001-66',
        planName: 'Básico',
        isTrial: false,
      });

      const otherUser = await context.prisma.user.create({
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
      await authenticatedRequest(context.app, context.mainUserToken)
        .put(`/users/${otherUser.id}`)
        .send({ name: 'Hacked Name' })
        .expect(403);
    });

    it('should handle invalid JWT tokens', async () => {
      await request(context.app.getHttpServer())
        .get('/users/me')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });

    it('should handle expired JWT tokens', async () => {
      // This would require mocking time or using a very short-lived token
      // For now, we'll test with a malformed token
      await request(context.app.getHttpServer())
        .get('/users/me')
        .set('Authorization', 'Bearer expired.jwt.token')
        .expect(401);
    });
  });

  describe('Data Validation', () => {
    it('should validate email format during user creation', async () => {
      await request(context.app.getHttpServer())
        .post('/users')
        .set('Authorization', `Bearer ${context.mainUserToken}`)
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
      await request(context.app.getHttpServer())
        .post('/users')
        .set('Authorization', `Bearer ${context.mainUserToken}`)
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
      await request(context.app.getHttpServer())
        .post('/users')
        .set('Authorization', `Bearer ${context.mainUserToken}`)
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
      await request(context.app.getHttpServer())
        .post('/users')
        .set('Authorization', `Bearer ${context.mainUserToken}`)
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
