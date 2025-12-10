import { Test, TestingModule } from '@nestjs/testing';
import { ThrottlerModule } from '@nestjs/throttler';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { BirthsController } from './births.controller';
import { BirthsService } from './births.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { CreateBirthDto, UpdateBirthDto } from './dto';
import type { CurrentUser } from '../auth/decorators/current-user.decorator';

describe('BirthsController', () => {
  let controller: BirthsController;
  let birthsService: jest.Mocked<BirthsService>;

  const mockCurrentUser: CurrentUser = {
    id: 'user-1',
    email: 'test@example.com',
    name: 'Test User',
    companyId: 'company-1',
    mainUser: false,
    permissions: {},
    company: {},
  };

  const mockBirth = {
    id: 'birth-1',
    animalId: 'animal-1',
    birthDate: new Date('2020-01-15'),
    breed: 'nelore',
    gender: 'male',
    motherId: 'mother-1',
    fatherId: 'father-1',
    purity: 'po',
    observation: 'Healthy birth',
    companyId: 'company-1',
    createdAt: new Date('2020-01-15'),
    updatedAt: new Date('2020-01-15'),
  };

  const mockCreateBirthDto: CreateBirthDto = {
    code: '001',
    registrationNumber: 'BR-2020-FJ0001',
    propertyId: 'property-1',
    birthDate: '2020-01-15',
    breed: 'nelore',
    gender: 'male',
    motherId: 'mother-1',
    fatherId: 'father-1',
    observation: 'Healthy birth',
  };

  beforeEach(async () => {
    const mockBirthsService = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      findByAnimalId: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      imports: [ThrottlerModule.forRoot()],
      controllers: [BirthsController],
      providers: [
        {
          provide: BirthsService,
          useValue: mockBirthsService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(PermissionsGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<BirthsController>(BirthsController);
    birthsService = module.get(BirthsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create a birth record successfully', async () => {
      birthsService.create.mockResolvedValue(mockBirth);

      const result = await controller.create(
        mockCurrentUser,
        mockCreateBirthDto,
      );

      expect(birthsService.create).toHaveBeenCalledWith(
        mockCurrentUser.id,
        mockCreateBirthDto,
      );
      expect(result).toEqual(mockBirth);
    });

    it('should handle ConflictException when code already exists', async () => {
      const error = new ConflictException(
        'Animal with this code already exists for your company',
      );
      birthsService.create.mockRejectedValue(error);

      await expect(
        controller.create(mockCurrentUser, mockCreateBirthDto),
      ).rejects.toThrow(ConflictException);
      expect(birthsService.create).toHaveBeenCalledWith(
        mockCurrentUser.id,
        mockCreateBirthDto,
      );
    });

    it('should handle NotFoundException when property not found', async () => {
      const error = new NotFoundException(
        'Property not found or does not belong to your company',
      );
      birthsService.create.mockRejectedValue(error);

      await expect(
        controller.create(mockCurrentUser, mockCreateBirthDto),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('findAll', () => {
    it('should return all birth records successfully', async () => {
      birthsService.findAll.mockResolvedValue([mockBirth]);

      const result = await controller.findAll(mockCurrentUser);

      expect(birthsService.findAll).toHaveBeenCalledWith(mockCurrentUser.id);
      expect(result).toEqual([mockBirth]);
    });

    it('should return empty array when no birth records exist', async () => {
      birthsService.findAll.mockResolvedValue([]);

      const result = await controller.findAll(mockCurrentUser);

      expect(result).toEqual([]);
      expect(birthsService.findAll).toHaveBeenCalledWith(mockCurrentUser.id);
    });

    it('should handle service errors', async () => {
      const error = new Error('Database connection failed');
      birthsService.findAll.mockRejectedValue(error);

      await expect(controller.findAll(mockCurrentUser)).rejects.toThrow(
        'Database connection failed',
      );
    });
  });

  describe('findOne', () => {
    it('should return a birth record by id successfully', async () => {
      birthsService.findOne.mockResolvedValue(mockBirth);

      const result = await controller.findOne(mockCurrentUser, mockBirth.id);

      expect(birthsService.findOne).toHaveBeenCalledWith(
        mockCurrentUser.id,
        mockBirth.id,
      );
      expect(result).toEqual(mockBirth);
    });

    it('should handle NotFoundException when birth record not found', async () => {
      const error = new NotFoundException('Birth record not found');
      birthsService.findOne.mockRejectedValue(error);

      await expect(
        controller.findOne(mockCurrentUser, 'non-existent-id'),
      ).rejects.toThrow(NotFoundException);
      expect(birthsService.findOne).toHaveBeenCalledWith(
        mockCurrentUser.id,
        'non-existent-id',
      );
    });
  });

  describe('findByAnimalId', () => {
    it('should return a birth record by animal id successfully', async () => {
      birthsService.findByAnimalId.mockResolvedValue(mockBirth);

      const result = await controller.findByAnimalId(
        mockCurrentUser,
        mockBirth.animalId,
      );

      expect(birthsService.findByAnimalId).toHaveBeenCalledWith(
        mockCurrentUser.id,
        mockBirth.animalId,
      );
      expect(result).toEqual(mockBirth);
    });

    it('should handle NotFoundException when animal not found', async () => {
      const error = new NotFoundException('Animal not found');
      birthsService.findByAnimalId.mockRejectedValue(error);

      await expect(
        controller.findByAnimalId(mockCurrentUser, 'non-existent-animal-id'),
      ).rejects.toThrow(NotFoundException);
      expect(birthsService.findByAnimalId).toHaveBeenCalledWith(
        mockCurrentUser.id,
        'non-existent-animal-id',
      );
    });

    it('should handle NotFoundException when birth record not found for animal', async () => {
      const error = new NotFoundException(
        'Birth record not found for this animal',
      );
      birthsService.findByAnimalId.mockRejectedValue(error);

      await expect(
        controller.findByAnimalId(mockCurrentUser, 'animal-without-birth'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    const updateDto: UpdateBirthDto = {
      observation: 'Updated observation',
    };

    it('should update a birth record successfully', async () => {
      const updatedBirth = { ...mockBirth, ...updateDto };
      birthsService.update.mockResolvedValue(updatedBirth);

      const result = await controller.update(
        mockCurrentUser,
        mockBirth.id,
        updateDto,
      );

      expect(birthsService.update).toHaveBeenCalledWith(
        mockCurrentUser.id,
        mockBirth.id,
        updateDto,
      );
      expect(result).toEqual(updatedBirth);
    });

    it('should handle NotFoundException when birth record not found', async () => {
      const error = new NotFoundException('Birth record not found');
      birthsService.update.mockRejectedValue(error);

      await expect(
        controller.update(mockCurrentUser, 'non-existent-id', updateDto),
      ).rejects.toThrow(NotFoundException);
    });

    it('should handle service errors during update', async () => {
      const error = new Error('Update failed');
      birthsService.update.mockRejectedValue(error);

      await expect(
        controller.update(mockCurrentUser, mockBirth.id, updateDto),
      ).rejects.toThrow('Update failed');
    });
  });

  describe('remove', () => {
    it('should soft delete a birth record successfully', async () => {
      birthsService.remove.mockResolvedValue({
        message: 'Birth record deleted successfully',
      });

      const result = await controller.remove(mockCurrentUser, mockBirth.id);

      expect(birthsService.remove).toHaveBeenCalledWith(
        mockCurrentUser.id,
        mockBirth.id,
      );
      expect(result).toEqual({ message: 'Birth record deleted successfully' });
    });

    it('should handle NotFoundException when birth record not found', async () => {
      const error = new NotFoundException('Birth record not found');
      birthsService.remove.mockRejectedValue(error);

      await expect(
        controller.remove(mockCurrentUser, 'non-existent-id'),
      ).rejects.toThrow(NotFoundException);
      expect(birthsService.remove).toHaveBeenCalledWith(
        mockCurrentUser.id,
        'non-existent-id',
      );
    });
  });
});
