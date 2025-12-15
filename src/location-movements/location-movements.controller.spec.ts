import { Test, TestingModule } from '@nestjs/testing';
import { ThrottlerModule } from '@nestjs/throttler';
import { NotFoundException } from '@nestjs/common';
import { LocationMovementsController } from './location-movements.controller';
import { LocationMovementsService } from './location-movements.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import {
  CreateLocationMovementDto,
  UpdateLocationMovementDto,
  LocationMovementType,
} from './dto';
import type { CurrentUser } from '../auth/decorators/current-user.decorator';

describe('LocationMovementsController', () => {
  let controller: LocationMovementsController;
  let locationMovementsService: jest.Mocked<LocationMovementsService>;

  const mockCurrentUser: CurrentUser = {
    id: 'user-1',
    email: 'test@example.com',
    name: 'Test User',
    companyId: 'company-1',
    mainUser: false,
    permissions: {},
    company: {},
  };

  const mockLocationMovement = {
    id: 'movement-1',
    companyId: 'company-1',
    propertyId: 'property-1',
    locationIds: ['location-1'],
    employeeIds: ['employee-1'],
    serviceProviderIds: ['sp-1'],
    type: LocationMovementType.FEED_DELIVERY,
    date: '2025-01-15T00:00:00.000Z',
    observation: 'Test observation',
    fileIds: ['file-1'],
    createdAt: '2025-01-15T00:00:00.000Z',
    updatedAt: '2025-01-15T00:00:00.000Z',
  };

  const mockCreateLocationMovementDto: CreateLocationMovementDto = {
    propertyId: 'property-1',
    locationIds: ['location-1'],
    employeeIds: ['employee-1'],
    serviceProviderIds: ['sp-1'],
    type: LocationMovementType.FEED_DELIVERY,
    date: '2025-01-15',
    observation: 'Test observation',
    fileIds: ['file-1'],
  };

  beforeEach(async () => {
    const mockLocationMovementsService = {
      create: jest.fn(),
      findAllForCompany: jest.fn(),
      findOne: jest.fn(),
      findByLocationId: jest.fn(),
      findByPropertyId: jest.fn(),
      findByEmployeeId: jest.fn(),
      findByServiceProviderId: jest.fn(),
      findByType: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      imports: [ThrottlerModule.forRoot()],
      controllers: [LocationMovementsController],
      providers: [
        {
          provide: LocationMovementsService,
          useValue: mockLocationMovementsService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(PermissionsGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<LocationMovementsController>(
      LocationMovementsController,
    );
    locationMovementsService = module.get(LocationMovementsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create a location movement successfully', async () => {
      locationMovementsService.create.mockResolvedValue(mockLocationMovement);

      const result = await controller.create(
        mockCurrentUser,
        mockCreateLocationMovementDto,
      );

      expect(locationMovementsService.create).toHaveBeenCalledWith(
        mockCurrentUser.id,
        mockCreateLocationMovementDto,
      );
      expect(result).toEqual(mockLocationMovement);
    });
  });

  describe('findAllForCompany', () => {
    it('should return all location movements', async () => {
      locationMovementsService.findAllForCompany.mockResolvedValue([
        mockLocationMovement,
      ]);

      const result = await controller.findAllForCompany(mockCurrentUser);

      expect(locationMovementsService.findAllForCompany).toHaveBeenCalledWith(
        mockCurrentUser.id,
      );
      expect(result).toEqual([mockLocationMovement]);
    });
  });

  describe('findOne', () => {
    it('should return location movement by ID', async () => {
      locationMovementsService.findOne.mockResolvedValue(mockLocationMovement);

      const result = await controller.findOne(mockCurrentUser, 'movement-1');

      expect(locationMovementsService.findOne).toHaveBeenCalledWith(
        mockCurrentUser.id,
        'movement-1',
      );
      expect(result).toEqual(mockLocationMovement);
    });

    it('should throw NotFoundException if movement not found', async () => {
      locationMovementsService.findOne.mockRejectedValue(
        new NotFoundException('Location movement not found'),
      );

      await expect(
        controller.findOne(mockCurrentUser, 'movement-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update location movement successfully', async () => {
      const updateDto: UpdateLocationMovementDto = {
        observation: 'Updated observation',
      };

      const updatedMovement = {
        ...mockLocationMovement,
        observation: 'Updated observation',
      };

      locationMovementsService.update.mockResolvedValue(updatedMovement);

      const result = await controller.update(
        mockCurrentUser,
        'movement-1',
        updateDto,
      );

      expect(locationMovementsService.update).toHaveBeenCalledWith(
        mockCurrentUser.id,
        'movement-1',
        updateDto,
      );
      expect(result).toEqual(updatedMovement);
    });
  });

  describe('remove', () => {
    it('should remove location movement successfully', async () => {
      locationMovementsService.remove.mockResolvedValue(undefined);

      await controller.remove(mockCurrentUser, 'movement-1');

      expect(locationMovementsService.remove).toHaveBeenCalledWith(
        mockCurrentUser.id,
        'movement-1',
      );
    });
  });
});
