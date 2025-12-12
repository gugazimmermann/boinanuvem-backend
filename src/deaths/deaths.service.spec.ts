import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { DeathsService } from './deaths.service';
import { PrismaService } from '../common/services/prisma.service';
import { CreateDeathDto, UpdateDeathDto } from './dto';

describe('DeathsService', () => {
  let service: DeathsService;
  let prismaService: jest.Mocked<PrismaService>;

  const mockUser = {
    id: 'user-1',
    companyId: 'company-1',
  };

  const mockAnimal = {
    id: 'animal-1',
    code: '001',
    registrationNumber: 'BR-2020-FJ0001',
    status: 'active',
    companyId: 'company-1',
    propertyId: 'property-1',
    deletedAt: null,
  };

  const mockDeath = {
    id: 'death-1',
    animalId: 'animal-1',
    deathDate: new Date('2020-01-15'),
    cause: 'Disease',
    observation: 'Test death',
    companyId: 'company-1',
    deletedAt: null,
    createdAt: new Date('2020-01-15'),
    updatedAt: new Date('2020-01-15'),
  };

  const mockCreateDeathDto: CreateDeathDto = {
    animalId: 'animal-1',
    date: '2020-01-15',
    cause: 'Disease',
    observation: 'Test death',
  };

  beforeEach(async () => {
    const mockPrismaService = {
      user: {
        findUnique: jest.fn(),
      },
      animal: {
        findFirst: jest.fn(),
        update: jest.fn(),
      },
      death: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      $transaction: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DeathsService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<DeathsService>(DeathsService);
    prismaService = module.get(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a death successfully', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.animal.findFirst.mockResolvedValue(mockAnimal);
      prismaService.death.findUnique.mockResolvedValue(null);

      prismaService.$transaction.mockImplementation(async (callback) => {
        const tx = {
          death: {
            create: jest.fn().mockResolvedValue(mockDeath),
          },
          animal: {
            update: jest.fn().mockResolvedValue({
              ...mockAnimal,
              status: 'inactive',
            }),
          },
        };
        return callback(tx);
      });

      const result = await service.create(mockUser.id, mockCreateDeathDto);

      expect(prismaService.$transaction).toHaveBeenCalled();
      expect(result).toBeDefined();
      expect(result.id).toBe(mockDeath.id);
    });

    it('should restore soft-deleted death if exists', async () => {
      const existingDeath = { ...mockDeath, deletedAt: new Date() };
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.animal.findFirst.mockResolvedValue(mockAnimal);
      prismaService.death.findUnique.mockResolvedValue(existingDeath);

      const mockDeathUpdate = jest.fn().mockResolvedValue({
        ...mockDeath,
        deletedAt: null,
      });

      prismaService.$transaction.mockImplementation(async (callback) => {
        const tx = {
          death: {
            update: mockDeathUpdate,
          },
          animal: {
            update: jest.fn().mockResolvedValue({
              ...mockAnimal,
              status: 'inactive',
            }),
          },
        };
        return callback(tx);
      });

      const result = await service.create(mockUser.id, mockCreateDeathDto);

      expect(mockDeathUpdate).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('should throw ConflictException if animal already has active death', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.animal.findFirst.mockResolvedValue(mockAnimal);
      prismaService.death.findUnique.mockResolvedValue(mockDeath);

      await expect(
        service.create(mockUser.id, mockCreateDeathDto),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw NotFoundException if animal not found', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.animal.findFirst.mockResolvedValue(null);

      await expect(
        service.create(mockUser.id, mockCreateDeathDto),
      ).rejects.toThrow(NotFoundException);
    });

    it('should update animal status to inactive', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.animal.findFirst.mockResolvedValue(mockAnimal);
      prismaService.death.findUnique.mockResolvedValue(null);

      let animalUpdateCalled = false;
      prismaService.$transaction.mockImplementation(async (callback) => {
        const tx = {
          death: {
            create: jest.fn().mockResolvedValue(mockDeath),
          },
          animal: {
            update: jest.fn().mockImplementation(() => {
              animalUpdateCalled = true;
              return Promise.resolve({
                ...mockAnimal,
                status: 'inactive',
              });
            }),
          },
        };
        return callback(tx);
      });

      await service.create(mockUser.id, mockCreateDeathDto);

      expect(animalUpdateCalled).toBe(true);
    });
  });

  describe('findAll', () => {
    it('should return all deaths for company', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.death.findMany.mockResolvedValue([mockDeath]);

      const result = await service.findAll(mockUser.id);

      expect(prismaService.death.findMany).toHaveBeenCalledWith({
        where: {
          companyId: 'company-1',
          deletedAt: null,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });
      expect(result).toHaveLength(1);
    });
  });

  describe('findOne', () => {
    it('should return death by ID', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.death.findFirst.mockResolvedValue(mockDeath);

      const result = await service.findOne(mockUser.id, 'death-1');

      expect(result).toBeDefined();
      expect(result.id).toBe('death-1');
    });

    it('should throw NotFoundException if death not found', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.death.findFirst.mockResolvedValue(null);

      await expect(service.findOne(mockUser.id, 'death-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findByAnimalId', () => {
    it('should return death for animal', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.animal.findFirst.mockResolvedValue(mockAnimal);
      prismaService.death.findUnique.mockResolvedValue(mockDeath);

      const result = await service.findByAnimalId(mockUser.id, 'animal-1');

      expect(result).toBeDefined();
      expect(result.animalId).toBe('animal-1');
    });

    it('should throw NotFoundException if death not found for animal', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.animal.findFirst.mockResolvedValue(mockAnimal);
      prismaService.death.findUnique.mockResolvedValue(null);

      await expect(
        service.findByAnimalId(mockUser.id, 'animal-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update death successfully', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.death.findFirst.mockResolvedValue(mockDeath);
      prismaService.death.update.mockResolvedValue({
        ...mockDeath,
        cause: 'Updated cause',
      });

      const updateDto: UpdateDeathDto = {
        cause: 'Updated cause',
      };

      const result = await service.update(mockUser.id, 'death-1', updateDto);

      expect(prismaService.death.update).toHaveBeenCalled();
      expect(result.cause).toBe('Updated cause');
    });

    it('should update with all optional fields', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.death.findFirst.mockResolvedValue(mockDeath);
      prismaService.death.update.mockResolvedValue(mockDeath);

      const updateDto: UpdateDeathDto = {
        date: '2020-01-20',
        cause: 'Updated cause',
        observation: 'Updated observation',
      };

      await service.update(mockUser.id, 'death-1', updateDto);

      expect(prismaService.death.update).toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('should soft delete death and restore animal status', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.death.findFirst.mockResolvedValue(mockDeath);
      prismaService.animal.update.mockResolvedValue({
        ...mockAnimal,
        status: 'active',
      });
      prismaService.death.update.mockResolvedValue({
        ...mockDeath,
        deletedAt: new Date(),
      });

      const result = await service.remove(mockUser.id, 'death-1');

      expect(prismaService.animal.update).toHaveBeenCalledWith({
        where: { id: 'animal-1' },
        data: {
          status: 'active',
        },
      });
      expect(prismaService.death.update).toHaveBeenCalled();
      expect(result.message).toBe('Death record deleted successfully');
    });
  });
});
