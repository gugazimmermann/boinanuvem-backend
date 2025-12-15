import { Test, TestingModule } from '@nestjs/testing';
import { ThrottlerModule } from '@nestjs/throttler';
import { NotFoundException } from '@nestjs/common';
import { AnimalObservationsController } from './animal-observations.controller';
import { AnimalObservationsService } from './animal-observations.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { CreateAnimalObservationDto, UpdateAnimalObservationDto } from './dto';
import type { CurrentUser } from '../auth/decorators/current-user.decorator';

describe('AnimalObservationsController', () => {
  let controller: AnimalObservationsController;
  let animalObservationsService: jest.Mocked<AnimalObservationsService>;

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
    animalId: 'animal-1',
    observation: 'Test observation',
    fileIds: ['file-1', 'file-2'],
    companyId: 'company-1',
    createdBy: 'user-1',
    createdAt: new Date('2025-01-15'),
    updatedAt: new Date('2025-01-15'),
  };

  const mockCreateDto: CreateAnimalObservationDto = {
    observation: 'Test observation',
    fileIds: ['file-1', 'file-2'],
  };

  beforeEach(async () => {
    const mockAnimalObservationsService = {
      create: jest.fn(),
      findAllByAnimalId: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      imports: [ThrottlerModule.forRoot()],
      controllers: [AnimalObservationsController],
      providers: [
        {
          provide: AnimalObservationsService,
          useValue: mockAnimalObservationsService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(PermissionsGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<AnimalObservationsController>(
      AnimalObservationsController,
    );
    animalObservationsService = module.get(AnimalObservationsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create an observation successfully', async () => {
      animalObservationsService.create.mockResolvedValue(mockObservation);

      const result = await controller.create(
        mockCurrentUser,
        'animal-1',
        mockCreateDto,
      );

      expect(animalObservationsService.create).toHaveBeenCalledWith(
        mockCurrentUser.id,
        'animal-1',
        mockCreateDto,
      );
      expect(result).toEqual(mockObservation);
    });

    it('should handle NotFoundException when animal not found', async () => {
      const error = new NotFoundException('Animal not found');
      animalObservationsService.create.mockRejectedValue(error);

      await expect(
        controller.create(mockCurrentUser, 'non-existent-id', mockCreateDto),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('findAllByAnimalId', () => {
    it('should return all observations for an animal', async () => {
      animalObservationsService.findAllByAnimalId.mockResolvedValue([
        mockObservation,
      ]);

      const result = await controller.findAllByAnimalId(
        mockCurrentUser,
        'animal-1',
      );

      expect(animalObservationsService.findAllByAnimalId).toHaveBeenCalledWith(
        mockCurrentUser.id,
        'animal-1',
      );
      expect(result).toEqual([mockObservation]);
    });

    it('should return empty array when no observations exist', async () => {
      animalObservationsService.findAllByAnimalId.mockResolvedValue([]);

      const result = await controller.findAllByAnimalId(
        mockCurrentUser,
        'animal-1',
      );

      expect(result).toEqual([]);
    });
  });

  describe('findOne', () => {
    it('should return an observation by id', async () => {
      animalObservationsService.findOne.mockResolvedValue(mockObservation);

      const result = await controller.findOne(mockCurrentUser, 'obs-1');

      expect(animalObservationsService.findOne).toHaveBeenCalledWith(
        mockCurrentUser.id,
        'obs-1',
      );
      expect(result).toEqual(mockObservation);
    });

    it('should handle NotFoundException when observation not found', async () => {
      const error = new NotFoundException('Observation not found');
      animalObservationsService.findOne.mockRejectedValue(error);

      await expect(
        controller.findOne(mockCurrentUser, 'non-existent-id'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    const updateDto: UpdateAnimalObservationDto = {
      observation: 'Updated observation',
    };

    it('should update an observation successfully', async () => {
      const updatedObservation = {
        ...mockObservation,
        observation: 'Updated observation',
      };
      animalObservationsService.update.mockResolvedValue(updatedObservation);

      const result = await controller.update(
        mockCurrentUser,
        'obs-1',
        updateDto,
      );

      expect(animalObservationsService.update).toHaveBeenCalledWith(
        mockCurrentUser.id,
        'obs-1',
        updateDto,
      );
      expect(result).toEqual(updatedObservation);
    });

    it('should handle NotFoundException when observation not found', async () => {
      const error = new NotFoundException('Observation not found');
      animalObservationsService.update.mockRejectedValue(error);

      await expect(
        controller.update(mockCurrentUser, 'non-existent-id', updateDto),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should delete an observation successfully', async () => {
      animalObservationsService.remove.mockResolvedValue({
        message: 'Observation deleted successfully',
      });

      const result = await controller.remove(mockCurrentUser, 'obs-1');

      expect(animalObservationsService.remove).toHaveBeenCalledWith(
        mockCurrentUser.id,
        'obs-1',
      );
      expect(result).toEqual({ message: 'Observation deleted successfully' });
    });

    it('should handle NotFoundException when observation not found', async () => {
      const error = new NotFoundException('Observation not found');
      animalObservationsService.remove.mockRejectedValue(error);

      await expect(
        controller.remove(mockCurrentUser, 'non-existent-id'),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
