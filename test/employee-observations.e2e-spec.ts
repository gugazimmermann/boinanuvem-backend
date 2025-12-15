import {
  setupE2ETest,
  teardownE2ETest,
  authenticatedRequest,
  E2ETestContext,
} from './e2e-test-helpers';

describe('Employee Observations Management Flow (e2e)', () => {
  let context: E2ETestContext;
  let testEmployee: any;

  beforeAll(async () => {
    context = await setupE2ETest({
      companyName: 'Employee Observations Test Company',
      email: 'employee-obs@testcompany.com',
      cnpj: '11.222.333/0001-17',
      planName: 'Avançado',
      isTrial: true,
      createEmployees: 1,
    });
    testEmployee = context.testEmployees?.[0];
  });

  afterAll(async () => {
    await teardownE2ETest(context);
  });

  describe('POST /employees/:employeeId/observations', () => {
    it('should create an observation successfully', async () => {
      const response = await authenticatedRequest(
        context.app,
        context.mainUserToken,
      )
        .post(`/employees/${testEmployee.id}/observations`)
        .send({ observation: 'Test observation' })
        .expect(201);

      expect(response.body.employeeId).toBe(testEmployee.id);
    });
  });

  describe('GET /employees/:employeeId/observations', () => {
    it('should return all observations', async () => {
      await context.prisma.employeeObservation.createMany({
        data: [
          {
            employeeId: testEmployee.id,
            observation: 'Obs 1',
            companyId: context.testCompany.id,
            createdBy: context.testUser.id,
          },
        ],
      });

      const response = await authenticatedRequest(
        context.app,
        context.mainUserToken,
      )
        .get(`/employees/${testEmployee.id}/observations`)
        .expect(200);

      expect(response.body.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('GET /employee-observations/:id', () => {
    it('should return observation by id', async () => {
      const obs = await context.prisma.employeeObservation.create({
        data: {
          employeeId: testEmployee.id,
          observation: 'Test',
          companyId: context.testCompany.id,
          createdBy: context.testUser.id,
        },
      });

      const response = await authenticatedRequest(
        context.app,
        context.mainUserToken,
      )
        .get(`/employee-observations/${obs.id}`)
        .expect(200);

      expect(response.body.id).toBe(obs.id);
    });
  });

  describe('PUT /employee-observations/:id', () => {
    it('should update observation', async () => {
      const obs = await context.prisma.employeeObservation.create({
        data: {
          employeeId: testEmployee.id,
          observation: 'Original',
          companyId: context.testCompany.id,
          createdBy: context.testUser.id,
        },
      });

      const response = await authenticatedRequest(
        context.app,
        context.mainUserToken,
      )
        .put(`/employee-observations/${obs.id}`)
        .send({ observation: 'Updated' })
        .expect(200);

      expect(response.body.observation).toBe('Updated');
    });
  });

  describe('DELETE /employee-observations/:id', () => {
    it('should delete observation', async () => {
      const obs = await context.prisma.employeeObservation.create({
        data: {
          employeeId: testEmployee.id,
          observation: 'To delete',
          companyId: context.testCompany.id,
          createdBy: context.testUser.id,
        },
      });

      await authenticatedRequest(context.app, context.mainUserToken)
        .delete(`/employee-observations/${obs.id}`)
        .expect(200);
    });
  });
});
