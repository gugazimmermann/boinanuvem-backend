import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { LocationsService } from './locations.service';
import { PrismaService } from '../common/services/prisma.service';
import { CreateLocationDto, UpdateLocationDto } from './dto';

describe('LocationsService', () => {
  let service: LocationsService;
  let prismaService: jest.Mocked<PrismaService>;

  const mockUser = {
    id: 'user-1',
    companyId: 'company-1',
  };

  const mockProperty = {
    id: 'property-1',
    code: '001',
    name: 'Fazenda do Juca',
    companyId: 'company-1',
    deletedAt: null,
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
    const mockPrismaService = {
      user: {
        findUnique: jest.fn(),
      },
      property: {
        findFirst: jest.fn(),
      },
      location: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LocationsService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<LocationsService>(LocationsService);
    prismaService = module.get(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a location successfully', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.property.findFirst.mockResolvedValue(mockProperty);
      prismaService.location.findFirst.mockResolvedValue(null);
      prismaService.location.create.mockResolvedValue(mockLocation);

      const result = await service.create(mockUser.id, mockCreateLocationDto);

      expect(prismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: mockUser.id },
        select: { companyId: true },
      });
      expect(prismaService.property.findFirst).toHaveBeenCalledWith({
        where: {
          id: mockCreateLocationDto.propertyId,
          companyId: mockUser.companyId,
          deletedAt: null,
        },
      });
      expect(prismaService.location.findFirst).toHaveBeenCalledWith({
        where: {
          companyId: mockUser.companyId,
          propertyId: mockCreateLocationDto.propertyId,
          code: mockCreateLocationDto.code,
          deletedAt: null,
        },
      });
      expect(prismaService.location.create).toHaveBeenCalled();
      expect(result).toEqual(mockLocation);
    });

    it('should throw ConflictException if location code already exists', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.property.findFirst.mockResolvedValue(mockProperty);
      prismaService.location.findFirst.mockResolvedValue(mockLocation);

      await expect(
        service.create(mockUser.id, mockCreateLocationDto),
      ).rejects.toThrow(ConflictException);

      expect(prismaService.location.create).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException if user not found', async () => {
      prismaService.user.findUnique.mockResolvedValue(null);

      await expect(
        service.create(mockUser.id, mockCreateLocationDto),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if property not found', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.property.findFirst.mockResolvedValue(null);

      await expect(
        service.create(mockUser.id, mockCreateLocationDto),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('findAll', () => {
    it('should return all locations for user company', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.location.findMany.mockResolvedValue([mockLocation]);

      const result = await service.findAll(mockUser.id);

      expect(prismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: mockUser.id },
        select: { companyId: true },
      });
      expect(prismaService.location.findMany).toHaveBeenCalledWith({
        where: {
          companyId: mockUser.companyId,
          deletedAt: null,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });
      expect(result).toEqual([mockLocation]);
    });

    it('should filter by propertyId when provided', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.property.findFirst.mockResolvedValue(mockProperty);
      prismaService.location.findMany.mockResolvedValue([mockLocation]);

      const result = await service.findAll(mockUser.id, 'property-1');

      expect(prismaService.property.findFirst).toHaveBeenCalledWith({
        where: {
          id: 'property-1',
          companyId: mockUser.companyId,
          deletedAt: null,
        },
      });
      expect(prismaService.location.findMany).toHaveBeenCalledWith({
        where: {
          companyId: mockUser.companyId,
          deletedAt: null,
          propertyId: 'property-1',
        },
        orderBy: {
          createdAt: 'desc',
        },
      });
      expect(result).toEqual([mockLocation]);
    });

    it('should exclude soft-deleted locations', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.location.findMany.mockResolvedValue([]);

      await service.findAll(mockUser.id);

      expect(prismaService.location.findMany).toHaveBeenCalledWith({
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

    it('should throw NotFoundException if property not found when filtering', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.property.findFirst.mockResolvedValue(null);

      await expect(
        service.findAll(mockUser.id, 'invalid-property'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('findOne', () => {
    it('should return a location by id', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.location.findFirst.mockResolvedValue(mockLocation);

      const result = await service.findOne(mockUser.id, mockLocation.id);

      expect(prismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: mockUser.id },
        select: { companyId: true },
      });
      expect(prismaService.location.findFirst).toHaveBeenCalledWith({
        where: {
          id: mockLocation.id,
          companyId: mockUser.companyId,
          deletedAt: null,
        },
      });
      expect(result).toEqual(mockLocation);
    });

    it('should throw NotFoundException if location not found', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.location.findFirst.mockResolvedValue(null);

      await expect(
        service.findOne(mockUser.id, mockLocation.id),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if user not found', async () => {
      prismaService.user.findUnique.mockResolvedValue(null);

      await expect(
        service.findOne(mockUser.id, mockLocation.id),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    const updateDto: UpdateLocationDto = {
      name: 'Updated Name',
      status: 'inactive',
    };

    it('should update a location successfully', async () => {
      const updatedLocation = { ...mockLocation, ...updateDto };

      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.location.findFirst.mockResolvedValue(mockLocation);
      prismaService.location.update.mockResolvedValue(updatedLocation);

      const result = await service.update(
        mockUser.id,
        mockLocation.id,
        updateDto,
      );

      expect(prismaService.location.update).toHaveBeenCalled();
      expect(result).toEqual(updatedLocation);
    });

    it('should throw NotFoundException if location not found', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.location.findFirst.mockResolvedValue(null);

      await expect(
        service.update(mockUser.id, mockLocation.id, updateDto),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException if code conflicts', async () => {
      const updateWithCode: UpdateLocationDto = {
        code: '002',
      };

      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.location.findFirst
        .mockResolvedValueOnce(mockLocation) // Exists
        .mockResolvedValueOnce({ ...mockLocation, id: 'other-id' }); // Code conflict

      await expect(
        service.update(mockUser.id, mockLocation.id, updateWithCode),
      ).rejects.toThrow(ConflictException);
    });

    it('should validate property when propertyId is updated', async () => {
      const updateWithProperty: UpdateLocationDto = {
        propertyId: 'property-2',
      };

      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.location.findFirst.mockResolvedValueOnce(mockLocation);
      prismaService.property.findFirst.mockResolvedValue({
        ...mockProperty,
        id: 'property-2',
      });
      prismaService.location.update.mockResolvedValue({
        ...mockLocation,
        propertyId: 'property-2',
      });

      await service.update(mockUser.id, mockLocation.id, updateWithProperty);

      expect(prismaService.property.findFirst).toHaveBeenCalledWith({
        where: {
          id: 'property-2',
          companyId: mockUser.companyId,
          deletedAt: null,
        },
      });
    });

    it('should not check code conflict if code is not being updated', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.location.findFirst.mockResolvedValueOnce(mockLocation);
      prismaService.location.update.mockResolvedValue(mockLocation);

      await service.update(mockUser.id, mockLocation.id, updateDto);

      expect(prismaService.location.findFirst).toHaveBeenCalledTimes(1);
    });
  });

  describe('remove', () => {
    it('should soft delete a location', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.location.findFirst.mockResolvedValue(mockLocation);
      prismaService.location.update.mockResolvedValue({
        ...mockLocation,
        deletedAt: new Date(),
      });

      const result = await service.remove(mockUser.id, mockLocation.id);

      expect(prismaService.location.findFirst).toHaveBeenCalledWith({
        where: {
          id: mockLocation.id,
          companyId: mockUser.companyId,
          deletedAt: null,
        },
      });
      expect(prismaService.location.update).toHaveBeenCalledWith({
        where: { id: mockLocation.id },
        data: {
          deletedAt: expect.any(Date),
        },
      });
      expect(result).toEqual({ message: 'Location deleted successfully' });
    });

    it('should throw NotFoundException if location not found', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.location.findFirst.mockResolvedValue(null);

      await expect(
        service.remove(mockUser.id, mockLocation.id),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if user not found', async () => {
      prismaService.user.findUnique.mockResolvedValue(null);

      await expect(
        service.remove(mockUser.id, mockLocation.id),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
