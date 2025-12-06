import { Test, TestingModule } from '@nestjs/testing';
import { ThrottlerModule } from '@nestjs/throttler';
import { PropertiesController } from './properties.controller';
import { PropertiesService } from './properties.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { CreatePropertyDto, UpdatePropertyDto } from './dto';
import type { CurrentUser } from '../auth/decorators/current-user.decorator';

describe('PropertiesController', () => {
  let controller: PropertiesController;
  let propertiesService: jest.Mocked<PropertiesService>;

  const mockCurrentUser: CurrentUser = {
    id: 'user-1',
    email: 'test@example.com',
    companyId: 'company-1',
    mainUser: false,
  };

  const mockProperty = {
    id: 'property-1',
    code: '001',
    name: 'Fazenda do Juca',
    area: { value: 150.5, type: 'hectares' },
    status: 'active',
    companyId: 'company-1',
    street: 'Rua Simão Piaz',
    number: 'SN',
    complement: 'Fazenda do Juca',
    neighborhood: 'LIMOEIRO',
    city: 'São João do Itaperiú',
    state: 'SC',
    zipCode: '88395-000',
    latitude: -26.559317100277863,
    longitude: -48.75873810994559,
    pasturePlanning: null,
    breedingMonths: null,
    pasturePlanningModifiedByUser: false,
    breedingSeasonModifiedByUser: false,
    createdAt: new Date('2025-01-15'),
    updatedAt: new Date('2025-01-15'),
  };

  const mockCreatePropertyDto: CreatePropertyDto = {
    code: '001',
    name: 'Fazenda do Juca',
    area: { value: 150.5, type: 'hectares' },
    status: 'active',
    street: 'Rua Simão Piaz',
    number: 'SN',
    complement: 'Fazenda do Juca',
    neighborhood: 'LIMOEIRO',
    city: 'São João do Itaperiú',
    state: 'SC',
    zipCode: '88395-000',
    latitude: -26.559317100277863,
    longitude: -48.75873810994559,
  };

  beforeEach(async () => {
    const mockPropertiesService = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      imports: [ThrottlerModule.forRoot()],
      controllers: [PropertiesController],
      providers: [
        {
          provide: PropertiesService,
          useValue: mockPropertiesService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(PermissionsGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<PropertiesController>(PropertiesController);
    propertiesService = module.get(PropertiesService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create a property', async () => {
      propertiesService.create.mockResolvedValue(mockProperty);

      const result = await controller.create(
        mockCurrentUser,
        mockCreatePropertyDto,
      );

      expect(propertiesService.create).toHaveBeenCalledWith(
        mockCurrentUser.id,
        mockCreatePropertyDto,
      );
      expect(result).toEqual(mockProperty);
    });
  });

  describe('findAll', () => {
    it('should return all properties', async () => {
      propertiesService.findAll.mockResolvedValue([mockProperty]);

      const result = await controller.findAll(mockCurrentUser);

      expect(propertiesService.findAll).toHaveBeenCalledWith(
        mockCurrentUser.id,
      );
      expect(result).toEqual([mockProperty]);
    });
  });

  describe('findOne', () => {
    it('should return a property by id', async () => {
      propertiesService.findOne.mockResolvedValue(mockProperty);

      const result = await controller.findOne(mockCurrentUser, mockProperty.id);

      expect(propertiesService.findOne).toHaveBeenCalledWith(
        mockCurrentUser.id,
        mockProperty.id,
      );
      expect(result).toEqual(mockProperty);
    });
  });

  describe('update', () => {
    it('should update a property', async () => {
      const updateDto: UpdatePropertyDto = {
        name: 'Updated Name',
      };
      const updatedProperty = { ...mockProperty, ...updateDto };

      propertiesService.update.mockResolvedValue(updatedProperty);

      const result = await controller.update(
        mockCurrentUser,
        mockProperty.id,
        updateDto,
      );

      expect(propertiesService.update).toHaveBeenCalledWith(
        mockCurrentUser.id,
        mockProperty.id,
        updateDto,
      );
      expect(result).toEqual(updatedProperty);
    });
  });

  describe('remove', () => {
    it('should soft delete a property', async () => {
      propertiesService.remove.mockResolvedValue({
        message: 'Property deleted successfully',
      });

      const result = await controller.remove(mockCurrentUser, mockProperty.id);

      expect(propertiesService.remove).toHaveBeenCalledWith(
        mockCurrentUser.id,
        mockProperty.id,
      );
      expect(result).toEqual({ message: 'Property deleted successfully' });
    });
  });
});
