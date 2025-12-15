import { AccountsReceivableObservationsService } from './accounts-receivable-observations.service';
import { CreateAccountsReceivableObservationDto } from './dto';
import {
  describeOrSkip,
  setupIntegrationTest,
  teardownIntegrationTest,
  createServiceTestingModule,
  getServiceFromModule,
  IntegrationTestContext,
} from '../../test/integration-test-helpers';
import { AccountsReceivableStatus } from '../accounts-receivable/dto';

describeOrSkip(
  'AccountsReceivableObservationsService Integration Tests',
  () => {
    let service: AccountsReceivableObservationsService;
    let context: IntegrationTestContext;
    let testAccountsReceivable: any;

    beforeAll(async () => {
      context = await setupIntegrationTest({
        cnpj: '11.222.333/0001-14',
        companyName: 'Test Accounts Receivable Observations Company',
        email: 'ar-obs@testcompany.com',
        userEmail: 'user-ar-obs@testcompany.com',
        createProperty: true,
      });
      testAccountsReceivable = await context.prisma.accountsReceivable.create({
        data: {
          amount: 5000.0,
          dueDate: new Date('2025-02-15'),
          description: 'Test receivable',
          status: AccountsReceivableStatus.UNPAID,
          companyId: context.testCompany.id,
        },
      });
    });

    afterAll(async () => {
      await teardownIntegrationTest(context, {
        tables: ['accountsReceivableObservation', 'accountsReceivable'],
      });
    });

    beforeEach(async () => {
      const module = await createServiceTestingModule(
        AccountsReceivableObservationsService,
        context.prisma,
      );
      service = getServiceFromModule(
        module,
        AccountsReceivableObservationsService,
      );
      await context.prisma.accountsReceivableObservation.deleteMany({
        where: { companyId: context.testCompany.id },
      });
    });

    afterEach(async () => {
      await context.prisma.accountsReceivableObservation.deleteMany({
        where: { companyId: context.testCompany.id },
      });
    });

    describe('create', () => {
      it('should create successfully', async () => {
        const createDto: CreateAccountsReceivableObservationDto = {
          accountsReceivableId: testAccountsReceivable.id,
          observation: 'Test observation',
        };

        const result = await service.create(context.testUser.id, createDto);

        expect(result.observation).toBe('Test observation');
        expect(result.accountsReceivableId).toBe(testAccountsReceivable.id);
      });
    });

    describe('findAll', () => {
      it('should return all observations', async () => {
        await context.prisma.accountsReceivableObservation.createMany({
          data: [
            {
              accountsReceivableId: testAccountsReceivable.id,
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

    describe('findAllByAccountsReceivableId', () => {
      it('should return observations', async () => {
        await context.prisma.accountsReceivableObservation.createMany({
          data: [
            {
              accountsReceivableId: testAccountsReceivable.id,
              observation: 'Obs 1',
              companyId: context.testCompany.id,
              createdBy: context.testUser.id,
            },
          ],
        });

        const result = await service.findAllByAccountsReceivableId(
          context.testUser.id,
          testAccountsReceivable.id,
        );

        expect(result.length).toBe(1);
      });
    });

    describe('findOne', () => {
      it('should return observation', async () => {
        const obs = await context.prisma.accountsReceivableObservation.create({
          data: {
            accountsReceivableId: testAccountsReceivable.id,
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
        const obs = await context.prisma.accountsReceivableObservation.create({
          data: {
            accountsReceivableId: testAccountsReceivable.id,
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
        const obs = await context.prisma.accountsReceivableObservation.create({
          data: {
            accountsReceivableId: testAccountsReceivable.id,
            observation: 'To delete',
            companyId: context.testCompany.id,
            createdBy: context.testUser.id,
          },
        });

        await service.remove(context.testUser.id, obs.id);

        const deleted =
          await context.prisma.accountsReceivableObservation.findUnique({
            where: { id: obs.id },
          });
        expect(deleted?.deletedAt).toBeDefined();
      });
    });
  },
);
