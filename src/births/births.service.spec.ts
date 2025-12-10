import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { BirthsService } from './births.service';
import { PrismaService } from '../common/services/prisma.service';
import { CreateBirthDto, UpdateBirthDto, BirthPurity } from './dto';

describe('BirthsService', () => {
  let service: BirthsService;
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

  const mockMother = {
    ...mockAnimal,
    id: 'mother-1',
    code: 'M001',
  };

  const mockFather = {
    ...mockAnimal,
    id: 'father-1',
    code: 'F001',
  };

  const mockBirth = {
    id: 'birth-1',
    animalId: 'animal-1',
    birthDate: new Date('2020-01-15'),
    breed: 'nelore',
    gender: 'male',
    motherId: 'mother-1',
    fatherId: 'father-1',
    purity: 'po',
    observation: 'Healthy birth',
    companyId: 'company-1',
    deletedAt: null,
    createdAt: new Date('2020-01-15'),
    updatedAt: new Date('2020-01-15'),
  };

  const mockCreateBirthDto: CreateBirthDto = {
    code: '001',
    registrationNumber: 'BR-2020-FJ0001',
    propertyId: 'property-1',
    birthDate: '2020-01-15',
    breed: 'nelore',
    gender: 'male',
    motherId: 'mother-1',
    fatherId: 'father-1',
    observation: 'Healthy birth',
  };

  const mockProperty = {
    id: 'property-1',
    companyId: 'company-1',
  };

  beforeEach(async () => {
    const mockPrismaService = {
      user: {
        findUnique: jest.fn(),
      },
      animal: {
        findFirst: jest.fn(),
        create: jest.fn(),
      },
      birth: {
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      property: {
        findFirst: jest.fn(),
      },
      $transaction: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BirthsService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<BirthsService>(BirthsService);
    prismaService = module.get(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a birth record and animal successfully', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.property.findFirst.mockResolvedValue(mockProperty);
      // Order: validate mother, validate father, check existing code
      prismaService.animal.findFirst
        .mockResolvedValueOnce(mockMother) // Validate mother
        .mockResolvedValueOnce(mockFather) // Validate father
        .mockResolvedValueOnce(null); // Check for existing animal code
      prismaService.birth.findUnique
        .mockResolvedValueOnce(null) // No existing birth for mother
        .mockResolvedValueOnce(null); // No existing birth for father

      prismaService.$transaction.mockImplementation(async (callback) => {
        return callback({
          animal: {
            create: jest.fn().mockResolvedValue(mockAnimal),
          },
          birth: {
            create: jest.fn().mockResolvedValue(mockBirth),
          },
        });
      });

      const result = await service.create(mockUser.id, mockCreateBirthDto);

      expect(prismaService.$transaction).toHaveBeenCalled();
      expect(result).toBeDefined();
      expect(result.animalId).toBe(mockBirth.animalId);
    });

    it('should throw ConflictException if animal code already exists', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.property.findFirst.mockResolvedValue(mockProperty);
      prismaService.animal.findFirst.mockResolvedValue(mockAnimal);

      await expect(
        service.create(mockUser.id, mockCreateBirthDto),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw NotFoundException if property not found', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.property.findFirst.mockResolvedValue(null);

      await expect(
        service.create(mockUser.id, mockCreateBirthDto),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if mother not found', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.property.findFirst.mockResolvedValue(mockProperty);
      prismaService.animal.findFirst
        .mockResolvedValueOnce(null) // No existing animal code
        .mockResolvedValueOnce(null); // Mother not found

      await expect(
        service.create(mockUser.id, mockCreateBirthDto),
      ).rejects.toThrow(NotFoundException);
    });

    it('should calculate purity when not provided', async () => {
      const dtoWithoutPurity: CreateBirthDto = {
        ...mockCreateBirthDto,
        purity: undefined,
      };

      const motherBirth = {
        ...mockBirth,
        id: 'mother-birth-1',
        animalId: 'mother-1',
        purity: 'po',
      };

      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.property.findFirst.mockResolvedValue(mockProperty);
      // Order: validate mother, validate father, check existing code
      prismaService.animal.findFirst
        .mockResolvedValueOnce(mockMother) // Validate mother
        .mockResolvedValueOnce(mockFather) // Validate father
        .mockResolvedValueOnce(null); // Check for existing animal code
      prismaService.birth.findUnique
        .mockResolvedValueOnce(motherBirth) // Mother birth
        .mockResolvedValueOnce(null); // Father birth

      prismaService.$transaction.mockImplementation(async (callback) => {
        return callback({
          animal: {
            create: jest.fn().mockResolvedValue(mockAnimal),
          },
          birth: {
            create: jest.fn().mockResolvedValue({
              ...mockBirth,
              purity: 'f1',
            }),
          },
        });
      });

      const result = await service.create(mockUser.id, dtoWithoutPurity);

      expect(result).toBeDefined();
    });

    it('should handle parent birth record with null breed', async () => {
      const dtoWithoutPurity: CreateBirthDto = {
        ...mockCreateBirthDto,
        purity: undefined,
      };

      const motherBirth = {
        ...mockBirth,
        id: 'mother-birth-1',
        animalId: 'mother-1',
        purity: 'po',
        breed: null,
      };

      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.property.findFirst.mockResolvedValue(mockProperty);
      // Order: validate mother, validate father, check existing code
      prismaService.animal.findFirst
        .mockResolvedValueOnce(mockMother) // Validate mother
        .mockResolvedValueOnce(mockFather) // Validate father
        .mockResolvedValueOnce(null); // Check for existing animal code
      prismaService.birth.findUnique
        .mockResolvedValueOnce(motherBirth) // Mother birth with null breed
        .mockResolvedValueOnce(null); // Father birth

      prismaService.$transaction.mockImplementation(async (callback) => {
        return callback({
          animal: {
            create: jest.fn().mockResolvedValue(mockAnimal),
          },
          birth: {
            create: jest.fn().mockResolvedValue({
              ...mockBirth,
              purity: 'f1',
            }),
          },
        });
      });

      const result = await service.create(mockUser.id, dtoWithoutPurity);

      expect(result).toBeDefined();
    });

    it('should handle father birth record with null breed', async () => {
      const dtoWithoutPurity: CreateBirthDto = {
        ...mockCreateBirthDto,
        purity: undefined,
      };

      const fatherBirth = {
        ...mockBirth,
        id: 'father-birth-1',
        animalId: 'father-1',
        purity: 'po',
        breed: null,
      };

      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.property.findFirst.mockResolvedValue(mockProperty);
      // Order: validate mother, validate father, check existing code
      prismaService.animal.findFirst
        .mockResolvedValueOnce(mockMother) // Validate mother
        .mockResolvedValueOnce(mockFather) // Validate father
        .mockResolvedValueOnce(null); // Check for existing animal code
      prismaService.birth.findUnique
        .mockResolvedValueOnce(null) // No mother birth
        .mockResolvedValueOnce(fatherBirth); // Father birth with null breed

      prismaService.$transaction.mockImplementation(async (callback) => {
        return callback({
          animal: {
            create: jest.fn().mockResolvedValue(mockAnimal),
          },
          birth: {
            create: jest.fn().mockResolvedValue({
              ...mockBirth,
              purity: 'f1',
            }),
          },
        });
      });

      const result = await service.create(mockUser.id, dtoWithoutPurity);

      expect(result).toBeDefined();
    });
  });

  describe('findAll', () => {
    it('should return all birth records for user company', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.birth.findMany.mockResolvedValue([mockBirth]);

      const result = await service.findAll(mockUser.id);

      expect(prismaService.birth.findMany).toHaveBeenCalledWith({
        where: {
          companyId: mockUser.companyId,
          deletedAt: null,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(mockBirth.id);
    });

    it('should throw NotFoundException if user not found', async () => {
      prismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.findAll(mockUser.id)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findOne', () => {
    it('should return a birth record by id', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.birth.findFirst.mockResolvedValue(mockBirth);

      const result = await service.findOne(mockUser.id, mockBirth.id);

      expect(result).toBeDefined();
      expect(result.id).toBe(mockBirth.id);
    });

    it('should throw NotFoundException if birth not found', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.birth.findFirst.mockResolvedValue(null);

      await expect(service.findOne(mockUser.id, mockBirth.id)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findByAnimalId', () => {
    it('should return a birth record by animal id', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.animal.findFirst.mockResolvedValue(mockAnimal);
      prismaService.birth.findUnique.mockResolvedValue(mockBirth);

      const result = await service.findByAnimalId(mockUser.id, mockAnimal.id);

      expect(result).toBeDefined();
      expect(result.animalId).toBe(mockAnimal.id);
    });

    it('should throw NotFoundException if animal not found', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.animal.findFirst.mockResolvedValue(null);

      await expect(
        service.findByAnimalId(mockUser.id, mockAnimal.id),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if birth not found for animal', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.animal.findFirst.mockResolvedValue(mockAnimal);
      prismaService.birth.findUnique.mockResolvedValue(null);

      await expect(
        service.findByAnimalId(mockUser.id, mockAnimal.id),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if birth belongs to different company', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.animal.findFirst.mockResolvedValue(mockAnimal);
      const birthFromOtherCompany = {
        ...mockBirth,
        companyId: 'other-company-id',
      };
      prismaService.birth.findUnique.mockResolvedValue(birthFromOtherCompany);

      await expect(
        service.findByAnimalId(mockUser.id, mockAnimal.id),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if birth is soft-deleted', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.animal.findFirst.mockResolvedValue(mockAnimal);
      const deletedBirth = {
        ...mockBirth,
        deletedAt: new Date(),
      };
      prismaService.birth.findUnique.mockResolvedValue(deletedBirth);

      await expect(
        service.findByAnimalId(mockUser.id, mockAnimal.id),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    const updateDto: UpdateBirthDto = {
      observation: 'Updated observation',
    };

    it('should update a birth record successfully', async () => {
      const updatedBirth = { ...mockBirth, ...updateDto };

      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.birth.findFirst.mockResolvedValue(mockBirth);
      prismaService.birth.update.mockResolvedValue(updatedBirth);

      const result = await service.update(mockUser.id, mockBirth.id, updateDto);

      expect(prismaService.birth.update).toHaveBeenCalled();
      expect(result.observation).toBe(updateDto.observation);
    });

    it('should throw NotFoundException if birth not found', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.birth.findFirst.mockResolvedValue(null);

      await expect(
        service.update(mockUser.id, mockBirth.id, updateDto),
      ).rejects.toThrow(NotFoundException);
    });

    it('should validate mother if being updated', async () => {
      const updateWithMother: UpdateBirthDto = {
        motherId: 'new-mother-1',
      };

      const newMother = { ...mockMother, id: 'new-mother-1' };

      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.birth.findFirst.mockResolvedValue(mockBirth);
      prismaService.animal.findFirst.mockResolvedValue(newMother);
      prismaService.birth.update.mockResolvedValue({
        ...mockBirth,
        ...updateWithMother,
      });

      await service.update(mockUser.id, mockBirth.id, updateWithMother);

      expect(prismaService.animal.findFirst).toHaveBeenCalledWith({
        where: {
          id: 'new-mother-1',
          companyId: mockUser.companyId,
          deletedAt: null,
        },
      });
    });

    it('should validate father if being updated', async () => {
      const updateWithFather: UpdateBirthDto = {
        fatherId: 'new-father-1',
      };

      const newFather = { ...mockFather, id: 'new-father-1' };

      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.birth.findFirst.mockResolvedValue(mockBirth);
      prismaService.animal.findFirst.mockResolvedValue(newFather);
      prismaService.birth.update.mockResolvedValue({
        ...mockBirth,
        ...updateWithFather,
      });

      await service.update(mockUser.id, mockBirth.id, updateWithFather);

      expect(prismaService.animal.findFirst).toHaveBeenCalledWith({
        where: {
          id: 'new-father-1',
          companyId: mockUser.companyId,
          deletedAt: null,
        },
      });
    });

    it('should update birthDate', async () => {
      const updateWithDate: UpdateBirthDto = {
        birthDate: '2020-02-20',
      };

      const updatedBirth = {
        ...mockBirth,
        birthDate: new Date('2020-02-20'),
      };

      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.birth.findFirst.mockResolvedValue(mockBirth);
      prismaService.birth.update.mockResolvedValue(updatedBirth);

      const result = await service.update(
        mockUser.id,
        mockBirth.id,
        updateWithDate,
      );

      expect(prismaService.birth.update).toHaveBeenCalledWith({
        where: { id: mockBirth.id },
        data: {
          birthDate: new Date('2020-02-20'),
        },
      });
      expect(result.birthDate).toEqual(new Date('2020-02-20'));
    });

    it('should update with null values for motherId', async () => {
      const updateWithNullMother: UpdateBirthDto = {
        motherId: null,
      };

      const updatedBirth = {
        ...mockBirth,
        motherId: null,
      };

      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.birth.findFirst.mockResolvedValue(mockBirth);
      prismaService.birth.update.mockResolvedValue(updatedBirth);

      const result = await service.update(
        mockUser.id,
        mockBirth.id,
        updateWithNullMother,
      );

      expect(prismaService.birth.update).toHaveBeenCalledWith({
        where: { id: mockBirth.id },
        data: {
          motherId: null,
        },
      });
      expect(result.motherId).toBeUndefined();
    });

    it('should update with null values for fatherId', async () => {
      const updateWithNullFather: UpdateBirthDto = {
        fatherId: null,
      };

      const updatedBirth = {
        ...mockBirth,
        fatherId: null,
      };

      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.birth.findFirst.mockResolvedValue(mockBirth);
      prismaService.birth.update.mockResolvedValue(updatedBirth);

      const result = await service.update(
        mockUser.id,
        mockBirth.id,
        updateWithNullFather,
      );

      expect(prismaService.birth.update).toHaveBeenCalledWith({
        where: { id: mockBirth.id },
        data: {
          fatherId: null,
        },
      });
      expect(result.fatherId).toBeUndefined();
    });

    it('should update with null values for observation', async () => {
      const updateWithNullObservation: UpdateBirthDto = {
        observation: null,
      };

      const updatedBirth = {
        ...mockBirth,
        observation: null,
      };

      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.birth.findFirst.mockResolvedValue(mockBirth);
      prismaService.birth.update.mockResolvedValue(updatedBirth);

      const result = await service.update(
        mockUser.id,
        mockBirth.id,
        updateWithNullObservation,
      );

      expect(prismaService.birth.update).toHaveBeenCalledWith({
        where: { id: mockBirth.id },
        data: {
          observation: null,
        },
      });
      expect(result.observation).toBeUndefined();
    });

    it('should update multiple fields including null values', async () => {
      const updateMultiple: UpdateBirthDto = {
        breed: 'angus',
        gender: 'female',
        motherId: null,
        fatherId: null,
        observation: null,
      };

      const updatedBirth = {
        ...mockBirth,
        ...updateMultiple,
      };

      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.birth.findFirst.mockResolvedValue(mockBirth);
      prismaService.birth.update.mockResolvedValue(updatedBirth);

      const result = await service.update(
        mockUser.id,
        mockBirth.id,
        updateMultiple,
      );

      expect(prismaService.birth.update).toHaveBeenCalled();
      expect(result.breed).toBe('angus');
      expect(result.gender).toBe('female');
      expect(result.motherId).toBeUndefined();
      expect(result.fatherId).toBeUndefined();
      expect(result.observation).toBeUndefined();
    });
  });

  describe('remove', () => {
    it('should soft delete a birth record', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.birth.findFirst.mockResolvedValue(mockBirth);
      prismaService.birth.update.mockResolvedValue({
        ...mockBirth,
        deletedAt: new Date(),
      });

      const result = await service.remove(mockUser.id, mockBirth.id);

      expect(prismaService.birth.update).toHaveBeenCalledWith({
        where: { id: mockBirth.id },
        data: {
          deletedAt: expect.any(Date),
        },
      });
      expect(result).toEqual({ message: 'Birth record deleted successfully' });
    });

    it('should throw NotFoundException if birth not found', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.birth.findFirst.mockResolvedValue(null);

      await expect(service.remove(mockUser.id, mockBirth.id)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('purity calculation', () => {
    it('should return PO when no parents provided', () => {
      const purity = (service as any).calculatePurity(null, null);
      expect(purity).toBe(BirthPurity.PO);
    });

    it('should return F1 when parents are PO with different breeds', () => {
      const motherBirth = { purity: BirthPurity.PO };
      const fatherBirth = { purity: BirthPurity.PO };
      const purity = (service as any).calculatePurity(
        motherBirth,
        fatherBirth,
        'nelore',
        'angus',
      );
      expect(purity).toBe(BirthPurity.F1);
    });

    it('should return PO when parents are PO with same breed', () => {
      const motherBirth = { purity: BirthPurity.PO };
      const fatherBirth = { purity: BirthPurity.PO };
      const purity = (service as any).calculatePurity(
        motherBirth,
        fatherBirth,
        'nelore',
        'nelore',
      );
      expect(purity).toBe(BirthPurity.PO);
    });

    it('should return F2 when PO and F1 combination', () => {
      const motherBirth = { purity: BirthPurity.PO };
      const fatherBirth = { purity: BirthPurity.F1 };
      const purity = (service as any).calculatePurity(motherBirth, fatherBirth);
      expect(purity).toBe(BirthPurity.F2);
    });

    it('should return F2 when F1 and F1 combination', () => {
      const motherBirth = { purity: BirthPurity.F1 };
      const fatherBirth = { purity: BirthPurity.F1 };
      const purity = (service as any).calculatePurity(motherBirth, fatherBirth);
      expect(purity).toBe(BirthPurity.F2);
    });

    it('should return F3 when PO and F2 combination', () => {
      const motherBirth = { purity: BirthPurity.PO };
      const fatherBirth = { purity: BirthPurity.F2 };
      const purity = (service as any).calculatePurity(motherBirth, fatherBirth);
      expect(purity).toBe(BirthPurity.F3);
    });

    it('should return F3 when F2 and PO combination', () => {
      const motherBirth = { purity: BirthPurity.F2 };
      const fatherBirth = { purity: BirthPurity.PO };
      const purity = (service as any).calculatePurity(motherBirth, fatherBirth);
      expect(purity).toBe(BirthPurity.F3);
    });

    it('should return F4 when PO and F3 combination', () => {
      const motherBirth = { purity: BirthPurity.PO };
      const fatherBirth = { purity: BirthPurity.F3 };
      const purity = (service as any).calculatePurity(motherBirth, fatherBirth);
      expect(purity).toBe(BirthPurity.F4);
    });

    it('should return F4 when F3 and PO combination', () => {
      const motherBirth = { purity: BirthPurity.F3 };
      const fatherBirth = { purity: BirthPurity.PO };
      const purity = (service as any).calculatePurity(motherBirth, fatherBirth);
      expect(purity).toBe(BirthPurity.F4);
    });

    it('should return F5 when PO and F4 combination', () => {
      const motherBirth = { purity: BirthPurity.PO };
      const fatherBirth = { purity: BirthPurity.F4 };
      const purity = (service as any).calculatePurity(motherBirth, fatherBirth);
      expect(purity).toBe(BirthPurity.F5);
    });

    it('should return F5 when F4 and PO combination', () => {
      const motherBirth = { purity: BirthPurity.F4 };
      const fatherBirth = { purity: BirthPurity.PO };
      const purity = (service as any).calculatePurity(motherBirth, fatherBirth);
      expect(purity).toBe(BirthPurity.F5);
    });

    it('should return PC when PO and F5 combination', () => {
      const motherBirth = { purity: BirthPurity.PO };
      const fatherBirth = { purity: BirthPurity.F5 };
      const purity = (service as any).calculatePurity(motherBirth, fatherBirth);
      expect(purity).toBe(BirthPurity.PC);
    });

    it('should return PC when F5 and PO combination', () => {
      const motherBirth = { purity: BirthPurity.F5 };
      const fatherBirth = { purity: BirthPurity.PO };
      const purity = (service as any).calculatePurity(motherBirth, fatherBirth);
      expect(purity).toBe(BirthPurity.PC);
    });

    it('should return PC when mother is PC', () => {
      const motherBirth = { purity: BirthPurity.PC };
      const fatherBirth = { purity: BirthPurity.PO };
      const purity = (service as any).calculatePurity(motherBirth, fatherBirth);
      expect(purity).toBe(BirthPurity.PC);
    });

    it('should return PC when father is PC', () => {
      const motherBirth = { purity: BirthPurity.PO };
      const fatherBirth = { purity: BirthPurity.PC };
      const purity = (service as any).calculatePurity(motherBirth, fatherBirth);
      expect(purity).toBe(BirthPurity.PC);
    });

    it('should return F1 when one parent missing and purity is null', () => {
      const motherBirth = { purity: null };
      const fatherBirth = null;
      const purity = (service as any).calculatePurity(motherBirth, fatherBirth);
      expect(purity).toBe(BirthPurity.F1);
    });

    it('should return F1 when one parent missing and no purity available', () => {
      const motherBirth = null;
      const fatherBirth = { purity: null };
      const purity = (service as any).calculatePurity(motherBirth, fatherBirth);
      expect(purity).toBe(BirthPurity.F1);
    });

    it('should return null when getPurityWhenOneMissing has no available purity', () => {
      const result = (service as any).getPurityWhenOneMissing(null, null);
      expect(result).toBe(BirthPurity.PO);
    });

    it('should return null when getPurityWhenOneMissing has father missing but no purity', () => {
      const motherBirth = { purity: null };
      const fatherBirth = null;
      const result = (service as any).getPurityWhenOneMissing(
        motherBirth,
        fatherBirth,
      );
      expect(result).toBeNull();
    });

    it('should return null when getPurityWhenBothPresent has null purity', () => {
      const motherBirth = { purity: null };
      const fatherBirth = { purity: BirthPurity.PO };
      const result = (service as any).getPurityWhenBothPresent(
        motherBirth,
        fatherBirth,
      );
      expect(result).toBeNull();
    });

    it('should return null when getPurityWhenBothPresent has father with null purity', () => {
      const motherBirth = { purity: BirthPurity.PO };
      const fatherBirth = { purity: null };
      const result = (service as any).getPurityWhenBothPresent(
        motherBirth,
        fatherBirth,
      );
      expect(result).toBeNull();
    });

    it('should return null when checkPOAndF5OrPCCombination has no matching combination', () => {
      const result = (service as any).checkPOAndF5OrPCCombination(
        BirthPurity.F1,
        BirthPurity.F2,
      );
      expect(result).toBeNull();
    });

    it('should return null when getNextPurity is called with PC', () => {
      const nextPurity = (service as any).getNextPurity(BirthPurity.PC);
      expect(nextPurity).toBeNull();
    });

    it('should return F1 when getNextPurity is called with PO', () => {
      const nextPurity = (service as any).getNextPurity(BirthPurity.PO);
      expect(nextPurity).toBe(BirthPurity.F1);
    });
  });

  describe('helper methods', () => {
    it('should not add key when addIfDefined receives null value', () => {
      const data: Record<string, unknown> = {};
      (service as any).addIfDefined(data, 'testKey', null);
      expect(data).not.toHaveProperty('testKey');
    });

    it('should not add key when addIfDefined receives undefined value', () => {
      const data: Record<string, unknown> = {};
      (service as any).addIfDefined(data, 'testKey', undefined);
      expect(data).not.toHaveProperty('testKey');
    });

    it('should add key when addIfDefined receives valid value', () => {
      const data: Record<string, unknown> = {};
      (service as any).addIfDefined(data, 'testKey', 'testValue');
      expect(data.testKey).toBe('testValue');
    });

    it('should add key with null when addIfNotUndefined receives null value', () => {
      const data: Record<string, unknown> = {};
      (service as any).addIfNotUndefined(data, 'testKey', null);
      expect(data.testKey).toBeNull();
    });

    it('should not add key when addIfNotUndefined receives undefined value', () => {
      const data: Record<string, unknown> = {};
      (service as any).addIfNotUndefined(data, 'testKey', undefined);
      expect(data).not.toHaveProperty('testKey');
    });

    it('should add key when addIfNotUndefined receives valid value', () => {
      const data: Record<string, unknown> = {};
      (service as any).addIfNotUndefined(data, 'testKey', 'testValue');
      expect(data.testKey).toBe('testValue');
    });
  });
});
