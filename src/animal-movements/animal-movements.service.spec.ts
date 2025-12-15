import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AnimalMovementsService } from './animal-movements.service';
import { PrismaService } from '../common/services/prisma.service';
import { CompanyEntitiesValidationService } from '../common/services/company-entities-validation.service';
import { CreateAnimalMovementDto } from './dto';

describe('AnimalMovementsService', () => {
  let service: AnimalMovementsService;
  let prisma: jest.Mocked<PrismaService>;
  let companyValidation: jest.Mocked<CompanyEntitiesValidationService>;

  const mockUserId = 'user-1';
  const mockCompanyId = 'company-1';

  const mockMovementEntity = {
    id: 'movement-1',
    companyId: mockCompanyId,
    propertyId: 'property-1',
    locationId: 'location-1',
    animalIds: ['animal-1'],
    employeeIds: ['employee-1'],
    serviceProviderIds: ['sp-1'],
    date: new Date('2025-01-15'),
    observation: 'Test',
    fileIds: ['file-1'],
    deletedAt: null,
    createdAt: new Date('2025-01-15'),
    updatedAt: new Date('2025-01-15'),
  } as unknown as Prisma.AnimalMovementGetPayload<Prisma.AnimalMovementDefaultArgs>;

  beforeEach(async () => {
    const mockPrisma: Partial<jest.Mocked<PrismaService>> = {
      animalMovement: {
        create: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
      },
      animal: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
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
        AnimalMovementsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: CompanyEntitiesValidationService, useValue: mockValidation },
      ],
    }).compile();

    service = module.get(AnimalMovementsService);
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
    it('creates an animal movement and returns transformed DTO', async () => {
      const dto: CreateAnimalMovementDto = {
        propertyId: 'property-1',
        locationId: 'location-1',
        animalIds: ['animal-1'],
        employeeIds: ['employee-1'],
        serviceProviderIds: ['sp-1'],
        date: '2025-01-15',
        observation: 'Test',
        fileIds: ['file-1'],
      };

      prisma.animalMovement.create.mockResolvedValue(mockMovementEntity as any);
      prisma.animal.findMany.mockResolvedValue([{ id: 'animal-1' } as any]);

      const result = await service.create(mockUserId, dto);

      expect(companyValidation.getUserCompanyId).toHaveBeenCalledWith(
        mockUserId,
      );
      expect(
        companyValidation.validatePropertyBelongsToCompany,
      ).toHaveBeenCalledWith('property-1', mockCompanyId);
      expect(prisma.animalMovement.create).toHaveBeenCalled();

      expect(result.id).toBe('movement-1');
      expect(result.propertyId).toBe('property-1');
      expect(result.locationId).toBe('location-1');
      expect(result.animalIds).toEqual(['animal-1']);
      expect(result.employeeIds).toEqual(['employee-1']);
      expect(result.serviceProviderIds).toEqual(['sp-1']);
      expect(result.fileIds).toEqual(['file-1']);
    });
  });

  describe('findAllForCompany', () => {
    it('returns all movements for the users company', async () => {
      prisma.animalMovement.findMany.mockResolvedValue([mockMovementEntity]);

      const result = await service.findAllForCompany(mockUserId);

      expect(companyValidation.getUserCompanyId).toHaveBeenCalledWith(
        mockUserId,
      );
      expect(prisma.animalMovement.findMany).toHaveBeenCalledWith({
        where: { companyId: mockCompanyId, deletedAt: null },
        orderBy: { createdAt: 'desc' },
      });
      expect(result).toHaveLength(1);
    });
  });

  describe('findOne', () => {
    it('returns movement by id', async () => {
      prisma.animalMovement.findFirst.mockResolvedValue(mockMovementEntity);

      const result = await service.findOne(mockUserId, 'movement-1');

      expect(result.id).toBe('movement-1');
    });

    it('throws NotFoundException when not found', async () => {
      prisma.animalMovement.findFirst.mockResolvedValue(null as any);

      await expect(service.findOne(mockUserId, 'movement-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findByAnimalId', () => {
    it('filters by animal id', async () => {
      prisma.animal.findFirst.mockResolvedValue({ id: 'animal-1' } as any);
      prisma.animalMovement.findMany.mockResolvedValue([mockMovementEntity]);

      const result = await service.findByAnimalId(mockUserId, 'animal-1');

      expect(result[0].animalIds).toContain('animal-1');
      expect(prisma.animalMovement.findMany).toHaveBeenCalled();
    });
  });

  describe('findByLocationId', () => {
    it('filters by location id', async () => {
      companyValidation.validateLocationBelongsToCompany.mockResolvedValue();
      prisma.animalMovement.findMany.mockResolvedValue([mockMovementEntity]);

      const result = await service.findByLocationId(mockUserId, 'location-1');

      expect(
        companyValidation.validateLocationBelongsToCompany,
      ).toHaveBeenCalledWith('location-1', mockCompanyId);
      expect(result[0].locationId).toBe('location-1');
    });
  });

  describe('findAnimalsByLastMovementLocation', () => {
    it('returns animals whose last movement is to given location', async () => {
      companyValidation.validateLocationBelongsToCompany.mockResolvedValue();

      const olderMovement = {
        ...mockMovementEntity,
        id: 'm1',
        date: new Date('2025-01-10'),
        locationId: 'loc-1',
        animalIds: ['animal-1'],
      } as any;

      const newerMovement = {
        ...mockMovementEntity,
        id: 'm2',
        date: new Date('2025-01-20'),
        locationId: 'loc-2',
        animalIds: ['animal-1'],
      } as any;

      prisma.animalMovement.findMany.mockResolvedValue([
        newerMovement,
        olderMovement,
      ]);

      const result = await service.findAnimalsByLastMovementLocation(
        mockUserId,
        'loc-2',
      );

      expect(result).toContain('animal-1');
    });
  });

  describe('remove', () => {
    it('soft deletes a movement', async () => {
      prisma.animalMovement.findFirst.mockResolvedValue(mockMovementEntity);

      await service.remove(mockUserId, 'movement-1');

      expect(prisma.animalMovement.update).toHaveBeenCalledWith({
        where: { id: 'movement-1' },
        data: { deletedAt: expect.any(Date) },
      });
    });

    it('throws if movement not found', async () => {
      prisma.animalMovement.findFirst.mockResolvedValue(null as any);

      await expect(service.remove(mockUserId, 'movement-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
