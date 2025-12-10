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
  });
});
