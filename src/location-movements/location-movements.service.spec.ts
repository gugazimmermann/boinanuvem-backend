import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { LocationMovementsService } from './location-movements.service';
import { PrismaService } from '../common/services/prisma.service';
import { CompanyEntitiesValidationService } from '../common/services/company-entities-validation.service';
import {
  CreateLocationMovementDto,
  UpdateLocationMovementDto,
  LocationMovementType,
} from './dto';

describe('LocationMovementsService', () => {
  let service: LocationMovementsService;
  let prisma: jest.Mocked<PrismaService>;
  let companyValidation: jest.Mocked<CompanyEntitiesValidationService>;

  const mockUserId = 'user-1';
  const mockCompanyId = 'company-1';

  const mockMovementEntity = {
    id: 'movement-1',
    companyId: mockCompanyId,
    propertyId: 'property-1',
    locationIds: ['location-1'],
    employeeIds: ['employee-1'],
    serviceProviderIds: ['sp-1'],
    type: LocationMovementType.FEED_DELIVERY,
    date: new Date('2025-01-15'),
    observation: 'Test',
    fileIds: ['file-1'],
    deletedAt: null,
    createdAt: new Date('2025-01-15'),
    updatedAt: new Date('2025-01-15'),
  } as any;

  beforeEach(async () => {
    const mockPrisma: Partial<jest.Mocked<PrismaService>> = {
      locationMovement: {
        create: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
        findUnique: jest.fn(),
      },
      location: {
        findMany: jest.fn(),
      },
    } as any;

    const mockValidation: jest.Mocked<CompanyEntitiesValidationService> = {
      getUserCompanyId: jest.fn(),
      validatePropertyBelongsToCompany: jest.fn(),
      validateLocationBelongsToCompany: jest.fn(),
      validateLocationBelongsToCompanyAndProperty: jest.fn(),
      validateEmployeesBelongToCompany: jest.fn(),
      validateEmployeeBelongsToCompany: jest.fn(),
      validateServiceProvidersBelongToCompany: jest.fn(),
      validateServiceProviderBelongsToCompany: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LocationMovementsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: CompanyEntitiesValidationService, useValue: mockValidation },
      ],
    }).compile();

    service = module.get(LocationMovementsService);
    prisma = module.get(PrismaService) as jest.Mocked<PrismaService>;
    companyValidation = module.get(
      CompanyEntitiesValidationService,
    ) as jest.Mocked<CompanyEntitiesValidationService>;

    companyValidation.getUserCompanyId.mockResolvedValue(mockCompanyId);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('creates a location movement and returns transformed DTO', async () => {
      const dto: CreateLocationMovementDto = {
        propertyId: 'property-1',
        locationIds: ['location-1'],
        employeeIds: ['employee-1'],
        serviceProviderIds: ['sp-1'],
        type: LocationMovementType.FEED_DELIVERY,
        date: '2025-01-15',
        observation: 'Test',
        fileIds: ['file-1'],
      };

      prisma.locationMovement.create.mockResolvedValue(mockMovementEntity);
      prisma.location.findMany.mockResolvedValue([{ id: 'location-1' } as any]);

      const result = await service.create(mockUserId, dto);

      expect(companyValidation.getUserCompanyId).toHaveBeenCalledWith(
        mockUserId,
      );
      expect(
        companyValidation.validatePropertyBelongsToCompany,
      ).toHaveBeenCalledWith('property-1', mockCompanyId);
      expect(prisma.locationMovement.create).toHaveBeenCalled();
      expect(result.id).toBe('movement-1');
      expect(result.locationIds).toEqual(['location-1']);
      expect(result.employeeIds).toEqual(['employee-1']);
      expect(result.serviceProviderIds).toEqual(['sp-1']);
      expect(result.fileIds).toEqual(['file-1']);
    });
  });

  describe('findAllForCompany', () => {
    it('returns all movements for the users company', async () => {
      prisma.locationMovement.findMany.mockResolvedValue([mockMovementEntity]);

      const result = await service.findAllForCompany(mockUserId);

      expect(prisma.locationMovement.findMany).toHaveBeenCalledWith({
        where: { companyId: mockCompanyId, deletedAt: null },
        orderBy: { createdAt: 'desc' },
      });
      expect(result).toHaveLength(1);
    });
  });

  describe('findOne', () => {
    it('returns movement by id', async () => {
      prisma.locationMovement.findFirst.mockResolvedValue(mockMovementEntity);

      const result = await service.findOne(mockUserId, 'movement-1');

      expect(result.id).toBe('movement-1');
    });

    it('throws NotFoundException when not found', async () => {
      prisma.locationMovement.findFirst.mockResolvedValue(null as any);

      await expect(service.findOne(mockUserId, 'movement-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findByLocationId', () => {
    it('filters by location id', async () => {
      companyValidation.validateLocationBelongsToCompany.mockResolvedValue();
      prisma.locationMovement.findMany.mockResolvedValue([mockMovementEntity]);

      const result = await service.findByLocationId(mockUserId, 'location-1');

      expect(
        companyValidation.validateLocationBelongsToCompany,
      ).toHaveBeenCalledWith('location-1', mockCompanyId);
      expect(result[0].locationIds).toContain('location-1');
    });
  });

  describe('findByType', () => {
    it('filters by type', async () => {
      prisma.locationMovement.findMany.mockResolvedValue([mockMovementEntity]);

      const result = await service.findByType(
        mockUserId,
        LocationMovementType.FEED_DELIVERY,
      );

      expect(prisma.locationMovement.findMany).toHaveBeenCalledWith({
        where: {
          companyId: mockCompanyId,
          deletedAt: null,
          type: LocationMovementType.FEED_DELIVERY,
        },
        orderBy: { date: 'desc' },
      });
      expect(result[0].type).toBe(LocationMovementType.FEED_DELIVERY);
    });
  });

  describe('update', () => {
    it('updates movement and uses buildUpdateData helpers', async () => {
      prisma.locationMovement.findFirst.mockResolvedValue(mockMovementEntity);
      prisma.locationMovement.findUnique.mockResolvedValue({
        propertyId: 'property-1',
      } as any);
      prisma.location.findMany.mockResolvedValue([
        { id: 'location-1' } as any,
        { id: 'location-2' } as any,
      ]);
      prisma.locationMovement.update.mockResolvedValue({
        ...mockMovementEntity,
        observation: 'Updated',
        locationIds: ['location-1', 'location-2'],
        fileIds: ['file-1', 'file-2'],
      });

      const updateDto: UpdateLocationMovementDto = {
        observation: 'Updated',
        locationIds: ['location-1', 'location-2'],
        fileIds: ['file-1', 'file-2'],
      };

      const result = await service.update(mockUserId, 'movement-1', updateDto);

      expect(prisma.locationMovement.update).toHaveBeenCalled();
      expect(result.observation).toBe('Updated');
      expect(result.locationIds).toEqual(['location-1', 'location-2']);
    });
  });

  describe('remove', () => {
    it('soft deletes a movement', async () => {
      prisma.locationMovement.findFirst.mockResolvedValue(mockMovementEntity);

      await service.remove(mockUserId, 'movement-1');

      expect(prisma.locationMovement.update).toHaveBeenCalledWith({
        where: { id: 'movement-1' },
        data: { deletedAt: expect.any(Date) },
      });
    });

    it('throws if movement not found', async () => {
      prisma.locationMovement.findFirst.mockResolvedValue(null as any);

      await expect(service.remove(mockUserId, 'movement-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
