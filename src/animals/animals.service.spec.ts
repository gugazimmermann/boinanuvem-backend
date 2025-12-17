import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { AnimalsService } from './animals.service';
import { PrismaService } from '../common/services/prisma.service';
import { CreateAnimalDto, UpdateAnimalDto } from './dto';

describe('AnimalsService', () => {
  let service: AnimalsService;
  let prismaService: jest.Mocked<PrismaService>;

  const mockUser = {
    id: 'user-1',
    companyId: 'company-1',
  };

  const mockAnimal = {
    id: 'animal-1',
    code: '001',
    registrationNumber: 'BR-2020-FJ0001',
    acquisitionDate: new Date('2020-01-15'),
    status: 'active',
    companyId: 'company-1',
    propertyId: 'property-1',
    deletedAt: null,
    createdAt: new Date('2020-01-15'),
    updatedAt: new Date('2020-01-15'),
  };

  const mockProperty = {
    id: 'property-1',
    companyId: 'company-1',
    deletedAt: null,
  };

  const mockCreateAnimalDto: CreateAnimalDto = {
    code: '001',
    registrationNumber: 'BR-2020-FJ0001',
    acquisitionDate: '2020-01-15',
    status: 'active',
    propertyId: 'property-1',
  };

  beforeEach(async () => {
    const mockPrismaService = {
      user: {
        findUnique: jest.fn(),
      },
      animal: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      property: {
        findFirst: jest.fn(),
      },
      acquisitionItem: {
        findFirst: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnimalsService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<AnimalsService>(AnimalsService);
    prismaService = module.get(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create an animal successfully', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.property.findFirst.mockResolvedValue(mockProperty);
      prismaService.animal.findFirst.mockResolvedValue(null);
      prismaService.animal.create.mockResolvedValue(mockAnimal);

      const result = await service.create(mockUser.id, mockCreateAnimalDto);

      expect(prismaService.animal.create).toHaveBeenCalled();
      expect(result.id).toBe(mockAnimal.id);
      expect(result.code).toBe(mockAnimal.code);
    });

    it('should create an animal with null acquisitionDate when not provided', async () => {
      const dtoWithoutDate: CreateAnimalDto = {
        ...mockCreateAnimalDto,
        acquisitionDate: undefined,
      };
      const animalWithoutDate = { ...mockAnimal, acquisitionDate: null };

      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.property.findFirst.mockResolvedValue(mockProperty);
      prismaService.animal.findFirst.mockResolvedValue(null);
      prismaService.animal.create.mockResolvedValue(animalWithoutDate);

      const result = await service.create(mockUser.id, dtoWithoutDate);

      expect(prismaService.animal.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          acquisitionDate: null,
        }),
      });
      expect(result.acquisitionDate).toBeUndefined();
    });

    it('should throw ConflictException if code already exists', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.property.findFirst.mockResolvedValue(mockProperty);
      prismaService.animal.findFirst.mockResolvedValue(mockAnimal);

      await expect(
        service.create(mockUser.id, mockCreateAnimalDto),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw NotFoundException if property not found', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.property.findFirst.mockResolvedValue(null);

      await expect(
        service.create(mockUser.id, mockCreateAnimalDto),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if user not found', async () => {
      prismaService.user.findUnique.mockResolvedValue(null);

      await expect(
        service.create(mockUser.id, mockCreateAnimalDto),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('findAll', () => {
    it('should return all animals for user company', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.animal.findMany.mockResolvedValue([mockAnimal]);

      const result = await service.findAll(mockUser.id);

      expect(prismaService.animal.findMany).toHaveBeenCalledWith({
        where: {
          companyId: mockUser.companyId,
          deletedAt: null,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(mockAnimal.id);
    });

    it('should return empty array when no animals exist', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.animal.findMany.mockResolvedValue([]);

      const result = await service.findAll(mockUser.id);

      expect(result).toEqual([]);
    });

    it('should throw NotFoundException if user not found', async () => {
      prismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.findAll(mockUser.id)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findOne', () => {
    it('should return an animal by id', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.animal.findFirst.mockResolvedValue(mockAnimal);

      const result = await service.findOne(mockUser.id, mockAnimal.id);

      expect(result).toBeDefined();
      expect(result.id).toBe(mockAnimal.id);
    });

    it('should throw NotFoundException if animal not found', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.animal.findFirst.mockResolvedValue(null);

      await expect(service.findOne(mockUser.id, mockAnimal.id)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException if user not found', async () => {
      prismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.findOne(mockUser.id, mockAnimal.id)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('should update an animal successfully', async () => {
      const updateDto: UpdateAnimalDto = {
        status: 'inactive',
      };
      const updatedAnimal = { ...mockAnimal, ...updateDto };

      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.animal.findFirst.mockResolvedValue(mockAnimal);
      prismaService.animal.update.mockResolvedValue(updatedAnimal);

      const result = await service.update(
        mockUser.id,
        mockAnimal.id,
        updateDto,
      );

      expect(result.status).toBe(updateDto.status);
    });

    it('should update code and validate conflict when code changes', async () => {
      const updateDto: UpdateAnimalDto = {
        code: '002',
      };
      const updatedAnimal = { ...mockAnimal, code: '002' };

      prismaService.user.findUnique.mockResolvedValue(mockUser);
      // First call: find existing animal
      prismaService.animal.findFirst.mockResolvedValueOnce(mockAnimal);
      // Second call: check for code conflict (no conflict found)
      prismaService.animal.findFirst.mockResolvedValueOnce(null);
      prismaService.animal.update.mockResolvedValue(updatedAnimal);

      const result = await service.update(
        mockUser.id,
        mockAnimal.id,
        updateDto,
      );

      expect(result.code).toBe('002');
    });

    it('should not validate code conflict when code is unchanged', async () => {
      const updateDto: UpdateAnimalDto = {
        code: mockAnimal.code, // Same code
        status: 'inactive',
      };
      const updatedAnimal = { ...mockAnimal, ...updateDto };

      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.animal.findFirst.mockResolvedValue(mockAnimal);
      prismaService.animal.update.mockResolvedValue(updatedAnimal);

      await service.update(mockUser.id, mockAnimal.id, updateDto);

      // Should not call findFirst for code conflict check
      expect(prismaService.animal.findFirst).toHaveBeenCalledTimes(1);
    });

    it('should not validate code conflict when code is undefined', async () => {
      const updateDto: UpdateAnimalDto = {
        status: 'inactive',
      };

      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.animal.findFirst.mockResolvedValue(mockAnimal);
      prismaService.animal.update.mockResolvedValue({
        ...mockAnimal,
        ...updateDto,
      });

      await service.update(mockUser.id, mockAnimal.id, updateDto);

      // Should not call findFirst for code conflict check
      expect(prismaService.animal.findFirst).toHaveBeenCalledTimes(1);
    });

    it('should not validate code conflict when code is null', async () => {
      const updateDto: UpdateAnimalDto = {
        code: null as any,
        status: 'inactive',
      };

      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.animal.findFirst.mockResolvedValue(mockAnimal);
      prismaService.animal.update.mockResolvedValue({
        ...mockAnimal,
        ...updateDto,
      });

      await service.update(mockUser.id, mockAnimal.id, updateDto);

      // Should not call findFirst for code conflict check
      expect(prismaService.animal.findFirst).toHaveBeenCalledTimes(1);
    });

    it('should not validate code conflict when code is empty string', async () => {
      const updateDto: UpdateAnimalDto = {
        code: '',
        status: 'inactive',
      };

      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.animal.findFirst.mockResolvedValue(mockAnimal);
      prismaService.animal.update.mockResolvedValue({
        ...mockAnimal,
        ...updateDto,
      });

      await service.update(mockUser.id, mockAnimal.id, updateDto);

      // Should not call findFirst for code conflict check
      expect(prismaService.animal.findFirst).toHaveBeenCalledTimes(1);
    });

    it('should throw ConflictException when code conflicts', async () => {
      const updateDto: UpdateAnimalDto = {
        code: '002',
      };
      const conflictingAnimal = { id: 'animal-2', code: '002' };

      prismaService.user.findUnique.mockResolvedValue(mockUser);
      // First call: find existing animal
      prismaService.animal.findFirst.mockResolvedValueOnce(mockAnimal);
      // Second call: check for code conflict (conflict found)
      prismaService.animal.findFirst.mockResolvedValueOnce(conflictingAnimal);

      await expect(
        service.update(mockUser.id, mockAnimal.id, updateDto),
      ).rejects.toThrow(ConflictException);
    });

    it('should validate property when propertyId is updated', async () => {
      const updateDto: UpdateAnimalDto = {
        propertyId: 'property-2',
      };
      const newProperty = { ...mockProperty, id: 'property-2' };
      const updatedAnimal = { ...mockAnimal, propertyId: 'property-2' };

      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.animal.findFirst.mockResolvedValue(mockAnimal);
      prismaService.property.findFirst.mockResolvedValue(newProperty);
      prismaService.animal.update.mockResolvedValue(updatedAnimal);

      const result = await service.update(
        mockUser.id,
        mockAnimal.id,
        updateDto,
      );

      expect(prismaService.property.findFirst).toHaveBeenCalled();
      expect(result.propertyId).toBe('property-2');
    });

    it('should throw NotFoundException if property not found during update', async () => {
      const updateDto: UpdateAnimalDto = {
        propertyId: 'non-existent-property',
      };

      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.animal.findFirst.mockResolvedValue(mockAnimal);
      prismaService.property.findFirst.mockResolvedValue(null);

      await expect(
        service.update(mockUser.id, mockAnimal.id, updateDto),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if animal not found', async () => {
      const updateDto: UpdateAnimalDto = {
        status: 'inactive',
      };

      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.animal.findFirst.mockResolvedValue(null);

      await expect(
        service.update(mockUser.id, mockAnimal.id, updateDto),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if user not found', async () => {
      const updateDto: UpdateAnimalDto = {
        status: 'inactive',
      };

      prismaService.user.findUnique.mockResolvedValue(null);

      await expect(
        service.update(mockUser.id, mockAnimal.id, updateDto),
      ).rejects.toThrow(NotFoundException);
    });

    it('should handle update with all fields', async () => {
      const updateDto: UpdateAnimalDto = {
        code: '002',
        registrationNumber: 'BR-2021-FJ0002',
        acquisitionDate: '2021-01-15',
        status: 'inactive',
        propertyId: 'property-2',
      };
      const updatedAnimal = { ...mockAnimal, ...updateDto };

      prismaService.user.findUnique.mockResolvedValue(mockUser);
      // First call: find existing animal
      prismaService.animal.findFirst.mockResolvedValueOnce(mockAnimal);
      // Second call: check for code conflict (no conflict)
      prismaService.animal.findFirst.mockResolvedValueOnce(null);
      prismaService.property.findFirst.mockResolvedValue({
        ...mockProperty,
        id: 'property-2',
      });
      prismaService.animal.update.mockResolvedValue(updatedAnimal);

      const result = await service.update(
        mockUser.id,
        mockAnimal.id,
        updateDto,
      );

      expect(result.code).toBe('002');
      expect(result.status).toBe('inactive');
    });

    it('should handle update with null acquisitionDate', async () => {
      const updateDto: UpdateAnimalDto = {
        acquisitionDate: null as any,
      };
      const updatedAnimal = { ...mockAnimal, acquisitionDate: null };

      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.animal.findFirst.mockResolvedValue(mockAnimal);
      prismaService.animal.update.mockResolvedValue(updatedAnimal);

      const result = await service.update(
        mockUser.id,
        mockAnimal.id,
        updateDto,
      );

      expect(result.acquisitionDate).toBeUndefined();
    });

    it('should handle update with empty string registrationNumber', async () => {
      const updateDto: UpdateAnimalDto = {
        registrationNumber: '',
      };

      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.animal.findFirst.mockResolvedValue(mockAnimal);
      prismaService.animal.update.mockResolvedValue(mockAnimal);

      await service.update(mockUser.id, mockAnimal.id, updateDto);

      // Empty string should not be included in update
      expect(prismaService.animal.update).toHaveBeenCalledWith({
        where: { id: mockAnimal.id },
        data: expect.not.objectContaining({
          registrationNumber: '',
        }),
      });
    });
  });

  describe('remove', () => {
    it('should soft delete an animal', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.animal.findFirst.mockResolvedValue(mockAnimal);
      prismaService.animal.update.mockResolvedValue({
        ...mockAnimal,
        deletedAt: new Date(),
      });

      const result = await service.remove(mockUser.id, mockAnimal.id);

      expect(prismaService.animal.update).toHaveBeenCalledWith({
        where: { id: mockAnimal.id },
        data: {
          deletedAt: expect.any(Date),
        },
      });
      expect(result).toEqual({ message: 'Animal deleted successfully' });
    });

    it('should throw NotFoundException if animal not found', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.animal.findFirst.mockResolvedValue(null);

      await expect(service.remove(mockUser.id, mockAnimal.id)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException if user not found', async () => {
      prismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.remove(mockUser.id, mockAnimal.id)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getUserCompanyId', () => {
    it('should return companyId for valid user', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);

      const result = await (service as any).getUserCompanyId(mockUser.id);

      expect(result).toBe(mockUser.companyId);
    });

    it('should throw NotFoundException if user not found', async () => {
      prismaService.user.findUnique.mockResolvedValue(null);

      await expect(
        (service as any).getUserCompanyId(mockUser.id),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('findAnimalByIdAndCompany', () => {
    it('should return animal when found', async () => {
      prismaService.animal.findFirst.mockResolvedValue(mockAnimal);

      const result = await (service as any).findAnimalByIdAndCompany(
        mockAnimal.id,
        mockUser.companyId,
      );

      expect(result).toEqual(mockAnimal);
    });

    it('should throw NotFoundException when animal not found', async () => {
      prismaService.animal.findFirst.mockResolvedValue(null);

      await expect(
        (service as any).findAnimalByIdAndCompany(
          mockAnimal.id,
          mockUser.companyId,
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('findByCode', () => {
    it('should return animal when code exists', async () => {
      prismaService.animal.findFirst.mockResolvedValue(mockAnimal);

      const result = await (service as any).findByCode(
        mockUser.companyId,
        mockAnimal.code,
      );

      expect(result).toEqual(mockAnimal);
    });

    it('should return null when code does not exist', async () => {
      prismaService.animal.findFirst.mockResolvedValue(null);

      const result = await (service as any).findByCode(
        mockUser.companyId,
        'non-existent-code',
      );

      expect(result).toBeNull();
    });
  });

  describe('validateCodeConflict', () => {
    it('should return early when newCode is empty', async () => {
      await (service as any).validateCodeConflict(
        mockUser.companyId,
        mockAnimal.id,
        '',
        mockAnimal.code,
      );

      expect(prismaService.animal.findFirst).not.toHaveBeenCalled();
    });

    it('should return early when newCode is null', async () => {
      await (service as any).validateCodeConflict(
        mockUser.companyId,
        mockAnimal.id,
        null,
        mockAnimal.code,
      );

      expect(prismaService.animal.findFirst).not.toHaveBeenCalled();
    });

    it('should return early when newCode equals currentCode', async () => {
      await (service as any).validateCodeConflict(
        mockUser.companyId,
        mockAnimal.id,
        mockAnimal.code,
        mockAnimal.code,
      );

      expect(prismaService.animal.findFirst).not.toHaveBeenCalled();
    });

    it('should throw ConflictException when code conflict exists', async () => {
      const conflictingAnimal = { id: 'animal-2', code: '002' };
      prismaService.animal.findFirst.mockResolvedValue(conflictingAnimal);

      await expect(
        (service as any).validateCodeConflict(
          mockUser.companyId,
          mockAnimal.id,
          '002',
          mockAnimal.code,
        ),
      ).rejects.toThrow(ConflictException);
    });

    it('should not throw when no conflict exists', async () => {
      prismaService.animal.findFirst.mockResolvedValue(null);

      await (service as any).validateCodeConflict(
        mockUser.companyId,
        mockAnimal.id,
        '002',
        mockAnimal.code,
      );

      expect(prismaService.animal.findFirst).toHaveBeenCalled();
    });
  });

  describe('validatePropertyBelongsToCompany', () => {
    it('should not throw when property belongs to company', async () => {
      prismaService.property.findFirst.mockResolvedValue(mockProperty);

      await (service as any).validatePropertyBelongsToCompany(
        mockProperty.id,
        mockUser.companyId,
      );

      expect(prismaService.property.findFirst).toHaveBeenCalled();
    });

    it('should throw NotFoundException when property not found', async () => {
      prismaService.property.findFirst.mockResolvedValue(null);

      await expect(
        (service as any).validatePropertyBelongsToCompany(
          'non-existent-property',
          mockUser.companyId,
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('buildUpdateData', () => {
    it('should build update data with all fields', () => {
      const updateDto: UpdateAnimalDto = {
        code: '002',
        registrationNumber: 'BR-2021-FJ0002',
        acquisitionDate: '2021-01-15',
        status: 'inactive',
        propertyId: 'property-2',
      };

      const result = (service as any).buildUpdateData(updateDto);

      expect(result.code).toBe('002');
      expect(result.registrationNumber).toBe('BR-2021-FJ0002');
      expect(result.acquisitionDate).toBeInstanceOf(Date);
      expect(result.status).toBe('inactive');
      expect(result.propertyId).toBe('property-2');
    });

    it('should exclude empty string code', () => {
      const updateDto: UpdateAnimalDto = {
        code: '',
      };

      const result = (service as any).buildUpdateData(updateDto);

      expect(result.code).toBeUndefined();
    });

    it('should exclude null code', () => {
      const updateDto: UpdateAnimalDto = {
        code: null as any,
      };

      const result = (service as any).buildUpdateData(updateDto);

      expect(result.code).toBeUndefined();
    });

    it('should exclude undefined code', () => {
      const updateDto: UpdateAnimalDto = {
        code: undefined,
      };

      const result = (service as any).buildUpdateData(updateDto);

      expect(result.code).toBeUndefined();
    });

    it('should exclude empty string registrationNumber', () => {
      const updateDto: UpdateAnimalDto = {
        registrationNumber: '',
      };

      const result = (service as any).buildUpdateData(updateDto);

      expect(result.registrationNumber).toBeUndefined();
    });

    it('should handle null acquisitionDate', () => {
      const updateDto: UpdateAnimalDto = {
        acquisitionDate: null as any,
      };

      const result = (service as any).buildUpdateData(updateDto);

      expect(result.acquisitionDate).toBeNull();
    });

    it('should handle undefined acquisitionDate', () => {
      const updateDto: UpdateAnimalDto = {
        acquisitionDate: undefined,
      };

      const result = (service as any).buildUpdateData(updateDto);

      expect(result.acquisitionDate).toBeUndefined();
    });

    it('should convert string acquisitionDate to Date', () => {
      const updateDto: UpdateAnimalDto = {
        acquisitionDate: '2021-01-15',
      };

      const result = (service as any).buildUpdateData(updateDto);

      expect(result.acquisitionDate).toBeInstanceOf(Date);
    });
  });

  describe('addIfDefined', () => {
    it('should add value when defined and not null', () => {
      const data: Record<string, unknown> = {};

      (service as any).addIfDefined(data, 'key', 'value');

      expect(data.key).toBe('value');
    });

    it('should not add value when undefined', () => {
      const data: Record<string, unknown> = {};

      (service as any).addIfDefined(data, 'key', undefined);

      expect(data.key).toBeUndefined();
    });

    it('should not add value when null', () => {
      const data: Record<string, unknown> = {};

      (service as any).addIfDefined(data, 'key', null);

      expect(data.key).toBeUndefined();
    });
  });

  describe('transformAnimal', () => {
    it('should transform animal with null acquisitionDate to undefined', () => {
      const animalWithNullDate = { ...mockAnimal, acquisitionDate: null };

      const result = (service as any).transformAnimal(animalWithNullDate);

      expect(result.acquisitionDate).toBeUndefined();
    });

    it('should transform animal with date', () => {
      const result = (service as any).transformAnimal(mockAnimal);

      expect(result.id).toBe(mockAnimal.id);
      expect(result.code).toBe(mockAnimal.code);
      expect(result.registrationNumber).toBe(mockAnimal.registrationNumber);
      expect(result.acquisitionDate).toBe(mockAnimal.acquisitionDate);
      expect(result.status).toBe(mockAnimal.status);
      expect(result.companyId).toBe(mockAnimal.companyId);
      expect(result.propertyId).toBe(mockAnimal.propertyId);
      expect(result.createdAt).toBe(mockAnimal.createdAt);
      expect(result.updatedAt).toBe(mockAnimal.updatedAt);
    });
  });

  describe('findAcquisitionForAnimal', () => {
    const mockAcquisitionItem = {
      id: 'acq-item-1',
      animalId: 'animal-1',
      acquisition: {
        id: 'acq-1',
        companyId: 'company-1',
        propertyId: 'property-1',
        supplierId: 'supplier-1',
        acquisitionDate: new Date('2020-01-15'),
        pricingMode: 'per_animal',
        paymentMethod: 'cash',
        totalPrice: 10000,
        fees: [{ id: 'fee-1', name: 'Transport', amount: 500 }],
        transportationFee: 200,
        handlingFee: 100,
        linkedCashFlowId: 'cashflow-1',
        linkedAccountsPayableId: 'ap-1',
        observation: 'Test observation',
        acquisitionItems: [
          {
            id: 'acq-item-1',
            animalId: 'animal-1',
            price: 5000,
            weight: 350,
            costPerArroba: 142.86,
            breed: 'nelore',
            gender: 'male',
            birthDate: new Date('2019-01-15'),
            motherId: 'mother-1',
            fatherId: 'father-1',
            motherRegistrationNumber: 'M001',
            fatherRegistrationNumber: 'F001',
            purity: 'po',
            birthObservation: 'Birth obs',
            createdAt: new Date('2020-01-15'),
          },
        ],
        createdAt: new Date('2020-01-15'),
        updatedAt: new Date('2020-01-15'),
      },
    };

    it('should return acquisition data for animal', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.animal.findFirst.mockResolvedValue(mockAnimal);
      prismaService.acquisitionItem.findFirst.mockResolvedValue(
        mockAcquisitionItem,
      );

      const result = await service.findAcquisitionForAnimal(
        mockUser.id,
        mockAnimal.id,
      );

      expect(result).toBeDefined();
      expect(result?.id).toBe('acq-1');
      expect(result?.totalPrice).toBe(10000);
      expect(result?.acquisitionItems).toHaveLength(1);
    });

    it('should return null when animal has no acquisition', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.animal.findFirst.mockResolvedValue(mockAnimal);
      prismaService.acquisitionItem.findFirst.mockResolvedValue(null);

      const result = await service.findAcquisitionForAnimal(
        mockUser.id,
        mockAnimal.id,
      );

      expect(result).toBeNull();
    });

    it('should handle Decimal values in prices', async () => {
      const mockDecimal = {
        toNumber: jest.fn().mockReturnValue(5000),
      };
      const itemWithDecimal = {
        ...mockAcquisitionItem,
        acquisition: {
          ...mockAcquisitionItem.acquisition,
          totalPrice: mockDecimal,
        },
      };

      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.animal.findFirst.mockResolvedValue(mockAnimal);
      prismaService.acquisitionItem.findFirst.mockResolvedValue(
        itemWithDecimal,
      );

      const result = await service.findAcquisitionForAnimal(
        mockUser.id,
        mockAnimal.id,
      );

      expect(result?.totalPrice).toBe(5000);
      expect(mockDecimal.toNumber).toHaveBeenCalled();
    });

    it('should handle string values in prices', async () => {
      const itemWithString = {
        ...mockAcquisitionItem,
        acquisition: {
          ...mockAcquisitionItem.acquisition,
          totalPrice: '10000',
        },
      };

      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.animal.findFirst.mockResolvedValue(mockAnimal);
      prismaService.acquisitionItem.findFirst.mockResolvedValue(itemWithString);

      const result = await service.findAcquisitionForAnimal(
        mockUser.id,
        mockAnimal.id,
      );

      expect(result?.totalPrice).toBe(10000);
    });

    it('should handle null fees', async () => {
      const itemWithNullFees = {
        ...mockAcquisitionItem,
        acquisition: {
          ...mockAcquisitionItem.acquisition,
          fees: null,
        },
      };

      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.animal.findFirst.mockResolvedValue(mockAnimal);
      prismaService.acquisitionItem.findFirst.mockResolvedValue(
        itemWithNullFees,
      );

      const result = await service.findAcquisitionForAnimal(
        mockUser.id,
        mockAnimal.id,
      );

      expect(result?.fees).toBeUndefined();
    });

    it('should transform acquisition items correctly', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.animal.findFirst.mockResolvedValue(mockAnimal);
      prismaService.acquisitionItem.findFirst.mockResolvedValue(
        mockAcquisitionItem,
      );

      const result = await service.findAcquisitionForAnimal(
        mockUser.id,
        mockAnimal.id,
      );

      expect(result?.acquisitionItems[0]).toMatchObject({
        id: 'acq-item-1',
        animalId: 'animal-1',
        price: 5000,
        weight: 350,
        costPerArroba: 142.86,
        breed: 'nelore',
        gender: 'male',
        motherId: 'mother-1',
        fatherId: 'father-1',
      });
    });

    it('should throw NotFoundException if animal not found', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.animal.findFirst.mockResolvedValue(null);

      await expect(
        service.findAcquisitionForAnimal(mockUser.id, 'non-existent'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('toNumber', () => {
    it('should return number for number input', () => {
      const result = (service as any).toNumber(42);
      expect(result).toBe(42);
    });

    it('should return undefined for null', () => {
      const result = (service as any).toNumber(null);
      expect(result).toBeUndefined();
    });

    it('should return undefined for undefined', () => {
      const result = (service as any).toNumber(undefined);
      expect(result).toBeUndefined();
    });

    it('should parse string to number', () => {
      const result = (service as any).toNumber('123.45');
      expect(result).toBe(123.45);
    });

    it('should return undefined for invalid string', () => {
      const result = (service as any).toNumber('not-a-number');
      expect(result).toBeUndefined();
    });

    it('should call toNumber method on object', () => {
      const mockDecimal = {
        toNumber: jest.fn().mockReturnValue(100),
      };
      const result = (service as any).toNumber(mockDecimal);
      expect(result).toBe(100);
      expect(mockDecimal.toNumber).toHaveBeenCalled();
    });

    it('should parse bigint to number', () => {
      const result = (service as any).toNumber(BigInt(123));
      expect(result).toBe(123);
    });

    it('should convert boolean true to 1', () => {
      const result = (service as any).toNumber(true);
      expect(result).toBe(1);
    });

    it('should convert boolean false to 0', () => {
      const result = (service as any).toNumber(false);
      expect(result).toBe(0);
    });

    it('should return undefined for objects without toNumber', () => {
      const result = (service as any).toNumber({ some: 'object' });
      expect(result).toBeUndefined();
    });
  });
});
