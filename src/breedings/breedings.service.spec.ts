import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { BreedingsService } from './breedings.service';
import { PrismaService } from '../common/services/prisma.service';
import { CreateBreedingDto, UpdateBreedingDto, BreedingMethod } from './dto';

describe('BreedingsService', () => {
  let service: BreedingsService;
  let prismaService: jest.Mocked<PrismaService>;

  const mockUser = {
    id: 'user-1',
    companyId: 'company-1',
  };

  const mockAnimal = {
    id: 'animal-1',
    code: '001',
    companyId: 'company-1',
    deletedAt: null,
  };

  const mockBreeding = {
    id: 'breeding-1',
    animalId: 'animal-1',
    date: new Date('2025-01-15'),
    method: BreedingMethod.NATURAL,
    bullId: 'bull-1',
    attemptNumber: null,
    semenCode: null,
    confirmed: false,
    observation: 'Test breeding',
    companyId: 'company-1',
    employeeIds: null,
    serviceProviderIds: null,
    createdAt: new Date('2025-01-15'),
    updatedAt: new Date('2025-01-15'),
  };

  const mockCreateBreedingDto: CreateBreedingDto = {
    animalId: 'animal-1',
    date: '2025-01-15',
    method: BreedingMethod.NATURAL,
    bullId: 'bull-1',
    observation: 'Test breeding',
  };

  beforeEach(async () => {
    const mockPrismaService = {
      user: {
        findUnique: jest.fn(),
      },
      animal: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
      },
      breeding: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      birth: {
        findFirst: jest.fn(),
      },
      property: {
        findFirst: jest.fn(),
      },
      employee: {
        findMany: jest.fn(),
      },
      serviceProvider: {
        findMany: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BreedingsService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<BreedingsService>(BreedingsService);
    prismaService = module.get(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a breeding successfully', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.animal.findFirst.mockResolvedValue(mockAnimal);
      prismaService.animal.findFirst.mockResolvedValueOnce(mockAnimal); // For bull validation
      prismaService.breeding.create.mockResolvedValue(mockBreeding);

      const result = await service.create(mockUser.id, mockCreateBreedingDto);

      expect(prismaService.breeding.create).toHaveBeenCalled();
      expect(result).toBeDefined();
      expect(result.id).toBe('breeding-1');
    });

    it('should throw NotFoundException if animal not found', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.animal.findFirst.mockResolvedValue(null);

      await expect(
        service.create(mockUser.id, mockCreateBreedingDto),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if bull not found', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.animal.findFirst
        .mockResolvedValueOnce(mockAnimal) // For animal validation
        .mockResolvedValueOnce(null); // For bull validation

      await expect(
        service.create(mockUser.id, mockCreateBreedingDto),
      ).rejects.toThrow(NotFoundException);
    });

    it('should validate employees if provided', async () => {
      const dtoWithEmployees = {
        ...mockCreateBreedingDto,
        employeeIds: ['employee-1'],
      };
      const mockEmployee = { id: 'employee-1', companyId: 'company-1' };

      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.animal.findFirst.mockResolvedValue(mockAnimal);
      prismaService.employee.findMany.mockResolvedValue([mockEmployee]);
      prismaService.breeding.create.mockResolvedValue(mockBreeding);

      await service.create(mockUser.id, dtoWithEmployees);

      expect(prismaService.employee.findMany).toHaveBeenCalled();
    });

    it('should throw NotFoundException if employee not found', async () => {
      const dtoWithEmployees = {
        ...mockCreateBreedingDto,
        employeeIds: ['employee-1'],
      };

      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.animal.findFirst.mockResolvedValue(mockAnimal);
      prismaService.employee.findMany.mockResolvedValue([]);

      await expect(
        service.create(mockUser.id, dtoWithEmployees),
      ).rejects.toThrow(NotFoundException);
    });

    it('should validate service providers if provided', async () => {
      const dtoWithProviders = {
        ...mockCreateBreedingDto,
        serviceProviderIds: ['provider-1'],
      };
      const mockProvider = { id: 'provider-1', companyId: 'company-1' };

      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.animal.findFirst.mockResolvedValue(mockAnimal);
      prismaService.serviceProvider.findMany.mockResolvedValue([mockProvider]);
      prismaService.breeding.create.mockResolvedValue(mockBreeding);

      await service.create(mockUser.id, dtoWithProviders);

      expect(prismaService.serviceProvider.findMany).toHaveBeenCalled();
    });

    it('should create without bullId', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.animal.findFirst.mockResolvedValue(mockAnimal);
      prismaService.breeding.create.mockResolvedValue({
        ...mockBreeding,
        bullId: null,
      });

      const dtoWithoutBull: CreateBreedingDto = {
        animalId: 'animal-1',
        date: '2025-01-15',
        method: BreedingMethod.ARTIFICIAL,
      };

      await service.create(mockUser.id, dtoWithoutBull);

      expect(prismaService.animal.findFirst).toHaveBeenCalledTimes(1); // Only for animal, not bull
      expect(prismaService.breeding.create).toHaveBeenCalled();
    });

    it('should create without employeeIds and serviceProviderIds', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.animal.findFirst.mockResolvedValue(mockAnimal);
      prismaService.breeding.create.mockResolvedValue({
        ...mockBreeding,
        employeeIds: null,
        serviceProviderIds: null,
      });

      const dtoWithoutRelations: CreateBreedingDto = {
        animalId: 'animal-1',
        date: '2025-01-15',
        method: BreedingMethod.NATURAL,
        bullId: 'bull-1',
      };

      await service.create(mockUser.id, dtoWithoutRelations);

      expect(prismaService.employee.findMany).not.toHaveBeenCalled();
      expect(prismaService.serviceProvider.findMany).not.toHaveBeenCalled();
      expect(prismaService.breeding.create).toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('should return all breedings for company', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.breeding.findMany.mockResolvedValue([mockBreeding]);

      const result = await service.findAll(mockUser.id);

      expect(prismaService.breeding.findMany).toHaveBeenCalledWith({
        where: {
          companyId: 'company-1',
          deletedAt: null,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });
      expect(result).toHaveLength(1);
    });
  });

  describe('findOne', () => {
    it('should return breeding by ID', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.breeding.findFirst.mockResolvedValue(mockBreeding);

      const result = await service.findOne(mockUser.id, 'breeding-1');

      expect(result).toBeDefined();
      expect(result.id).toBe('breeding-1');
    });

    it('should throw NotFoundException if breeding not found', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.breeding.findFirst.mockResolvedValue(null);

      await expect(service.findOne(mockUser.id, 'breeding-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findByAnimalId', () => {
    it('should return breedings for animal', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.animal.findFirst.mockResolvedValue(mockAnimal);
      prismaService.breeding.findMany.mockResolvedValue([mockBreeding]);

      const result = await service.findByAnimalId(mockUser.id, 'animal-1');

      expect(result).toHaveLength(1);
    });

    it('should throw NotFoundException if animal not found', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.animal.findFirst.mockResolvedValue(null);

      await expect(
        service.findByAnimalId(mockUser.id, 'animal-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update breeding successfully', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.breeding.findFirst.mockResolvedValue(mockBreeding);
      prismaService.breeding.update.mockResolvedValue({
        ...mockBreeding,
        observation: 'Updated observation',
      });

      const updateDto: UpdateBreedingDto = {
        observation: 'Updated observation',
      };

      const result = await service.update(mockUser.id, 'breeding-1', updateDto);

      expect(prismaService.breeding.update).toHaveBeenCalled();
      expect(result.observation).toBe('Updated observation');
    });

    it('should validate animal if being updated', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.breeding.findFirst.mockResolvedValue(mockBreeding);
      prismaService.animal.findFirst.mockResolvedValue(mockAnimal);
      prismaService.breeding.update.mockResolvedValue(mockBreeding);

      const updateDto: UpdateBreedingDto = {
        animalId: 'animal-2',
      };

      await service.update(mockUser.id, 'breeding-1', updateDto);

      expect(prismaService.animal.findFirst).toHaveBeenCalled();
    });

    it('should update with all optional fields', async () => {
      const mockEmployees = [{ id: 'employee-1', companyId: 'company-1' }];
      const mockServiceProviders = [{ id: 'sp-1', companyId: 'company-1' }];

      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.breeding.findFirst.mockResolvedValue(mockBreeding);
      prismaService.animal.findFirst.mockResolvedValue(mockAnimal);
      prismaService.employee.findMany.mockResolvedValue(mockEmployees);
      prismaService.serviceProvider.findMany.mockResolvedValue(
        mockServiceProviders,
      );
      prismaService.breeding.update.mockResolvedValue(mockBreeding);

      const updateDto: UpdateBreedingDto = {
        animalId: 'animal-2',
        date: '2025-01-20',
        method: BreedingMethod.ARTIFICIAL,
        bullId: 'bull-2',
        attemptNumber: 2,
        semenCode: 'SEM001',
        confirmed: true,
        observation: 'Updated',
        employeeIds: ['employee-1'],
        serviceProviderIds: ['sp-1'],
      };

      await service.update(mockUser.id, 'breeding-1', updateDto);

      expect(prismaService.breeding.update).toHaveBeenCalled();
    });

    it('should update with empty employeeIds array', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.breeding.findFirst.mockResolvedValue(mockBreeding);
      prismaService.breeding.update.mockResolvedValue(mockBreeding);

      const updateDto: UpdateBreedingDto = {
        employeeIds: [],
      };

      await service.update(mockUser.id, 'breeding-1', updateDto);

      expect(prismaService.employee.findMany).not.toHaveBeenCalled();
      expect(prismaService.breeding.update).toHaveBeenCalled();
    });

    it('should update with empty serviceProviderIds array', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.breeding.findFirst.mockResolvedValue(mockBreeding);
      prismaService.breeding.update.mockResolvedValue(mockBreeding);

      const updateDto: UpdateBreedingDto = {
        serviceProviderIds: [],
      };

      await service.update(mockUser.id, 'breeding-1', updateDto);

      expect(prismaService.serviceProvider.findMany).not.toHaveBeenCalled();
      expect(prismaService.breeding.update).toHaveBeenCalled();
    });
  });

  describe('confirm', () => {
    it('should confirm breeding successfully', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.breeding.findFirst.mockResolvedValue(mockBreeding);
      prismaService.breeding.update.mockResolvedValue({
        ...mockBreeding,
        confirmed: true,
      });

      const result = await service.confirm(mockUser.id, 'breeding-1');

      expect(prismaService.breeding.update).toHaveBeenCalledWith({
        where: { id: 'breeding-1' },
        data: { confirmed: true },
      });
      expect(result.confirmed).toBe(true);
    });
  });

  describe('remove', () => {
    it('should soft delete breeding', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.breeding.findFirst.mockResolvedValue(mockBreeding);
      prismaService.breeding.update.mockResolvedValue({
        ...mockBreeding,
        deletedAt: new Date(),
      });

      await service.remove(mockUser.id, 'breeding-1');

      expect(prismaService.breeding.update).toHaveBeenCalledWith({
        where: { id: 'breeding-1' },
        data: { deletedAt: expect.any(Date) },
      });
    });
  });

  describe('findUnconfirmed', () => {
    it('should return unconfirmed breedings', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.breeding.findMany.mockResolvedValue([mockBreeding]);

      const result = await service.findUnconfirmed(mockUser.id);

      expect(prismaService.breeding.findMany).toHaveBeenCalledWith({
        where: {
          companyId: 'company-1',
          confirmed: false,
          deletedAt: null,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });
      expect(result).toHaveLength(1);
    });
  });

  describe('getNextAttemptNumber', () => {
    it('should return 1 when no breedings exist', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.animal.findFirst.mockResolvedValue(mockAnimal);
      prismaService.birth.findFirst.mockResolvedValue(null);
      prismaService.breeding.findMany.mockResolvedValue([]);

      const result = await service.getNextAttemptNumber(
        mockUser.id,
        'animal-1',
      );

      expect(result).toEqual({ nextAttemptNumber: 1 });
    });

    it('should return next attempt number when no birth exists', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.animal.findFirst.mockResolvedValue(mockAnimal);
      prismaService.birth.findFirst.mockResolvedValue(null);
      prismaService.breeding.findMany.mockResolvedValue([
        {
          attemptNumber: 1,
          date: new Date('2025-01-15'),
        },
        {
          attemptNumber: 2,
          date: new Date('2025-01-20'),
        },
      ]);

      const result = await service.getNextAttemptNumber(
        mockUser.id,
        'animal-1',
      );

      expect(result).toEqual({ nextAttemptNumber: 3 });
    });

    it('should return next attempt number after most recent birth', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.animal.findFirst.mockResolvedValue(mockAnimal);
      prismaService.birth.findFirst.mockResolvedValue({
        birthDate: new Date('2025-01-10'),
      });
      prismaService.breeding.findMany.mockResolvedValue([
        {
          attemptNumber: 1,
          date: new Date('2025-01-15'),
        },
        {
          attemptNumber: 2,
          date: new Date('2025-01-20'),
        },
      ]);

      const result = await service.getNextAttemptNumber(
        mockUser.id,
        'animal-1',
      );

      expect(result).toEqual({ nextAttemptNumber: 3 });
    });

    it('should return 1 when no breedings after birth', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.animal.findFirst.mockResolvedValue(mockAnimal);
      prismaService.birth.findFirst.mockResolvedValue({
        birthDate: new Date('2025-01-20'),
      });
      prismaService.breeding.findMany.mockResolvedValue([
        {
          attemptNumber: 1,
          date: new Date('2025-01-15'),
        },
      ]);

      const result = await service.getNextAttemptNumber(
        mockUser.id,
        'animal-1',
      );

      expect(result).toEqual({ nextAttemptNumber: 1 });
    });

    it('should handle null attempt numbers', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.animal.findFirst.mockResolvedValue(mockAnimal);
      prismaService.birth.findFirst.mockResolvedValue(null);
      prismaService.breeding.findMany.mockResolvedValue([
        {
          attemptNumber: null,
          date: new Date('2025-01-15'),
        },
        {
          attemptNumber: 2,
          date: new Date('2025-01-20'),
        },
      ]);

      const result = await service.getNextAttemptNumber(
        mockUser.id,
        'animal-1',
      );

      expect(result).toEqual({ nextAttemptNumber: 3 });
    });

    it('should throw NotFoundException if animal not found', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.animal.findFirst.mockResolvedValue(null);

      await expect(
        service.getNextAttemptNumber(mockUser.id, 'animal-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('isAnimalPregnant', () => {
    it('should return true when animal has confirmed breeding', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.animal.findFirst.mockResolvedValue(mockAnimal);
      prismaService.breeding.findFirst.mockResolvedValue({
        ...mockBreeding,
        confirmed: true,
      });

      const result = await service.isAnimalPregnant(mockUser.id, 'animal-1');

      expect(result).toEqual({ isPregnant: true });
    });

    it('should return false when animal has no confirmed breeding', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.animal.findFirst.mockResolvedValue(mockAnimal);
      prismaService.breeding.findFirst.mockResolvedValue(null);

      const result = await service.isAnimalPregnant(mockUser.id, 'animal-1');

      expect(result).toEqual({ isPregnant: false });
    });

    it('should throw NotFoundException if animal not found', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.animal.findFirst.mockResolvedValue(null);

      await expect(
        service.isAnimalPregnant(mockUser.id, 'animal-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getMostRecentConfirmedBreeding', () => {
    it('should return most recent confirmed breeding', async () => {
      const confirmedBreeding = {
        ...mockBreeding,
        confirmed: true,
      };
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.animal.findFirst.mockResolvedValue(mockAnimal);
      prismaService.breeding.findFirst.mockResolvedValue(confirmedBreeding);

      const result = await service.getMostRecentConfirmedBreeding(
        mockUser.id,
        'animal-1',
      );

      expect(result).toBeDefined();
      expect(result?.confirmed).toBe(true);
    });

    it('should return null when no confirmed breeding exists', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.animal.findFirst.mockResolvedValue(mockAnimal);
      prismaService.breeding.findFirst.mockResolvedValue(null);

      const result = await service.getMostRecentConfirmedBreeding(
        mockUser.id,
        'animal-1',
      );

      expect(result).toBeNull();
    });

    it('should throw NotFoundException if animal not found', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.animal.findFirst.mockResolvedValue(null);

      await expect(
        service.getMostRecentConfirmedBreeding(mockUser.id, 'animal-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('findByPropertyId', () => {
    const mockProperty = {
      id: 'property-1',
      companyId: 'company-1',
      deletedAt: null,
    };

    it('should return breedings for property', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.property.findFirst.mockResolvedValue(mockProperty);
      prismaService.animal.findMany.mockResolvedValue([
        { id: 'animal-1' },
        { id: 'animal-2' },
      ]);
      prismaService.breeding.findMany.mockResolvedValue([mockBreeding]);

      const result = await service.findByPropertyId(mockUser.id, 'property-1');

      expect(result).toHaveLength(1);
    });

    it('should return empty array when property has no animals', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.property.findFirst.mockResolvedValue(mockProperty);
      prismaService.animal.findMany.mockResolvedValue([]);

      const result = await service.findByPropertyId(mockUser.id, 'property-1');

      expect(result).toEqual([]);
    });

    it('should throw NotFoundException if property not found', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.property.findFirst.mockResolvedValue(null);

      await expect(
        service.findByPropertyId(mockUser.id, 'property-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getPregnantAnimalsByProperty', () => {
    const mockProperty = {
      id: 'property-1',
      companyId: 'company-1',
      deletedAt: null,
    };

    it('should return pregnant animal IDs', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.property.findFirst.mockResolvedValue(mockProperty);
      prismaService.animal.findMany.mockResolvedValue([
        { id: 'animal-1' },
        { id: 'animal-2' },
      ]);
      prismaService.breeding.findMany.mockResolvedValue([
        { animalId: 'animal-1' },
        { animalId: 'animal-2' },
      ]);

      const result = await service.getPregnantAnimalsByProperty(
        mockUser.id,
        'property-1',
      );

      expect(result.animalIds).toHaveLength(2);
    });

    it('should return empty array when no pregnant animals exist', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.property.findFirst.mockResolvedValue(mockProperty);
      prismaService.animal.findMany.mockResolvedValue([{ id: 'animal-1' }]);
      prismaService.breeding.findMany.mockResolvedValue([]);

      const result = await service.getPregnantAnimalsByProperty(
        mockUser.id,
        'property-1',
      );

      expect(result.animalIds).toEqual([]);
    });

    it('should throw NotFoundException if property not found', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.property.findFirst.mockResolvedValue(null);

      await expect(
        service.getPregnantAnimalsByProperty(mockUser.id, 'property-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('unconfirmMostRecentBreeding', () => {
    it('should unconfirm most recent breeding', async () => {
      const confirmedBreeding = {
        ...mockBreeding,
        confirmed: true,
      };
      const unconfirmedBreeding = {
        ...mockBreeding,
        confirmed: false,
      };

      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.animal.findFirst.mockResolvedValue(mockAnimal);
      prismaService.breeding.findFirst.mockResolvedValue(confirmedBreeding);
      prismaService.breeding.update.mockResolvedValue(unconfirmedBreeding);

      const result = await service.unconfirmMostRecentBreeding(
        mockUser.id,
        'animal-1',
      );

      expect(prismaService.breeding.update).toHaveBeenCalledWith({
        where: { id: confirmedBreeding.id },
        data: { confirmed: false },
      });
      expect(result.confirmed).toBe(false);
    });

    it('should throw NotFoundException if animal not found', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.animal.findFirst.mockResolvedValue(null);

      await expect(
        service.unconfirmMostRecentBreeding(mockUser.id, 'animal-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if no confirmed breeding exists', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.animal.findFirst.mockResolvedValue(mockAnimal);
      prismaService.breeding.findFirst.mockResolvedValue(null);

      await expect(
        service.unconfirmMostRecentBreeding(mockUser.id, 'animal-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('transform methods', () => {
    it('should transform with null JSON fields', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      const breedingWithNulls = {
        ...mockBreeding,
        employeeIds: null,
        serviceProviderIds: null,
      };
      prismaService.breeding.findFirst.mockResolvedValue(breedingWithNulls);

      const result = await service.findOne(mockUser.id, 'breeding-1');

      expect(result.employeeIds).toEqual([]);
      expect(result.serviceProviderIds).toEqual([]);
    });

    it('should transform with JSON string fields', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      const breedingWithJson = {
        ...mockBreeding,
        employeeIds: JSON.stringify(['employee-1', 'employee-2']),
        serviceProviderIds: JSON.stringify(['sp-1']),
      };
      prismaService.breeding.findFirst.mockResolvedValue(breedingWithJson);

      const result = await service.findOne(mockUser.id, 'breeding-1');

      expect(result.employeeIds).toEqual(['employee-1', 'employee-2']);
      expect(result.serviceProviderIds).toEqual(['sp-1']);
    });
  });
});
