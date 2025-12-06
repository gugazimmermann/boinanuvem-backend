import { Test, TestingModule } from '@nestjs/testing';
import { ThrottlerModule } from '@nestjs/throttler';
import { LocationsController } from './locations.controller';
import { LocationsService } from './locations.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { CreateLocationDto, UpdateLocationDto } from './dto';
import type { CurrentUser } from '../auth/decorators/current-user.decorator';

describe('LocationsController', () => {
  let controller: LocationsController;
  let locationsService: jest.Mocked<LocationsService>;

  const mockCurrentUser: CurrentUser = {
    id: 'user-1',
    email: 'test@example.com',
    companyId: 'company-1',
    mainUser: false,
  };

  const mockLocation = {
    id: 'location-1',
    code: '001',
    name: 'Pasto Norte',
    locationType: 'pasture',
    area: { value: 28.5, type: 'hectares' },
    status: 'active',
    companyId: 'company-1',
    propertyId: 'property-1',
    createdAt: new Date('2025-01-20'),
    updatedAt: new Date('2025-01-20'),
  };

  const mockCreateLocationDto: CreateLocationDto = {
    code: '001',
    name: 'Pasto Norte',
    locationType: 'pasture',
    area: { value: 28.5, type: 'hectares' },
    status: 'active',
    propertyId: 'property-1',
  };

  beforeEach(async () => {
    const mockLocationsService = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      imports: [ThrottlerModule.forRoot()],
      controllers: [LocationsController],
      providers: [
        {
          provide: LocationsService,
          useValue: mockLocationsService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(PermissionsGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<LocationsController>(LocationsController);
    locationsService = module.get(LocationsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create a location', async () => {
      locationsService.create.mockResolvedValue(mockLocation);

      const result = await controller.create(
        mockCurrentUser,
        mockCreateLocationDto,
      );

      expect(locationsService.create).toHaveBeenCalledWith(
        mockCurrentUser.id,
        mockCreateLocationDto,
      );
      expect(result).toEqual(mockLocation);
    });
  });

  describe('findAll', () => {
    it('should return all locations', async () => {
      locationsService.findAll.mockResolvedValue([mockLocation]);

      const result = await controller.findAll(mockCurrentUser);

      expect(locationsService.findAll).toHaveBeenCalledWith(
        mockCurrentUser.id,
        undefined,
      );
      expect(result).toEqual([mockLocation]);
    });

    it('should filter by propertyId when provided', async () => {
      locationsService.findAll.mockResolvedValue([mockLocation]);

      const result = await controller.findAll(mockCurrentUser, 'property-1');

      expect(locationsService.findAll).toHaveBeenCalledWith(
        mockCurrentUser.id,
        'property-1',
      );
      expect(result).toEqual([mockLocation]);
    });
  });

  describe('findOne', () => {
    it('should return a location by id', async () => {
      locationsService.findOne.mockResolvedValue(mockLocation);

      const result = await controller.findOne(mockCurrentUser, mockLocation.id);

      expect(locationsService.findOne).toHaveBeenCalledWith(
        mockCurrentUser.id,
        mockLocation.id,
      );
      expect(result).toEqual(mockLocation);
    });
  });

  describe('update', () => {
    it('should update a location', async () => {
      const updateDto: UpdateLocationDto = {
        name: 'Updated Name',
      };
      const updatedLocation = { ...mockLocation, ...updateDto };

      locationsService.update.mockResolvedValue(updatedLocation);

      const result = await controller.update(
        mockCurrentUser,
        mockLocation.id,
        updateDto,
      );

      expect(locationsService.update).toHaveBeenCalledWith(
        mockCurrentUser.id,
        mockLocation.id,
        updateDto,
      );
      expect(result).toEqual(updatedLocation);
    });
  });

  describe('remove', () => {
    it('should soft delete a location', async () => {
      locationsService.remove.mockResolvedValue({
        message: 'Location deleted successfully',
      });

      const result = await controller.remove(mockCurrentUser, mockLocation.id);

      expect(locationsService.remove).toHaveBeenCalledWith(
        mockCurrentUser.id,
        mockLocation.id,
      );
      expect(result).toEqual({ message: 'Location deleted successfully' });
    });
  });
});
