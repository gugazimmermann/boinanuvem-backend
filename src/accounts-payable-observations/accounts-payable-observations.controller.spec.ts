import { Test, TestingModule } from '@nestjs/testing';
import { ThrottlerModule } from '@nestjs/throttler';
import { AccountsPayableObservationsController } from './accounts-payable-observations.controller';
import { AccountsPayableObservationsService } from './accounts-payable-observations.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import type { CurrentUser } from '../auth/decorators/current-user.decorator';

describe('AccountsPayableObservationsController', () => {
  let controller: AccountsPayableObservationsController;
  let service: jest.Mocked<AccountsPayableObservationsService>;

  const mockCurrentUser: CurrentUser = {
    id: 'user-1',
    email: 'test@example.com',
    name: 'Test User',
    companyId: 'company-1',
    mainUser: false,
    permissions: {},
    company: {},
  };

  const mockObservation = {
    id: 'obs-1',
    accountsPayableId: 'ap-1',
    observation: 'Test',
    companyId: 'company-1',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const mockService = {
      create: jest.fn(),
      findAll: jest.fn(),
      findAllByAccountsPayableId: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      imports: [ThrottlerModule.forRoot()],
      controllers: [AccountsPayableObservationsController],
      providers: [
        { provide: AccountsPayableObservationsService, useValue: mockService },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(PermissionsGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<AccountsPayableObservationsController>(
      AccountsPayableObservationsController,
    );
    service = module.get(AccountsPayableObservationsService);
  });

  it('should be defined', () => expect(controller).toBeDefined());

  it('should create observation', async () => {
    service.create.mockResolvedValue(mockObservation);
    const result = await controller.create(mockCurrentUser, {
      accountsPayableId: 'ap-1',
      observation: 'Test',
    });
    expect(result).toEqual(mockObservation);
  });

  it('should get all observations', async () => {
    service.findAll.mockResolvedValue([mockObservation]);
    const result = await controller.findAll(mockCurrentUser);
    expect(result).toEqual([mockObservation]);
  });

  it('should get observations by accounts payable id', async () => {
    service.findAllByAccountsPayableId.mockResolvedValue([mockObservation]);
    const result = await controller.findAllByAccountsPayableId(
      mockCurrentUser,
      'ap-1',
    );
    expect(result).toEqual([mockObservation]);
  });

  it('should get observation by id', async () => {
    service.findOne.mockResolvedValue(mockObservation);
    const result = await controller.findOne(mockCurrentUser, 'obs-1');
    expect(result).toEqual(mockObservation);
  });

  it('should update observation', async () => {
    service.update.mockResolvedValue({
      ...mockObservation,
      observation: 'Updated',
    });
    const result = await controller.update(mockCurrentUser, 'obs-1', {
      observation: 'Updated',
    });
    expect(result.observation).toBe('Updated');
  });

  it('should delete observation', async () => {
    service.remove.mockResolvedValue({
      message: 'Observation deleted successfully',
    });
    const result = await controller.remove(mockCurrentUser, 'obs-1');
    expect(result.message).toBe('Observation deleted successfully');
  });
});
