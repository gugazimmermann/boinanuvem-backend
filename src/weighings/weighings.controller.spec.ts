import { Test, TestingModule } from '@nestjs/testing';
import { ThrottlerModule } from '@nestjs/throttler';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { WeighingsController } from './weighings.controller';
import { WeighingsService } from './weighings.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { CreateWeighingDto, UpdateWeighingDto } from './dto';
import type { CurrentUser } from '../auth/decorators/current-user.decorator';

describe('WeighingsController', () => {
  let controller: WeighingsController;
  let weighingsService: jest.Mocked<WeighingsService>;

  const mockCurrentUser: CurrentUser = {
    id: 'user-1',
    email: 'test@example.com',
    name: 'Test User',
    companyId: 'company-1',
    mainUser: false,
    permissions: {},
    company: {},
  };

  const mockWeighing = {
    id: 'weighing-1',
    animalId: 'animal-1',
    weighingDate: new Date('2020-01-15'),
    weight: 350.0,
    employeeIds: ['employee-1', 'employee-2'],
    serviceProviderIds: ['provider-1'],
    appliedMedicines: [
      {
        itemId: 'medicine-1',
        quantity: 10,
        calculatedDosage: 5.5,
      },
    ],
    observation: 'Test weighing',
    companyId: 'company-1',
    createdAt: new Date('2020-01-15'),
    updatedAt: new Date('2020-01-15'),
  };

  const mockCreateWeighingDto: CreateWeighingDto = {
    animalId: 'animal-1',
    date: '2020-01-15',
    weight: 350.0,
    employeeIds: ['employee-1', 'employee-2'],
    serviceProviderIds: ['provider-1'],
    appliedMedicines: [
      {
        itemId: 'medicine-1',
        quantity: 10,
        calculatedDosage: 5.5,
      },
    ],
    observation: 'Test weighing',
  };

  beforeEach(async () => {
    const mockWeighingsService = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      findByAnimalId: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      imports: [ThrottlerModule.forRoot()],
      controllers: [WeighingsController],
      providers: [
        {
          provide: WeighingsService,
          useValue: mockWeighingsService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(PermissionsGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<WeighingsController>(WeighingsController);
    weighingsService = module.get(WeighingsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create a weighing successfully', async () => {
      weighingsService.create.mockResolvedValue(mockWeighing);

      const result = await controller.create(
        mockCurrentUser,
        mockCreateWeighingDto,
      );

      expect(weighingsService.create).toHaveBeenCalledWith(
        mockCurrentUser.id,
        mockCreateWeighingDto,
      );
      expect(result).toEqual(mockWeighing);
    });

    it('should handle BadRequestException when employee not found', async () => {
      const error = new BadRequestException('Employee not found');
      weighingsService.create.mockRejectedValue(error);

      await expect(
        controller.create(mockCurrentUser, mockCreateWeighingDto),
      ).rejects.toThrow(BadRequestException);
    });

    it('should handle NotFoundException when animal not found', async () => {
      const error = new NotFoundException('Animal not found');
      weighingsService.create.mockRejectedValue(error);

      await expect(
        controller.create(mockCurrentUser, mockCreateWeighingDto),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('findAll', () => {
    it('should return all weighings successfully', async () => {
      weighingsService.findAll.mockResolvedValue([mockWeighing]);

      const result = await controller.findAll(mockCurrentUser);

      expect(weighingsService.findAll).toHaveBeenCalledWith(mockCurrentUser.id);
      expect(result).toEqual([mockWeighing]);
    });

    it('should return empty array when no weighings exist', async () => {
      weighingsService.findAll.mockResolvedValue([]);

      const result = await controller.findAll(mockCurrentUser);

      expect(result).toEqual([]);
    });
  });

  describe('findOne', () => {
    it('should return a weighing by id successfully', async () => {
      weighingsService.findOne.mockResolvedValue(mockWeighing);

      const result = await controller.findOne(mockCurrentUser, 'weighing-1');

      expect(weighingsService.findOne).toHaveBeenCalledWith(
        mockCurrentUser.id,
        'weighing-1',
      );
      expect(result).toEqual(mockWeighing);
    });

    it('should handle NotFoundException when weighing not found', async () => {
      const error = new NotFoundException('Weighing record not found');
      weighingsService.findOne.mockRejectedValue(error);

      await expect(
        controller.findOne(mockCurrentUser, 'non-existent-id'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('findByAnimalId', () => {
    it('should return weighings by animal id successfully', async () => {
      weighingsService.findByAnimalId.mockResolvedValue([mockWeighing]);

      const result = await controller.findByAnimalId(
        mockCurrentUser,
        'animal-1',
      );

      expect(weighingsService.findByAnimalId).toHaveBeenCalledWith(
        mockCurrentUser.id,
        'animal-1',
      );
      expect(result).toEqual([mockWeighing]);
    });

    it('should handle NotFoundException when animal not found', async () => {
      const error = new NotFoundException('Animal not found');
      weighingsService.findByAnimalId.mockRejectedValue(error);

      await expect(
        controller.findByAnimalId(mockCurrentUser, 'non-existent-animal-id'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    const updateDto: UpdateWeighingDto = {
      weight: 400.0,
      observation: 'Updated observation',
    };

    it('should update a weighing successfully', async () => {
      const updatedWeighing = { ...mockWeighing, ...updateDto };
      weighingsService.update.mockResolvedValue(updatedWeighing);

      const result = await controller.update(
        mockCurrentUser,
        'weighing-1',
        updateDto,
      );

      expect(weighingsService.update).toHaveBeenCalledWith(
        mockCurrentUser.id,
        'weighing-1',
        updateDto,
      );
      expect(result).toEqual(updatedWeighing);
    });

    it('should handle NotFoundException when weighing not found', async () => {
      const error = new NotFoundException('Weighing record not found');
      weighingsService.update.mockRejectedValue(error);

      await expect(
        controller.update(mockCurrentUser, 'non-existent-id', updateDto),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should soft delete a weighing successfully', async () => {
      weighingsService.remove.mockResolvedValue({
        message: 'Weighing record deleted successfully',
      });

      const result = await controller.remove(mockCurrentUser, 'weighing-1');

      expect(weighingsService.remove).toHaveBeenCalledWith(
        mockCurrentUser.id,
        'weighing-1',
      );
      expect(result).toEqual({
        message: 'Weighing record deleted successfully',
      });
    });

    it('should handle NotFoundException when weighing not found', async () => {
      const error = new NotFoundException('Weighing record not found');
      weighingsService.remove.mockRejectedValue(error);

      await expect(
        controller.remove(mockCurrentUser, 'non-existent-id'),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
