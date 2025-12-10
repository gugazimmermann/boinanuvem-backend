import { Test, TestingModule } from '@nestjs/testing';
import { ThrottlerModule } from '@nestjs/throttler';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { AnimalsController } from './animals.controller';
import { AnimalsService } from './animals.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { CreateAnimalDto, UpdateAnimalDto } from './dto';
import type { CurrentUser } from '../auth/decorators/current-user.decorator';

describe('AnimalsController', () => {
  let controller: AnimalsController;
  let animalsService: jest.Mocked<AnimalsService>;

  const mockCurrentUser: CurrentUser = {
    id: 'user-1',
    email: 'test@example.com',
    name: 'Test User',
    companyId: 'company-1',
    mainUser: false,
    permissions: {},
    company: {},
  };

  const mockAnimal = {
    id: 'animal-1',
    code: '001',
    registrationNumber: 'BR-2020-FJ0001',
    acquisitionDate: new Date('2020-01-15'),
    status: 'active',
    companyId: 'company-1',
    propertyId: 'property-1',
    createdAt: new Date('2020-01-15'),
    updatedAt: new Date('2020-01-15'),
  };

  const mockCreateAnimalDto: CreateAnimalDto = {
    code: '001',
    registrationNumber: 'BR-2020-FJ0001',
    acquisitionDate: '2020-01-15',
    status: 'active',
    propertyId: 'property-1',
  };

  beforeEach(async () => {
    const mockAnimalsService = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      imports: [ThrottlerModule.forRoot()],
      controllers: [AnimalsController],
      providers: [
        {
          provide: AnimalsService,
          useValue: mockAnimalsService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(PermissionsGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<AnimalsController>(AnimalsController);
    animalsService = module.get(AnimalsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create an animal successfully', async () => {
      animalsService.create.mockResolvedValue(mockAnimal);

      const result = await controller.create(
        mockCurrentUser,
        mockCreateAnimalDto,
      );

      expect(animalsService.create).toHaveBeenCalledWith(
        mockCurrentUser.id,
        mockCreateAnimalDto,
      );
      expect(result).toEqual(mockAnimal);
    });

    it('should handle ConflictException when code already exists', async () => {
      const error = new ConflictException(
        'Animal with this code already exists for your company',
      );
      animalsService.create.mockRejectedValue(error);

      await expect(
        controller.create(mockCurrentUser, mockCreateAnimalDto),
      ).rejects.toThrow(ConflictException);
      expect(animalsService.create).toHaveBeenCalledWith(
        mockCurrentUser.id,
        mockCreateAnimalDto,
      );
    });

    it('should handle NotFoundException when property not found', async () => {
      const error = new NotFoundException(
        'Property not found or does not belong to your company',
      );
      animalsService.create.mockRejectedValue(error);

      await expect(
        controller.create(mockCurrentUser, mockCreateAnimalDto),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('findAll', () => {
    it('should return all animals successfully', async () => {
      animalsService.findAll.mockResolvedValue([mockAnimal]);

      const result = await controller.findAll(mockCurrentUser);

      expect(animalsService.findAll).toHaveBeenCalledWith(mockCurrentUser.id);
      expect(result).toEqual([mockAnimal]);
    });

    it('should return empty array when no animals exist', async () => {
      animalsService.findAll.mockResolvedValue([]);

      const result = await controller.findAll(mockCurrentUser);

      expect(result).toEqual([]);
      expect(animalsService.findAll).toHaveBeenCalledWith(mockCurrentUser.id);
    });

    it('should handle service errors', async () => {
      const error = new Error('Database connection failed');
      animalsService.findAll.mockRejectedValue(error);

      await expect(controller.findAll(mockCurrentUser)).rejects.toThrow(
        'Database connection failed',
      );
    });
  });

  describe('findOne', () => {
    it('should return an animal by id successfully', async () => {
      animalsService.findOne.mockResolvedValue(mockAnimal);

      const result = await controller.findOne(mockCurrentUser, mockAnimal.id);

      expect(animalsService.findOne).toHaveBeenCalledWith(
        mockCurrentUser.id,
        mockAnimal.id,
      );
      expect(result).toEqual(mockAnimal);
    });

    it('should handle NotFoundException when animal not found', async () => {
      const error = new NotFoundException('Animal not found');
      animalsService.findOne.mockRejectedValue(error);

      await expect(
        controller.findOne(mockCurrentUser, 'non-existent-id'),
      ).rejects.toThrow(NotFoundException);
      expect(animalsService.findOne).toHaveBeenCalledWith(
        mockCurrentUser.id,
        'non-existent-id',
      );
    });
  });

  describe('update', () => {
    const updateDto: UpdateAnimalDto = {
      name: 'Updated Name',
      status: 'inactive',
    };

    it('should update an animal successfully', async () => {
      const updatedAnimal = { ...mockAnimal, ...updateDto };
      animalsService.update.mockResolvedValue(updatedAnimal);

      const result = await controller.update(
        mockCurrentUser,
        mockAnimal.id,
        updateDto,
      );

      expect(animalsService.update).toHaveBeenCalledWith(
        mockCurrentUser.id,
        mockAnimal.id,
        updateDto,
      );
      expect(result).toEqual(updatedAnimal);
    });

    it('should handle NotFoundException when animal not found', async () => {
      const error = new NotFoundException('Animal not found');
      animalsService.update.mockRejectedValue(error);

      await expect(
        controller.update(mockCurrentUser, 'non-existent-id', updateDto),
      ).rejects.toThrow(NotFoundException);
    });

    it('should handle ConflictException when code already exists', async () => {
      const error = new ConflictException(
        'Animal with this code already exists for your company',
      );
      animalsService.update.mockRejectedValue(error);

      await expect(
        controller.update(mockCurrentUser, mockAnimal.id, {
          code: 'existing-code',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('remove', () => {
    it('should soft delete an animal successfully', async () => {
      animalsService.remove.mockResolvedValue({
        message: 'Animal deleted successfully',
      });

      const result = await controller.remove(mockCurrentUser, mockAnimal.id);

      expect(animalsService.remove).toHaveBeenCalledWith(
        mockCurrentUser.id,
        mockAnimal.id,
      );
      expect(result).toEqual({ message: 'Animal deleted successfully' });
    });

    it('should handle NotFoundException when animal not found', async () => {
      const error = new NotFoundException('Animal not found');
      animalsService.remove.mockRejectedValue(error);

      await expect(
        controller.remove(mockCurrentUser, 'non-existent-id'),
      ).rejects.toThrow(NotFoundException);
      expect(animalsService.remove).toHaveBeenCalledWith(
        mockCurrentUser.id,
        'non-existent-id',
      );
    });
  });
});
