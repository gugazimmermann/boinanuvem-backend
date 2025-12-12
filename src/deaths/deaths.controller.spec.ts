import { Test, TestingModule } from '@nestjs/testing';
import { ThrottlerModule } from '@nestjs/throttler';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { DeathsController } from './deaths.controller';
import { DeathsService } from './deaths.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { CreateDeathDto, UpdateDeathDto } from './dto';
import type { CurrentUser } from '../auth/decorators/current-user.decorator';

describe('DeathsController', () => {
  let controller: DeathsController;
  let deathsService: jest.Mocked<DeathsService>;

  const mockCurrentUser: CurrentUser = {
    id: 'user-1',
    email: 'test@example.com',
    name: 'Test User',
    companyId: 'company-1',
    mainUser: false,
    permissions: {},
    company: {},
  };

  const mockDeath = {
    id: 'death-1',
    animalId: 'animal-1',
    deathDate: new Date('2020-01-15'),
    cause: 'Disease',
    observation: 'Test death',
    companyId: 'company-1',
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
    const mockDeathsService = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      findByAnimalId: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      imports: [ThrottlerModule.forRoot()],
      controllers: [DeathsController],
      providers: [
        {
          provide: DeathsService,
          useValue: mockDeathsService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(PermissionsGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<DeathsController>(DeathsController);
    deathsService = module.get(DeathsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create a death successfully', async () => {
      deathsService.create.mockResolvedValue(mockDeath);

      const result = await controller.create(
        mockCurrentUser,
        mockCreateDeathDto,
      );

      expect(deathsService.create).toHaveBeenCalledWith(
        mockCurrentUser.id,
        mockCreateDeathDto,
      );
      expect(result).toEqual(mockDeath);
    });

    it('should handle ConflictException when animal already has death', async () => {
      const error = new ConflictException('Animal already has a death record');
      deathsService.create.mockRejectedValue(error);

      await expect(
        controller.create(mockCurrentUser, mockCreateDeathDto),
      ).rejects.toThrow(ConflictException);
    });

    it('should handle NotFoundException when animal not found', async () => {
      const error = new NotFoundException('Animal not found');
      deathsService.create.mockRejectedValue(error);

      await expect(
        controller.create(mockCurrentUser, mockCreateDeathDto),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('findAll', () => {
    it('should return all deaths successfully', async () => {
      deathsService.findAll.mockResolvedValue([mockDeath]);

      const result = await controller.findAll(mockCurrentUser);

      expect(deathsService.findAll).toHaveBeenCalledWith(mockCurrentUser.id);
      expect(result).toEqual([mockDeath]);
    });

    it('should return empty array when no deaths exist', async () => {
      deathsService.findAll.mockResolvedValue([]);

      const result = await controller.findAll(mockCurrentUser);

      expect(result).toEqual([]);
    });
  });

  describe('findOne', () => {
    it('should return a death by id successfully', async () => {
      deathsService.findOne.mockResolvedValue(mockDeath);

      const result = await controller.findOne(mockCurrentUser, 'death-1');

      expect(deathsService.findOne).toHaveBeenCalledWith(
        mockCurrentUser.id,
        'death-1',
      );
      expect(result).toEqual(mockDeath);
    });

    it('should handle NotFoundException when death not found', async () => {
      const error = new NotFoundException('Death record not found');
      deathsService.findOne.mockRejectedValue(error);

      await expect(
        controller.findOne(mockCurrentUser, 'non-existent-id'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('findByAnimalId', () => {
    it('should return death by animal id successfully', async () => {
      deathsService.findByAnimalId.mockResolvedValue(mockDeath);

      const result = await controller.findByAnimalId(
        mockCurrentUser,
        'animal-1',
      );

      expect(deathsService.findByAnimalId).toHaveBeenCalledWith(
        mockCurrentUser.id,
        'animal-1',
      );
      expect(result).toEqual(mockDeath);
    });

    it('should handle NotFoundException when death not found', async () => {
      const error = new NotFoundException('Death record not found');
      deathsService.findByAnimalId.mockRejectedValue(error);

      await expect(
        controller.findByAnimalId(mockCurrentUser, 'non-existent-animal-id'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    const updateDto: UpdateDeathDto = {
      cause: 'Updated cause',
    };

    it('should update a death successfully', async () => {
      const updatedDeath = { ...mockDeath, ...updateDto };
      deathsService.update.mockResolvedValue(updatedDeath);

      const result = await controller.update(
        mockCurrentUser,
        'death-1',
        updateDto,
      );

      expect(deathsService.update).toHaveBeenCalledWith(
        mockCurrentUser.id,
        'death-1',
        updateDto,
      );
      expect(result).toEqual(updatedDeath);
    });

    it('should handle NotFoundException when death not found', async () => {
      const error = new NotFoundException('Death record not found');
      deathsService.update.mockRejectedValue(error);

      await expect(
        controller.update(mockCurrentUser, 'non-existent-id', updateDto),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should soft delete a death successfully', async () => {
      deathsService.remove.mockResolvedValue({
        message: 'Death record deleted successfully',
      });

      const result = await controller.remove(mockCurrentUser, 'death-1');

      expect(deathsService.remove).toHaveBeenCalledWith(
        mockCurrentUser.id,
        'death-1',
      );
      expect(result).toEqual({
        message: 'Death record deleted successfully',
      });
    });

    it('should handle NotFoundException when death not found', async () => {
      const error = new NotFoundException('Death record not found');
      deathsService.remove.mockRejectedValue(error);

      await expect(
        controller.remove(mockCurrentUser, 'non-existent-id'),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
