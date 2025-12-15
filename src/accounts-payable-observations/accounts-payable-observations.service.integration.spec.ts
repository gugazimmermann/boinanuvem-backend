import { AccountsPayableObservationsService } from './accounts-payable-observations.service';
import { CreateAccountsPayableObservationDto } from './dto';
import {
  describeOrSkip,
  setupIntegrationTest,
  teardownIntegrationTest,
  createServiceTestingModule,
  getServiceFromModule,
  IntegrationTestContext,
} from '../../test/integration-test-helpers';
import { AccountsPayableStatus } from '../accounts-payable/dto';

describeOrSkip('AccountsPayableObservationsService Integration Tests', () => {
  let service: AccountsPayableObservationsService;
  let context: IntegrationTestContext;
  let testAccountsPayable: any;

  beforeAll(async () => {
    context = await setupIntegrationTest({
      cnpj: '11.222.333/0001-13',
      companyName: 'Test Accounts Payable Observations Company',
      email: 'ap-obs@testcompany.com',
      userEmail: 'user-ap-obs@testcompany.com',
      createProperty: true,
    });
    testAccountsPayable = await context.prisma.accountsPayable.create({
      data: {
        amount: 1000.0,
        dueDate: new Date('2025-02-15'),
        description: 'Test payable',
        status: AccountsPayableStatus.UNPAID,
        companyId: context.testCompany.id,
      },
    });
  });

  afterAll(async () => {
    await teardownIntegrationTest(context, {
      tables: ['accountsPayableObservation', 'accountsPayable'],
    });
  });

  beforeEach(async () => {
    const module = await createServiceTestingModule(
      AccountsPayableObservationsService,
      context.prisma,
    );
    service = getServiceFromModule(module, AccountsPayableObservationsService);
    await context.prisma.accountsPayableObservation.deleteMany({
      where: { companyId: context.testCompany.id },
    });
  });

  afterEach(async () => {
    await context.prisma.accountsPayableObservation.deleteMany({
      where: { companyId: context.testCompany.id },
    });
  });

  describe('create', () => {
    it('should create successfully', async () => {
      const createDto: CreateAccountsPayableObservationDto = {
        accountsPayableId: testAccountsPayable.id,
        observation: 'Test observation',
      };

      const result = await service.create(context.testUser.id, createDto);

      expect(result.observation).toBe('Test observation');
      expect(result.accountsPayableId).toBe(testAccountsPayable.id);
    });
  });

  describe('findAll', () => {
    it('should return all observations', async () => {
      await context.prisma.accountsPayableObservation.createMany({
        data: [
          {
            accountsPayableId: testAccountsPayable.id,
            observation: 'Obs 1',
            companyId: context.testCompany.id,
            createdBy: context.testUser.id,
          },
        ],
      });

      const result = await service.findAll(context.testUser.id);

      expect(result.length).toBe(1);
    });
  });

  describe('findAllByAccountsPayableId', () => {
    it('should return observations', async () => {
      await context.prisma.accountsPayableObservation.createMany({
        data: [
          {
            accountsPayableId: testAccountsPayable.id,
            observation: 'Obs 1',
            companyId: context.testCompany.id,
            createdBy: context.testUser.id,
          },
        ],
      });

      const result = await service.findAllByAccountsPayableId(
        context.testUser.id,
        testAccountsPayable.id,
      );

      expect(result.length).toBe(1);
    });
  });

  describe('findOne', () => {
    it('should return observation', async () => {
      const obs = await context.prisma.accountsPayableObservation.create({
        data: {
          accountsPayableId: testAccountsPayable.id,
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
      const obs = await context.prisma.accountsPayableObservation.create({
        data: {
          accountsPayableId: testAccountsPayable.id,
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
      const obs = await context.prisma.accountsPayableObservation.create({
        data: {
          accountsPayableId: testAccountsPayable.id,
          observation: 'To delete',
          companyId: context.testCompany.id,
          createdBy: context.testUser.id,
        },
      });

      await service.remove(context.testUser.id, obs.id);

      const deleted =
        await context.prisma.accountsPayableObservation.findUnique({
          where: { id: obs.id },
        });
      expect(deleted?.deletedAt).toBeDefined();
    });
  });
});
