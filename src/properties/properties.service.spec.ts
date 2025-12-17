import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { PropertiesService } from './properties.service';
import { PrismaService } from '../common/services/prisma.service';
import { GeocodingService } from '../common/services/geocoding.service';
import { PasturePlanningService } from './services/pasture-planning.service';
import { CreatePropertyDto, UpdatePropertyDto } from './dto';

describe('PropertiesService', () => {
  let service: PropertiesService;
  let prismaService: jest.Mocked<PrismaService>;
  let geocodingService: jest.Mocked<GeocodingService>;
  let pasturePlanningService: jest.Mocked<PasturePlanningService>;

  const mockUser = {
    id: 'user-1',
    companyId: 'company-1',
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
    const mockPrismaService = {
      user: {
        findUnique: jest.fn(),
      },
      property: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
    };

    const mockGeocodingService = {
      geocodeNominatim: jest.fn(),
    };

    const mockPasturePlanningService = {
      computeFromLatLng: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PropertiesService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: GeocodingService, useValue: mockGeocodingService },
        {
          provide: PasturePlanningService,
          useValue: mockPasturePlanningService,
        },
      ],
    }).compile();

    service = module.get<PropertiesService>(PropertiesService);
    prismaService = module.get(PrismaService);
    geocodingService = module.get(GeocodingService);
    pasturePlanningService = module.get(PasturePlanningService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a property successfully', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.property.findFirst.mockResolvedValue(null);
      prismaService.property.create.mockResolvedValue(mockProperty);
      pasturePlanningService.computeFromLatLng.mockResolvedValue({
        pasturePlanning: [],
        breedingMonths: [],
      });

      const result = await service.create(mockUser.id, mockCreatePropertyDto);

      expect(prismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: mockUser.id },
        select: { companyId: true },
      });
      expect(prismaService.property.findFirst).toHaveBeenCalledWith({
        where: {
          companyId: mockUser.companyId,
          code: mockCreatePropertyDto.code,
          deletedAt: null,
        },
      });
      expect(prismaService.property.create).toHaveBeenCalled();
      expect(result).toEqual(mockProperty);
    });

    it('should throw ConflictException if property code already exists', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.property.findFirst.mockResolvedValue(mockProperty);

      await expect(
        service.create(mockUser.id, mockCreatePropertyDto),
      ).rejects.toThrow(ConflictException);

      expect(prismaService.property.create).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException if user not found', async () => {
      prismaService.user.findUnique.mockResolvedValue(null);

      await expect(
        service.create(mockUser.id, mockCreatePropertyDto),
      ).rejects.toThrow(NotFoundException);
    });

    it('should handle optional fields correctly', async () => {
      const dtoWithoutOptional: CreatePropertyDto = {
        ...mockCreatePropertyDto,
        complement: undefined,
        latitude: undefined,
        longitude: undefined,
      };

      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.property.findFirst.mockResolvedValue(null);
      prismaService.property.create.mockResolvedValue(mockProperty);
      geocodingService.geocodeNominatim.mockResolvedValue(null);

      await service.create(mockUser.id, dtoWithoutOptional);

      expect(prismaService.property.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          complement: null,
          latitude: null,
          longitude: null,
          pasturePlanning: expect.anything(),
          breedingMonths: expect.anything(),
        }),
      });
    });

    it('should compute pasture planning and breeding months when missing', async () => {
      const dto: CreatePropertyDto = {
        ...mockCreatePropertyDto,
        pasturePlanning: undefined,
        breedingMonths: undefined,
      };

      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.property.findFirst.mockResolvedValue(null);
      prismaService.property.create.mockResolvedValue(mockProperty);
      pasturePlanningService.computeFromLatLng.mockResolvedValue({
        pasturePlanning: [
          {
            month: 'January',
            min: 10,
            max: 20,
            precipitation: 50,
            classification: 'Medium',
          },
        ],
        breedingMonths: ['April'],
      });

      await service.create(mockUser.id, dto);

      expect(pasturePlanningService.computeFromLatLng).toHaveBeenCalledWith(
        expect.objectContaining({
          latitude: dto.latitude!,
          longitude: dto.longitude!,
        }),
      );
      expect(prismaService.property.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          pasturePlanning: expect.anything(),
          breedingMonths: expect.anything(),
        }),
      });
    });
  });

  describe('findAll', () => {
    it('should return all properties for user company', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.property.findMany.mockResolvedValue([mockProperty]);

      const result = await service.findAll(mockUser.id);

      expect(prismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: mockUser.id },
        select: { companyId: true },
      });
      expect(prismaService.property.findMany).toHaveBeenCalledWith({
        where: {
          companyId: mockUser.companyId,
          deletedAt: null,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });
      expect(result).toEqual([mockProperty]);
    });

    it('should exclude soft-deleted properties', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.property.findMany.mockResolvedValue([]);

      await service.findAll(mockUser.id);

      expect(prismaService.property.findMany).toHaveBeenCalledWith({
        where: {
          companyId: mockUser.companyId,
          deletedAt: null,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });
    });

    it('should throw NotFoundException if user not found', async () => {
      prismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.findAll(mockUser.id)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findOne', () => {
    it('should return a property by id', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.property.findFirst.mockResolvedValue(mockProperty);

      const result = await service.findOne(mockUser.id, mockProperty.id);

      expect(prismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: mockUser.id },
        select: { companyId: true },
      });
      expect(prismaService.property.findFirst).toHaveBeenCalledWith({
        where: {
          id: mockProperty.id,
          companyId: mockUser.companyId,
          deletedAt: null,
        },
      });
      expect(result).toEqual(mockProperty);
    });

    it('should throw NotFoundException if property not found', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.property.findFirst.mockResolvedValue(null);

      await expect(
        service.findOne(mockUser.id, mockProperty.id),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if user not found', async () => {
      prismaService.user.findUnique.mockResolvedValue(null);

      await expect(
        service.findOne(mockUser.id, mockProperty.id),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    const updateDto: UpdatePropertyDto = {
      name: 'Updated Name',
      status: 'inactive',
    };

    it('should update a property successfully', async () => {
      const updatedProperty = { ...mockProperty, ...updateDto };

      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.property.findFirst
        .mockResolvedValueOnce(mockProperty) // First call for existence check
        .mockResolvedValueOnce(null); // Second call for code conflict check
      prismaService.property.update.mockResolvedValue(updatedProperty);

      const result = await service.update(
        mockUser.id,
        mockProperty.id,
        updateDto,
      );

      expect(prismaService.property.update).toHaveBeenCalled();
      expect(result).toEqual(updatedProperty);
    });

    it('should throw NotFoundException if property not found', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.property.findFirst.mockResolvedValue(null);

      await expect(
        service.update(mockUser.id, mockProperty.id, updateDto),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException if code conflicts', async () => {
      const updateWithCode: UpdatePropertyDto = {
        code: '002',
      };

      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.property.findFirst
        .mockResolvedValueOnce(mockProperty) // Exists
        .mockResolvedValueOnce({ ...mockProperty, id: 'other-id' }); // Code conflict

      await expect(
        service.update(mockUser.id, mockProperty.id, updateWithCode),
      ).rejects.toThrow(ConflictException);
    });

    it('should not check code conflict if code is not being updated', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.property.findFirst.mockResolvedValueOnce(mockProperty);
      prismaService.property.update.mockResolvedValue(mockProperty);

      await service.update(mockUser.id, mockProperty.id, updateDto);

      expect(prismaService.property.findFirst).toHaveBeenCalledTimes(1);
    });
  });

  describe('remove', () => {
    it('should soft delete a property', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.property.findFirst.mockResolvedValue(mockProperty);
      prismaService.property.update.mockResolvedValue({
        ...mockProperty,
        deletedAt: new Date(),
      });

      const result = await service.remove(mockUser.id, mockProperty.id);

      expect(prismaService.property.findFirst).toHaveBeenCalledWith({
        where: {
          id: mockProperty.id,
          companyId: mockUser.companyId,
          deletedAt: null,
        },
      });
      expect(prismaService.property.update).toHaveBeenCalledWith({
        where: { id: mockProperty.id },
        data: {
          deletedAt: expect.any(Date),
        },
      });
      expect(result).toEqual({ message: 'Property deleted successfully' });
    });

    it('should throw NotFoundException if property not found', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.property.findFirst.mockResolvedValue(null);

      await expect(
        service.remove(mockUser.id, mockProperty.id),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if user not found', async () => {
      prismaService.user.findUnique.mockResolvedValue(null);

      await expect(
        service.remove(mockUser.id, mockProperty.id),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
