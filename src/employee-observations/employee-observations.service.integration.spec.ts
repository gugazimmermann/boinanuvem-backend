import { EmployeeObservationsService } from './employee-observations.service';
import { CreateEmployeeObservationDto } from './dto';
import {
  describeOrSkip,
  setupIntegrationTest,
  teardownIntegrationTest,
  createServiceTestingModule,
  getServiceFromModule,
  IntegrationTestContext,
} from '../../test/integration-test-helpers';

describeOrSkip('EmployeeObservationsService Integration Tests', () => {
  let service: EmployeeObservationsService;
  let context: IntegrationTestContext;
  let testEmployee: any;

  beforeAll(async () => {
    context = await setupIntegrationTest({
      cnpj: '11.222.333/0001-07',
      companyName: 'Test Employee Observations Company',
      email: 'employee-obs@testcompany.com',
      userEmail: 'user-employee-obs@testcompany.com',
      createEmployees: 1,
    });
    testEmployee = context.testEmployees?.[0];
  });

  afterAll(async () => {
    await teardownIntegrationTest(context, {
      tables: ['employeeObservation', 'employee'],
    });
  });

  beforeEach(async () => {
    const module = await createServiceTestingModule(
      EmployeeObservationsService,
      context.prisma,
    );
    service = getServiceFromModule(module, EmployeeObservationsService);
    await context.prisma.employeeObservation.deleteMany({
      where: { companyId: context.testCompany.id },
    });
  });

  afterEach(async () => {
    await context.prisma.employeeObservation.deleteMany({
      where: { companyId: context.testCompany.id },
    });
  });

  describe('create', () => {
    it('should create successfully', async () => {
      const createDto: CreateEmployeeObservationDto = {
        observation: 'Test observation',
      };

      const result = await service.create(
        context.testUser.id,
        testEmployee.id,
        createDto,
      );

      expect(result.observation).toBe('Test observation');
      expect(result.employeeId).toBe(testEmployee.id);
    });
  });

  describe('findAllByEmployeeId', () => {
    it('should return observations', async () => {
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

      const result = await service.findAllByEmployeeId(
        context.testUser.id,
        testEmployee.id,
      );

      expect(result.length).toBe(1);
    });
  });

  describe('findOne', () => {
    it('should return observation', async () => {
      const obs = await context.prisma.employeeObservation.create({
        data: {
          employeeId: testEmployee.id,
          observation: 'Test',
          companyId: context.testCompany.id,
          createdBy: context.testUser.id,
        },
      });

      const result = await service.findOne(context.testUser.id, obs.id);

      expect(result.id).toBe(obs.id);
    });
  });

  describe('update', () => {
    it('should update successfully', async () => {
      const obs = await context.prisma.employeeObservation.create({
        data: {
          employeeId: testEmployee.id,
          observation: 'Original',
          companyId: context.testCompany.id,
          createdBy: context.testUser.id,
        },
      });

      const result = await service.update(context.testUser.id, obs.id, {
        observation: 'Updated',
      });

      expect(result.observation).toBe('Updated');
    });
  });

  describe('remove', () => {
    it('should soft delete', async () => {
      const obs = await context.prisma.employeeObservation.create({
        data: {
          employeeId: testEmployee.id,
          observation: 'To delete',
          companyId: context.testCompany.id,
          createdBy: context.testUser.id,
        },
      });

      await service.remove(context.testUser.id, obs.id);

      const deleted = await context.prisma.employeeObservation.findUnique({
        where: { id: obs.id },
      });
      expect(deleted?.deletedAt).toBeDefined();
    });
  });
});
