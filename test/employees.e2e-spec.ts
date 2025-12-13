import request from 'supertest';
import {
  setupE2ETest,
  teardownE2ETest,
  authenticatedRequest,
  E2ETestContext,
} from './e2e-test-helpers';
import { createTestCompany } from './test-utils';

describe('Employees Management Flow (e2e)', () => {
  let context: E2ETestContext;

  beforeAll(async () => {
    context = await setupE2ETest({
      companyName: 'Employees Test Company',
      email: 'employees@testcompany.com',
      cnpj: '11.222.333/0001-55',
      planName: 'Avançado',
      isTrial: true,
      createProperty: true,
    });

    // Create a test property
    // Property is already created by setupE2ETest with createProperty: true

    // Create a regular user with limited permissions
    const hashedPassword = await require('bcrypt').hash('password123', 10);
    const regularUser = await context.prisma.user.create({
      data: {
        name: 'Regular User',
        email: 'regular@testcompany.com',
        phone: '(47) 88888-8888',
        password: hashedPassword,
        companyId: context.testCompany.id,
        mainUser: false,
        status: 'active',
        emailVerifiedAt: new Date(),
        permissions: {
          registration: {
            employee: { view: true, add: false, edit: false, remove: false },
          },
        },
      },
    });

    const regularLoginResponse = await request(context.app.getHttpServer())
      .post('/auth/login')
      .send({
        email: regularUser.email,
        password: 'password123',
      })
      .expect(200);

    context.authToken = regularLoginResponse.body.access_token;
  });

  afterAll(async () => {
    await teardownE2ETest(context);
  });

  describe('POST /employees', () => {
    const createEmployeeDto = {
      code: '001',
      name: 'João Silva',
      status: 'active',
      propertyIds: [], // Will be set in each test
    };

    it('should create an employee successfully (main user)', async () => {
      const dto = {
        ...createEmployeeDto,
        propertyIds: [context.testProperty.id],
      };
      const response = await authenticatedRequest(
        context.app,
        context.mainUserToken,
      )
        .post('/employees')
        .send(dto)
        .expect(201);

      expect(response.body).toMatchObject({
        code: dto.code,
        name: dto.name,
        status: dto.status,
        companyId: context.testCompany.id,
      });
      expect(response.body.id).toBeDefined();
      expect(response.body.createdAt).toBeDefined();
    });

    it('should create an employee with optional fields', async () => {
      const dto = {
        ...createEmployeeDto,
        code: '002',
        cpf: '123.456.789-00',
        email: 'joao.silva@example.com',
        phone: '(47) 99999-9999',
        street: 'Rua das Flores',
        number: '123',
        complement: 'Apto 101',
        neighborhood: 'Centro',
        city: 'São Paulo',
        state: 'SP',
        zipCode: '01310-100',
        propertyIds: [context.testProperty.id],
      };

      const response = await authenticatedRequest(
        context.app,
        context.mainUserToken,
      )
        .post('/employees')
        .send(dto)
        .expect(201);

      expect(response.body).toMatchObject({
        code: dto.code,
        name: dto.name,
        email: dto.email,
        phone: dto.phone,
      });
    });

    it('should fail without add permission', async () => {
      const dto = {
        ...createEmployeeDto,
        propertyIds: [context.testProperty.id],
      };
      await request(context.app.getHttpServer())
        .post('/employees')
        .set('Authorization', `Bearer ${context.authToken}`)
        .send(dto)
        .expect(403);
    });

    it('should fail with duplicate code for same company', async () => {
      // Clean up any existing employee with this code first
      await context.prisma.employee.deleteMany({
        where: {
          companyId: context.testCompany.id,
          code: '001',
        },
      });

      const dto = {
        ...createEmployeeDto,
        propertyIds: [context.testProperty.id],
      };

      // Create first employee
      await request(context.app.getHttpServer())
        .post('/employees')
        .set('Authorization', `Bearer ${context.mainUserToken}`)
        .send(dto)
        .expect(201);

      // Try to create duplicate
      await request(context.app.getHttpServer())
        .post('/employees')
        .set('Authorization', `Bearer ${context.mainUserToken}`)
        .send(dto)
        .expect(409);
    });

    it('should allow same code for different companies', async () => {
      // Clean up any existing company with this CNPJ first
      await context.prisma.company.deleteMany({
        where: { cnpj: '22.333.444/0001-66' },
      });

      // Create another company
      const otherTestData = await createTestCompany(context.prisma, {
        companyName: 'Other Test Company',
        email: 'other@testcompany.com',
        cnpj: '22.333.444/0001-66',
        planName: 'Avançado',
        isTrial: true,
      });

      const otherProperty = await context.prisma.property.create({
        data: {
          code: '001',
          name: 'Other Company Property',
          area: { value: 100, type: 'hectares' },
          status: 'active',
          companyId: otherTestData.company.id,
          street: 'Other Street',
          number: '123',
          neighborhood: 'Other Neighborhood',
          city: 'Other City',
          state: 'SC',
          zipCode: '88395-000',
        },
      });

      // Clean up any existing employees with this code first
      await context.prisma.employee.deleteMany({
        where: {
          OR: [
            { companyId: context.testCompany.id, code: 'CROSS-001' },
            { companyId: otherTestData.company.id, code: 'CROSS-001' },
          ],
        },
      });

      const dto1 = {
        ...createEmployeeDto,
        code: 'CROSS-001',
        propertyIds: [context.testProperty.id],
      };
      const dto2 = {
        ...createEmployeeDto,
        code: 'CROSS-001',
        propertyIds: [otherProperty.id],
      };

      // Create employee in first company
      await request(context.app.getHttpServer())
        .post('/employees')
        .set('Authorization', `Bearer ${context.mainUserToken}`)
        .send(dto1)
        .expect(201);

      // Login as other company user
      await context.prisma.user.update({
        where: { id: otherTestData.user.id },
        data: {
          status: 'active',
          emailVerifiedAt: new Date(),
        },
      });

      const otherLoginResponse = await request(context.app.getHttpServer())
        .post('/auth/login')
        .send({
          email: otherTestData.user.email,
          password: 'password123',
        })
        .expect(200);

      const otherToken = otherLoginResponse.body.access_token;

      // Create employee with same code in second company (should succeed)
      await request(context.app.getHttpServer())
        .post('/employees')
        .set('Authorization', `Bearer ${otherToken}`)
        .send(dto2)
        .expect(201);
    });

    it('should validate required fields', async () => {
      await request(context.app.getHttpServer())
        .post('/employees')
        .set('Authorization', `Bearer ${context.mainUserToken}`)
        .send({ code: '003' }) // Missing required fields
        .expect(400);
    });

    it('should validate propertyIds requirement', async () => {
      await request(context.app.getHttpServer())
        .post('/employees')
        .set('Authorization', `Bearer ${context.mainUserToken}`)
        .send({
          ...createEmployeeDto,
          code: '004',
          propertyIds: [], // Empty array
        })
        .expect(400);
    });

    it('should validate status enum', async () => {
      await request(context.app.getHttpServer())
        .post('/employees')
        .set('Authorization', `Bearer ${context.mainUserToken}`)
        .send({
          ...createEmployeeDto,
          code: '005',
          properties: {
            create: [{ propertyId: context.testProperty.id }],
          },
          status: 'invalid_status',
        })
        .expect(400);
    });
  });

  describe('GET /employees', () => {
    beforeEach(async () => {
      // Clean up all employees for this company to ensure clean state
      await context.prisma.employee.deleteMany({
        where: {
          companyId: context.testCompany.id,
        },
      });

      // Create test employees
      await context.prisma.employee.create({
        data: {
          code: 'GET-001',
          name: 'Employee 1',
          status: 'active',
          companyId: context.testCompany.id,
          properties: {
            create: [{ propertyId: context.testProperty.id }],
          },
        },
      });

      await context.prisma.employee.create({
        data: {
          code: 'GET-002',
          name: 'Employee 2',
          status: 'active',
          companyId: context.testCompany.id,
          properties: {
            create: [{ propertyId: context.testProperty.id }],
          },
        },
      });

      await context.prisma.employee.create({
        data: {
          code: 'GET-003',
          name: 'Deleted Employee',
          status: 'active',
          companyId: context.testCompany.id,
          deletedAt: new Date(), // Soft deleted
          properties: {
            create: [{ propertyId: context.testProperty.id }],
          },
        },
      });
    });

    it('should return all employees for company', async () => {
      const response = await authenticatedRequest(
        context.app,
        context.mainUserToken,
      )
        .get('/employees')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(2); // Excludes soft-deleted
      expect(response.body[0]).toHaveProperty('id');
      expect(response.body[0]).toHaveProperty('code');
      expect(response.body[0]).toHaveProperty('name');
    });

    it('should exclude soft-deleted employees', async () => {
      const response = await authenticatedRequest(
        context.app,
        context.mainUserToken,
      )
        .get('/employees')
        .expect(200);

      const codes = response.body.map((e: any) => e.code);
      expect(codes).not.toContain('GET-003');
    });

    it('should fail without view permission', async () => {
      // Update regular user to have no view permission
      await context.prisma.user.update({
        where: { email: 'regular@testcompany.com' },
        data: {
          permissions: {
            registration: {
              employee: { view: false, add: false, edit: false, remove: false },
            },
          },
        },
      });

      const newToken = await request(context.app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'regular@testcompany.com',
          password: 'password123',
        })
        .then((res) => res.body.access_token);

      await request(context.app.getHttpServer())
        .get('/employees')
        .set('Authorization', `Bearer ${newToken}`)
        .expect(403);
    });
  });

  describe('GET /employees/:id', () => {
    let employeeId: string;

    beforeEach(async () => {
      // Clean up any existing employee with this code first
      await context.prisma.employee.deleteMany({
        where: {
          companyId: context.testCompany.id,
          code: 'GET-ID-001',
        },
      });

      const employee = await context.prisma.employee.create({
        data: {
          code: 'GET-ID-001',
          name: 'Test Employee',
          status: 'active',
          companyId: context.testCompany.id,
          properties: {
            create: [{ propertyId: context.testProperty.id }],
          },
        },
      });
      employeeId = employee.id;
    });

    it('should return an employee by id', async () => {
      const response = await request(context.app.getHttpServer())
        .get(`/employees/${employeeId}`)
        .set('Authorization', `Bearer ${context.mainUserToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        id: employeeId,
        code: 'GET-ID-001',
        name: 'Test Employee',
      });
    });

    it('should return 404 for non-existent employee', async () => {
      await request(context.app.getHttpServer())
        .get('/employees/non-existent-id')
        .set('Authorization', `Bearer ${context.mainUserToken}`)
        .expect(404);
    });

    it('should return 404 for soft-deleted employee', async () => {
      // Soft delete the employee
      await context.prisma.employee.update({
        where: { id: employeeId },
        data: { deletedAt: new Date() },
      });

      await request(context.app.getHttpServer())
        .get(`/employees/${employeeId}`)
        .set('Authorization', `Bearer ${context.mainUserToken}`)
        .expect(404);
    });
  });

  describe('PUT /employees/:id', () => {
    let employeeId: string;

    beforeEach(async () => {
      // Clean up any existing employees with these codes first
      await context.prisma.employee.deleteMany({
        where: {
          companyId: context.testCompany.id,
          code: { in: ['PUT-001', 'PUT-002'] },
        },
      });

      const employee = await context.prisma.employee.create({
        data: {
          code: 'PUT-001',
          name: 'Test Employee',
          status: 'active',
          companyId: context.testCompany.id,
          properties: {
            create: [{ propertyId: context.testProperty.id }],
          },
        },
      });
      employeeId = employee.id;
    });

    it('should update an employee', async () => {
      const updateDto = {
        name: 'Updated Employee Name',
        status: 'inactive',
      };

      const response = await request(context.app.getHttpServer())
        .put(`/employees/${employeeId}`)
        .set('Authorization', `Bearer ${context.mainUserToken}`)
        .send(updateDto)
        .expect(200);

      expect(response.body).toMatchObject({
        id: employeeId,
        name: 'Updated Employee Name',
        status: 'inactive',
      });
    });

    it('should fail without edit permission', async () => {
      await request(context.app.getHttpServer())
        .put(`/employees/${employeeId}`)
        .set('Authorization', `Bearer ${context.authToken}`)
        .send({ name: 'Updated Name' })
        .expect(403);
    });

    it('should fail with duplicate code', async () => {
      // Create another employee
      await context.prisma.employee.create({
        data: {
          code: 'PUT-002',
          name: 'Other Employee',
          status: 'active',
          companyId: context.testCompany.id,
          properties: {
            create: [{ propertyId: context.testProperty.id }],
          },
        },
      });

      // Try to update with duplicate code
      await request(context.app.getHttpServer())
        .put(`/employees/${employeeId}`)
        .set('Authorization', `Bearer ${context.mainUserToken}`)
        .send({ code: 'PUT-002' })
        .expect(409);
    });
  });

  describe('DELETE /employees/:id', () => {
    let employeeId: string;

    beforeEach(async () => {
      // Clean up any existing employee with this code first
      await context.prisma.employee.deleteMany({
        where: {
          companyId: context.testCompany.id,
          code: 'DELETE-001',
        },
      });

      const employee = await context.prisma.employee.create({
        data: {
          code: 'DELETE-001',
          name: 'Test Employee',
          status: 'active',
          companyId: context.testCompany.id,
          properties: {
            create: [{ propertyId: context.testProperty.id }],
          },
        },
      });
      employeeId = employee.id;
    });

    it('should soft delete an employee', async () => {
      const response = await request(context.app.getHttpServer())
        .delete(`/employees/${employeeId}`)
        .set('Authorization', `Bearer ${context.mainUserToken}`)
        .expect(200);

      expect(response.body).toEqual({
        message: 'Employee deleted successfully',
      });

      // Verify soft delete
      const deletedEmployee = await context.prisma.employee.findUnique({
        where: { id: employeeId },
      });
      expect(deletedEmployee?.deletedAt).toBeDefined();

      // Verify it's excluded from list
      const listResponse = await request(context.app.getHttpServer())
        .get('/employees')
        .set('Authorization', `Bearer ${context.mainUserToken}`)
        .expect(200);

      expect(
        listResponse.body.find((e: any) => e.id === employeeId),
      ).toBeUndefined();
    });

    it('should fail without remove permission', async () => {
      await request(context.app.getHttpServer())
        .delete(`/employees/${employeeId}`)
        .set('Authorization', `Bearer ${context.authToken}`)
        .expect(403);
    });

    it('should return 404 for non-existent employee', async () => {
      await request(context.app.getHttpServer())
        .delete('/employees/non-existent-id')
        .set('Authorization', `Bearer ${context.mainUserToken}`)
        .expect(404);
    });
  });

  describe('Company Isolation', () => {
    let otherUser: any;
    let otherToken: string;
    let employeeId: string;

    beforeEach(async () => {
      // Clean up any existing company with this CNPJ first
      await context.prisma.company.deleteMany({
        where: { cnpj: '22.333.444/0001-66' },
      });

      // Create another company
      const otherTestData = await createTestCompany(context.prisma, {
        companyName: 'Other Test Company',
        email: 'other@testcompany.com',
        cnpj: '22.333.444/0001-66',
        planName: 'Avançado',
        isTrial: true,
      });

      otherUser = otherTestData.user;

      await context.prisma.user.update({
        where: { id: otherUser.id },
        data: {
          status: 'active',
          emailVerifiedAt: new Date(),
        },
      });

      const loginResponse = await request(context.app.getHttpServer())
        .post('/auth/login')
        .send({
          email: otherUser.email,
          password: 'password123',
        })
        .expect(200);

      otherToken = loginResponse.body.access_token;

      // Clean up any existing employee with this code first
      await context.prisma.employee.deleteMany({
        where: {
          companyId: context.testCompany.id,
          code: 'ISOLATE-001',
        },
      });

      // Create employee for first company
      const employee = await context.prisma.employee.create({
        data: {
          code: 'ISOLATE-001',
          name: 'First Company Employee',
          status: 'active',
          companyId: context.testCompany.id,
          properties: {
            create: [{ propertyId: context.testProperty.id }],
          },
        },
      });
      employeeId = employee.id;
    });

    it('should not allow access to other company employees', async () => {
      await request(context.app.getHttpServer())
        .get(`/employees/${employeeId}`)
        .set('Authorization', `Bearer ${otherToken}`)
        .expect(404);
    });

    it('should not allow update of other company employees', async () => {
      await request(context.app.getHttpServer())
        .put(`/employees/${employeeId}`)
        .set('Authorization', `Bearer ${otherToken}`)
        .send({ name: 'Hacked Name' })
        .expect(404);
    });

    it('should not allow delete of other company employees', async () => {
      await request(context.app.getHttpServer())
        .delete(`/employees/${employeeId}`)
        .set('Authorization', `Bearer ${otherToken}`)
        .expect(404);
    });
  });
});
