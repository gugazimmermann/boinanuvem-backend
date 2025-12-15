import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AnimalObservationsService } from './animal-observations.service';
import { PrismaService } from '../common/services/prisma.service';
import { CreateAnimalObservationDto, UpdateAnimalObservationDto } from './dto';

describe('AnimalObservationsService', () => {
  let service: AnimalObservationsService;
  let prismaService: jest.Mocked<PrismaService>;

  const mockUser = {
    id: 'user-1',
    companyId: 'company-1',
  };

  const mockAnimal = {
    id: 'animal-1',
    companyId: 'company-1',
    deletedAt: null,
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
    deletedAt: null,
  };

  const mockCreateDto: CreateAnimalObservationDto = {
    observation: 'Test observation',
    fileIds: ['file-1', 'file-2'],
  };

  beforeEach(async () => {
    const mockPrismaService = {
      user: {
        findUnique: jest.fn(),
      },
      animal: {
        findFirst: jest.fn(),
      },
      animalObservation: {
        create: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnimalObservationsService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<AnimalObservationsService>(AnimalObservationsService);
    prismaService = module.get(PrismaService) as jest.Mocked<PrismaService>;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create an observation successfully', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.animal.findFirst.mockResolvedValue(mockAnimal);
      prismaService.animalObservation.create.mockResolvedValue(mockObservation);

      const result = await service.create('user-1', 'animal-1', mockCreateDto);

      expect(prismaService.animalObservation.create).toHaveBeenCalledWith({
        data: {
          animalId: 'animal-1',
          observation: 'Test observation',
          fileIds: JSON.stringify(['file-1', 'file-2']),
          companyId: 'company-1',
          createdBy: 'user-1',
        },
      });
      expect(result.id).toBe(mockObservation.id);
      expect(result.observation).toBe(mockObservation.observation);
    });

    it('should create observation without fileIds', async () => {
      const dtoWithoutFiles = { observation: 'Test observation' };
      const observationWithoutFiles = { ...mockObservation, fileIds: null };

      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.animal.findFirst.mockResolvedValue(mockAnimal);
      prismaService.animalObservation.create.mockResolvedValue(
        observationWithoutFiles,
      );

      const result = await service.create(
        'user-1',
        'animal-1',
        dtoWithoutFiles,
      );

      expect(prismaService.animalObservation.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          fileIds: Prisma.JsonNull,
        }),
      });
      expect(result.fileIds).toBeUndefined();
    });

    it('should throw NotFoundException if animal not found', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.animal.findFirst.mockResolvedValue(null);

      await expect(
        service.create('user-1', 'animal-1', mockCreateDto),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if user not found', async () => {
      prismaService.user.findUnique.mockResolvedValue(null);

      await expect(
        service.create('user-1', 'animal-1', mockCreateDto),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('findAllByAnimalId', () => {
    it('should return all observations for an animal', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.animal.findFirst.mockResolvedValue(mockAnimal);
      prismaService.animalObservation.findMany.mockResolvedValue([
        mockObservation,
      ]);

      const result = await service.findAllByAnimalId('user-1', 'animal-1');

      expect(prismaService.animalObservation.findMany).toHaveBeenCalledWith({
        where: {
          animalId: 'animal-1',
          companyId: 'company-1',
          deletedAt: null,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(mockObservation.id);
    });

    it('should return empty array when no observations exist', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.animal.findFirst.mockResolvedValue(mockAnimal);
      prismaService.animalObservation.findMany.mockResolvedValue([]);

      const result = await service.findAllByAnimalId('user-1', 'animal-1');

      expect(result).toEqual([]);
    });

    it('should throw NotFoundException if animal not found', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.animal.findFirst.mockResolvedValue(null);

      await expect(
        service.findAllByAnimalId('user-1', 'animal-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('findOne', () => {
    it('should return an observation by id', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.animalObservation.findFirst.mockResolvedValue(
        mockObservation,
      );

      const result = await service.findOne('user-1', 'obs-1');

      expect(prismaService.animalObservation.findFirst).toHaveBeenCalledWith({
        where: {
          id: 'obs-1',
          companyId: 'company-1',
          deletedAt: null,
        },
      });
      expect(result.id).toBe(mockObservation.id);
    });

    it('should throw NotFoundException if observation not found', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.animalObservation.findFirst.mockResolvedValue(null);

      await expect(service.findOne('user-1', 'obs-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException if user not found', async () => {
      prismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.findOne('user-1', 'obs-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('should update an observation successfully', async () => {
      const updateDto: UpdateAnimalObservationDto = {
        observation: 'Updated observation',
      };
      const updatedObservation = {
        ...mockObservation,
        observation: 'Updated observation',
        updatedAt: new Date('2025-01-16'),
      };

      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.animalObservation.findFirst.mockResolvedValue(
        mockObservation,
      );
      prismaService.animalObservation.update.mockResolvedValue(
        updatedObservation,
      );

      const result = await service.update('user-1', 'obs-1', updateDto);

      expect(prismaService.animalObservation.update).toHaveBeenCalledWith({
        where: { id: 'obs-1' },
        data: {
          observation: 'Updated observation',
        },
      });
      expect(result.observation).toBe('Updated observation');
    });

    it('should update fileIds', async () => {
      const updateDto: UpdateAnimalObservationDto = {
        fileIds: ['file-3'],
      };
      const updatedObservation = {
        ...mockObservation,
        fileIds: ['file-3'],
      };

      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.animalObservation.findFirst.mockResolvedValue(
        mockObservation,
      );
      prismaService.animalObservation.update.mockResolvedValue(
        updatedObservation,
      );

      const result = await service.update('user-1', 'obs-1', updateDto);

      expect(prismaService.animalObservation.update).toHaveBeenCalledWith({
        where: { id: 'obs-1' },
        data: {
          fileIds: JSON.stringify(['file-3']),
        },
      });
      expect(result.fileIds).toEqual(['file-3']);
    });

    it('should clear fileIds when set to empty array', async () => {
      const updateDto: UpdateAnimalObservationDto = {
        fileIds: [],
      };
      const updatedObservation = {
        ...mockObservation,
        fileIds: null,
      };

      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.animalObservation.findFirst.mockResolvedValue(
        mockObservation,
      );
      prismaService.animalObservation.update.mockResolvedValue(
        updatedObservation,
      );

      await service.update('user-1', 'obs-1', updateDto);

      expect(prismaService.animalObservation.update).toHaveBeenCalledWith({
        where: { id: 'obs-1' },
        data: {
          fileIds: Prisma.JsonNull,
        },
      });
    });

    it('should throw NotFoundException if observation not found', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.animalObservation.findFirst.mockResolvedValue(null);

      await expect(
        service.update('user-1', 'obs-1', { observation: 'Updated' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should soft delete an observation', async () => {
      const deletedObservation = {
        ...mockObservation,
        deletedAt: new Date(),
      };

      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.animalObservation.findFirst.mockResolvedValue(
        mockObservation,
      );
      prismaService.animalObservation.update.mockResolvedValue(
        deletedObservation,
      );

      const result = await service.remove('user-1', 'obs-1');

      expect(prismaService.animalObservation.update).toHaveBeenCalledWith({
        where: { id: 'obs-1' },
        data: {
          deletedAt: expect.any(Date),
        },
      });
      expect(result.message).toBe('Observation deleted successfully');
    });

    it('should throw NotFoundException if observation not found', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.animalObservation.findFirst.mockResolvedValue(null);

      await expect(service.remove('user-1', 'obs-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
