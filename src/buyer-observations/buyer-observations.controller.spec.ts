import { Test, TestingModule } from '@nestjs/testing';
import { ThrottlerModule } from '@nestjs/throttler';
import { BuyerObservationsController } from './buyer-observations.controller';
import { BuyerObservationsService } from './buyer-observations.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { CreateBuyerObservationDto, UpdateBuyerObservationDto } from './dto';
import type { CurrentUser } from '../auth/decorators/current-user.decorator';

describe('BuyerObservationsController', () => {
  let controller: BuyerObservationsController;
  let buyerObservationsService: jest.Mocked<BuyerObservationsService>;

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
    buyerId: 'buyer-1',
    observation: 'Test observation',
    fileIds: ['file-1'],
    companyId: 'company-1',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockCreateDto: CreateBuyerObservationDto = {
    observation: 'Test observation',
    fileIds: ['file-1'],
  };

  beforeEach(async () => {
    const mockBuyerObservationsService = {
      create: jest.fn(),
      findAllByBuyerId: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      imports: [ThrottlerModule.forRoot()],
      controllers: [BuyerObservationsController],
      providers: [
        {
          provide: BuyerObservationsService,
          useValue: mockBuyerObservationsService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(PermissionsGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<BuyerObservationsController>(
      BuyerObservationsController,
    );
    buyerObservationsService = module.get(BuyerObservationsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create an observation successfully', async () => {
      buyerObservationsService.create.mockResolvedValue(mockObservation);

      const result = await controller.create(
        mockCurrentUser,
        'buyer-1',
        mockCreateDto,
      );

      expect(buyerObservationsService.create).toHaveBeenCalledWith(
        mockCurrentUser.id,
        'buyer-1',
        mockCreateDto,
      );
      expect(result).toEqual(mockObservation);
    });
  });

  describe('findAllByBuyerId', () => {
    it('should return all observations', async () => {
      buyerObservationsService.findAllByBuyerId.mockResolvedValue([
        mockObservation,
      ]);

      const result = await controller.findAllByBuyerId(
        mockCurrentUser,
        'buyer-1',
      );

      expect(result).toEqual([mockObservation]);
    });
  });

  describe('findOne', () => {
    it('should return an observation by id', async () => {
      buyerObservationsService.findOne.mockResolvedValue(mockObservation);

      const result = await controller.findOne(mockCurrentUser, 'obs-1');

      expect(result).toEqual(mockObservation);
    });
  });

  describe('update', () => {
    it('should update an observation', async () => {
      const updateDto: UpdateBuyerObservationDto = { observation: 'Updated' };
      buyerObservationsService.update.mockResolvedValue({
        ...mockObservation,
        observation: 'Updated',
      });

      const result = await controller.update(
        mockCurrentUser,
        'obs-1',
        updateDto,
      );

      expect(result.observation).toBe('Updated');
    });
  });

  describe('remove', () => {
    it('should delete an observation', async () => {
      buyerObservationsService.remove.mockResolvedValue({
        message: 'Observation deleted successfully',
      });

      const result = await controller.remove(mockCurrentUser, 'obs-1');

      expect(result.message).toBe('Observation deleted successfully');
    });
  });
});
