import { Test, TestingModule } from '@nestjs/testing';
import { ThrottlerModule } from '@nestjs/throttler';
import { CashFlowObservationsController } from './cash-flow-observations.controller';
import { CashFlowObservationsService } from './cash-flow-observations.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import type { CurrentUser } from '../auth/decorators/current-user.decorator';

describe('CashFlowObservationsController', () => {
  let controller: CashFlowObservationsController;
  let service: jest.Mocked<CashFlowObservationsService>;

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
    cashFlowId: 'cf-1',
    observation: 'Test',
    companyId: 'company-1',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const mockService = {
      create: jest.fn(),
      findAll: jest.fn(),
      findAllByCashFlowId: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      imports: [ThrottlerModule.forRoot()],
      controllers: [CashFlowObservationsController],
      providers: [
        { provide: CashFlowObservationsService, useValue: mockService },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(PermissionsGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<CashFlowObservationsController>(
      CashFlowObservationsController,
    );
    service = module.get(CashFlowObservationsService);
  });

  it('should be defined', () => expect(controller).toBeDefined());

  it('should create observation', async () => {
    service.create.mockResolvedValue(mockObservation);
    const result = await controller.create(mockCurrentUser, {
      cashFlowId: 'cf-1',
      observation: 'Test',
    });
    expect(result).toEqual(mockObservation);
  });

  it('should get all observations', async () => {
    service.findAll.mockResolvedValue([mockObservation]);
    const result = await controller.findAll(mockCurrentUser);
    expect(result).toEqual([mockObservation]);
  });

  it('should get observations by cash flow id', async () => {
    service.findAllByCashFlowId.mockResolvedValue([mockObservation]);
    const result = await controller.findAllByCashFlowId(
      mockCurrentUser,
      'cf-1',
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
