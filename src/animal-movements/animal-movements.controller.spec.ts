import { Test, TestingModule } from '@nestjs/testing';
import { ThrottlerModule } from '@nestjs/throttler';
import { NotFoundException } from '@nestjs/common';
import { AnimalMovementsController } from './animal-movements.controller';
import { AnimalMovementsService } from './animal-movements.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { CreateAnimalMovementDto } from './dto';
import type { CurrentUser } from '../auth/decorators/current-user.decorator';

describe('AnimalMovementsController', () => {
  let controller: AnimalMovementsController;
  let animalMovementsService: jest.Mocked<AnimalMovementsService>;

  const mockCurrentUser: CurrentUser = {
    id: 'user-1',
    email: 'test@example.com',
    name: 'Test User',
    companyId: 'company-1',
    mainUser: false,
    permissions: {},
    company: {},
  };

  const mockAnimalMovement = {
    id: 'movement-1',
    companyId: 'company-1',
    propertyId: 'property-1',
    locationId: 'location-1',
    animalIds: ['animal-1'],
    employeeIds: ['employee-1'],
    serviceProviderIds: ['sp-1'],
    date: '2025-01-15T00:00:00.000Z',
    observation: 'Test observation',
    fileIds: ['file-1'],
    createdAt: '2025-01-15T00:00:00.000Z',
    updatedAt: '2025-01-15T00:00:00.000Z',
  };

  const mockCreateAnimalMovementDto: CreateAnimalMovementDto = {
    propertyId: 'property-1',
    locationId: 'location-1',
    animalIds: ['animal-1'],
    employeeIds: ['employee-1'],
    serviceProviderIds: ['sp-1'],
    date: '2025-01-15',
    observation: 'Test observation',
    fileIds: ['file-1'],
  };

  beforeEach(async () => {
    const mockAnimalMovementsService = {
      create: jest.fn(),
      findAllForCompany: jest.fn(),
      findOne: jest.fn(),
      findByAnimalId: jest.fn(),
      findByLocationId: jest.fn(),
      findByPropertyId: jest.fn(),
      findByEmployeeId: jest.fn(),
      findByServiceProviderId: jest.fn(),
      findAnimalsByLastMovementLocation: jest.fn(),
      remove: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      imports: [ThrottlerModule.forRoot()],
      controllers: [AnimalMovementsController],
      providers: [
        {
          provide: AnimalMovementsService,
          useValue: mockAnimalMovementsService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(PermissionsGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<AnimalMovementsController>(
      AnimalMovementsController,
    );
    animalMovementsService = module.get(AnimalMovementsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create an animal movement successfully', async () => {
      animalMovementsService.create.mockResolvedValue(mockAnimalMovement);

      const result = await controller.create(
        mockCurrentUser,
        mockCreateAnimalMovementDto,
      );

      expect(animalMovementsService.create).toHaveBeenCalledWith(
        mockCurrentUser.id,
        mockCreateAnimalMovementDto,
      );
      expect(result).toEqual(mockAnimalMovement);
    });
  });

  describe('findAllForCompany', () => {
    it('should return all animal movements', async () => {
      animalMovementsService.findAllForCompany.mockResolvedValue([
        mockAnimalMovement,
      ]);

      const result = await controller.findAllForCompany(mockCurrentUser);

      expect(animalMovementsService.findAllForCompany).toHaveBeenCalledWith(
        mockCurrentUser.id,
      );
      expect(result).toEqual([mockAnimalMovement]);
    });
  });

  describe('findOne', () => {
    it('should return animal movement by ID', async () => {
      animalMovementsService.findOne.mockResolvedValue(mockAnimalMovement);

      const result = await controller.findOne(mockCurrentUser, 'movement-1');

      expect(animalMovementsService.findOne).toHaveBeenCalledWith(
        mockCurrentUser.id,
        'movement-1',
      );
      expect(result).toEqual(mockAnimalMovement);
    });

    it('should throw NotFoundException if movement not found', async () => {
      animalMovementsService.findOne.mockRejectedValue(
        new NotFoundException('Animal movement not found'),
      );

      await expect(
        controller.findOne(mockCurrentUser, 'movement-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('findByAnimalId', () => {
    it('should return movements for specific animal', async () => {
      animalMovementsService.findByAnimalId.mockResolvedValue([
        mockAnimalMovement,
      ]);

      const result = await controller.findByAnimalId(
        mockCurrentUser,
        'animal-1',
      );

      expect(animalMovementsService.findByAnimalId).toHaveBeenCalledWith(
        mockCurrentUser.id,
        'animal-1',
      );
      expect(result).toEqual([mockAnimalMovement]);
    });
  });

  describe('remove', () => {
    it('should remove animal movement successfully', async () => {
      animalMovementsService.remove.mockResolvedValue(undefined);

      await controller.remove(mockCurrentUser, 'movement-1');

      expect(animalMovementsService.remove).toHaveBeenCalledWith(
        mockCurrentUser.id,
        'movement-1',
      );
    });
  });
});
