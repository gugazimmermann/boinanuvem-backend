import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { WeighingsService } from './weighings.service';
import { PrismaService } from '../common/services/prisma.service';
import { CreateWeighingDto, UpdateWeighingDto } from './dto';

describe('WeighingsService', () => {
  let service: WeighingsService;
  let prismaService: jest.Mocked<PrismaService>;

  const mockUser = {
    id: 'user-1',
    companyId: 'company-1',
  };

  const mockAnimal = {
    id: 'animal-1',
    code: '001',
    registrationNumber: 'BR-2020-FJ0001',
    status: 'active',
    companyId: 'company-1',
    propertyId: 'property-1',
    deletedAt: null,
  };

  const mockWeighing = {
    id: 'weighing-1',
    animalId: 'animal-1',
    weighingDate: new Date('2020-01-15'),
    weight: { toNumber: () => 350 },
    employeeIds: ['employee-1', 'employee-2'],
    serviceProviderIds: ['provider-1'],
    appliedMedicines: [
      {
        itemId: 'medicine-1',
        quantity: 10,
        calculatedDosage: 5.5,
      },
    ],
    observation: 'Test weighing',
    companyId: 'company-1',
    deletedAt: null,
    createdAt: new Date('2020-01-15'),
    updatedAt: new Date('2020-01-15'),
  };

  const mockCreateWeighingDto: CreateWeighingDto = {
    animalId: 'animal-1',
    date: '2020-01-15',
    weight: 350.0,
    employeeIds: ['employee-1', 'employee-2'],
    serviceProviderIds: ['provider-1'],
    appliedMedicines: [
      {
        itemId: 'medicine-1',
        quantity: 10,
        calculatedDosage: 5.5,
      },
    ],
    observation: 'Test weighing',
  };

  beforeEach(async () => {
    const mockPrismaService = {
      user: {
        findUnique: jest.fn(),
      },
      animal: {
        findFirst: jest.fn(),
      },
      employee: {
        findMany: jest.fn(),
      },
      serviceProvider: {
        findMany: jest.fn(),
      },
      weighing: {
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WeighingsService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<WeighingsService>(WeighingsService);
    prismaService = module.get(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a weighing successfully', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.animal.findFirst.mockResolvedValue(mockAnimal);
      prismaService.employee.findMany.mockResolvedValue([
        { id: 'employee-1', companyId: 'company-1' },
        { id: 'employee-2', companyId: 'company-1' },
      ]);
      prismaService.serviceProvider.findMany.mockResolvedValue([
        { id: 'provider-1', companyId: 'company-1' },
      ]);
      prismaService.weighing.create.mockResolvedValue(mockWeighing);

      const result = await service.create(mockUser.id, mockCreateWeighingDto);

      expect(prismaService.weighing.create).toHaveBeenCalled();
      expect(result).toBeDefined();
      expect(result.id).toBe(mockWeighing.id);
    });

    it('should throw NotFoundException if animal not found', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.animal.findFirst.mockResolvedValue(null);

      await expect(
        service.create(mockUser.id, mockCreateWeighingDto),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if employee not found', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.animal.findFirst.mockResolvedValue(mockAnimal);
      prismaService.employee.findMany.mockResolvedValue([
        { id: 'employee-1', companyId: 'company-1' },
      ]);

      await expect(
        service.create(mockUser.id, mockCreateWeighingDto),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if service provider not found', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.animal.findFirst.mockResolvedValue(mockAnimal);
      prismaService.employee.findMany.mockResolvedValue([
        { id: 'employee-1', companyId: 'company-1' },
        { id: 'employee-2', companyId: 'company-1' },
      ]);
      prismaService.serviceProvider.findMany.mockResolvedValue([]);

      await expect(
        service.create(mockUser.id, mockCreateWeighingDto),
      ).rejects.toThrow(BadRequestException);
    });

    it('should handle empty service provider IDs', async () => {
      const dtoWithoutProviders = {
        ...mockCreateWeighingDto,
        serviceProviderIds: undefined,
      };

      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.animal.findFirst.mockResolvedValue(mockAnimal);
      prismaService.employee.findMany.mockResolvedValue([
        { id: 'employee-1', companyId: 'company-1' },
        { id: 'employee-2', companyId: 'company-1' },
      ]);
      prismaService.weighing.create.mockResolvedValue({
        ...mockWeighing,
        serviceProviderIds: [],
      });

      const result = await service.create(mockUser.id, dtoWithoutProviders);

      expect(result).toBeDefined();
    });

    it('should create with empty employeeIds array', async () => {
      const dtoWithEmptyEmployees: CreateWeighingDto = {
        animalId: 'animal-1',
        date: '2020-01-15',
        weight: 350.0,
        employeeIds: [],
      };

      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.animal.findFirst.mockResolvedValue(mockAnimal);
      prismaService.weighing.create.mockResolvedValue({
        ...mockWeighing,
        employeeIds: [],
      });

      await service.create(mockUser.id, dtoWithEmptyEmployees);

      expect(prismaService.employee.findMany).not.toHaveBeenCalled();
      expect(prismaService.weighing.create).toHaveBeenCalled();
    });

    it('should create without appliedMedicines', async () => {
      const dtoWithoutMedicines: CreateWeighingDto = {
        ...mockCreateWeighingDto,
        appliedMedicines: undefined,
      };

      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.animal.findFirst.mockResolvedValue(mockAnimal);
      prismaService.employee.findMany.mockResolvedValue([
        { id: 'employee-1', companyId: 'company-1' },
        { id: 'employee-2', companyId: 'company-1' },
      ]);
      prismaService.serviceProvider.findMany.mockResolvedValue([
        { id: 'provider-1', companyId: 'company-1' },
      ]);
      prismaService.weighing.create.mockResolvedValue({
        ...mockWeighing,
        appliedMedicines: null,
      });

      await service.create(mockUser.id, dtoWithoutMedicines);

      expect(prismaService.weighing.create).toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('should return all weighings for company', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.weighing.findMany.mockResolvedValue([mockWeighing]);

      const result = await service.findAll(mockUser.id);

      expect(prismaService.weighing.findMany).toHaveBeenCalledWith({
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
    it('should return weighing by ID', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.weighing.findFirst.mockResolvedValue(mockWeighing);

      const result = await service.findOne(mockUser.id, 'weighing-1');

      expect(result).toBeDefined();
      expect(result.id).toBe('weighing-1');
    });

    it('should throw NotFoundException if weighing not found', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.weighing.findFirst.mockResolvedValue(null);

      await expect(service.findOne(mockUser.id, 'weighing-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findByAnimalId', () => {
    it('should return weighings for animal', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.animal.findFirst.mockResolvedValue(mockAnimal);
      prismaService.weighing.findMany.mockResolvedValue([mockWeighing]);

      const result = await service.findByAnimalId(mockUser.id, 'animal-1');

      expect(result).toHaveLength(1);
      expect(result[0].animalId).toBe('animal-1');
    });
  });

  describe('update', () => {
    it('should update weighing successfully', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.weighing.findFirst.mockResolvedValue(mockWeighing);
      prismaService.employee.findMany.mockResolvedValue([
        { id: 'employee-1', companyId: 'company-1' },
      ]);
      prismaService.weighing.update.mockResolvedValue({
        ...mockWeighing,
        weight: { toNumber: () => 400 },
      });

      const updateDto: UpdateWeighingDto = {
        weight: 400.0,
      };

      const result = await service.update(mockUser.id, 'weighing-1', updateDto);

      expect(prismaService.weighing.update).toHaveBeenCalled();
      expect(result.weight).toBe(400.0);
    });

    it('should validate employees when updating', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.weighing.findFirst.mockResolvedValue(mockWeighing);
      prismaService.employee.findMany.mockResolvedValue([]);

      const updateDto: UpdateWeighingDto = {
        employeeIds: ['non-existent-employee'],
      };

      await expect(
        service.update(mockUser.id, 'weighing-1', updateDto),
      ).rejects.toThrow(BadRequestException);
    });

    it('should update with all optional fields', async () => {
      const mockEmployees = [{ id: 'employee-1', companyId: 'company-1' }];
      const mockServiceProviders = [
        { id: 'provider-1', companyId: 'company-1' },
      ];

      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.weighing.findFirst.mockResolvedValue(mockWeighing);
      prismaService.animal.findFirst.mockResolvedValue(mockAnimal);
      prismaService.employee.findMany.mockResolvedValue(mockEmployees);
      prismaService.serviceProvider.findMany.mockResolvedValue(
        mockServiceProviders,
      );
      prismaService.weighing.update.mockResolvedValue(mockWeighing);

      const updateDto: UpdateWeighingDto = {
        animalId: 'animal-2',
        date: '2020-01-20',
        weight: 400.0,
        employeeIds: ['employee-1'],
        serviceProviderIds: ['provider-1'],
        appliedMedicines: [
          {
            itemId: 'medicine-2',
            quantity: 20,
            calculatedDosage: 10.0,
          },
        ],
        observation: 'Updated observation',
      };

      await service.update(mockUser.id, 'weighing-1', updateDto);

      expect(prismaService.weighing.update).toHaveBeenCalled();
    });

    it('should update with empty employeeIds array', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.weighing.findFirst.mockResolvedValue(mockWeighing);
      prismaService.weighing.update.mockResolvedValue(mockWeighing);

      const updateDto: UpdateWeighingDto = {
        employeeIds: [],
      };

      await service.update(mockUser.id, 'weighing-1', updateDto);

      expect(prismaService.employee.findMany).not.toHaveBeenCalled();
      expect(prismaService.weighing.update).toHaveBeenCalled();
    });

    it('should update with empty serviceProviderIds array', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.weighing.findFirst.mockResolvedValue(mockWeighing);
      prismaService.weighing.update.mockResolvedValue(mockWeighing);

      const updateDto: UpdateWeighingDto = {
        serviceProviderIds: [],
      };

      await service.update(mockUser.id, 'weighing-1', updateDto);

      expect(prismaService.serviceProvider.findMany).not.toHaveBeenCalled();
      expect(prismaService.weighing.update).toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('should soft delete weighing', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.weighing.findFirst.mockResolvedValue(mockWeighing);
      prismaService.weighing.update.mockResolvedValue({
        ...mockWeighing,
        deletedAt: new Date(),
      });

      const result = await service.remove(mockUser.id, 'weighing-1');

      expect(prismaService.weighing.update).toHaveBeenCalled();
      expect(result.message).toBe('Weighing record deleted successfully');
    });
  });

  describe('transform methods', () => {
    it('should transform with JSON string fields', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      // Prisma returns JSON fields as parsed objects, not strings
      const weighingWithJson = {
        ...mockWeighing,
        employeeIds: ['employee-1', 'employee-2'],
        serviceProviderIds: ['provider-1'],
        appliedMedicines: [
          {
            itemId: 'medicine-1',
            quantity: 10,
            calculatedDosage: 5.5,
          },
        ],
      };
      prismaService.weighing.findFirst.mockResolvedValue(weighingWithJson);

      const result = await service.findOne(mockUser.id, 'weighing-1');

      expect(result.employeeIds).toEqual(['employee-1', 'employee-2']);
      expect(result.serviceProviderIds).toEqual(['provider-1']);
      expect(result.appliedMedicines).toEqual([
        {
          itemId: 'medicine-1',
          quantity: 10,
          calculatedDosage: 5.5,
        },
      ]);
    });

    it('should transform with null JSON fields', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      const weighingWithNulls = {
        ...mockWeighing,
        employeeIds: null,
        serviceProviderIds: null,
        appliedMedicines: null,
      };
      prismaService.weighing.findFirst.mockResolvedValue(weighingWithNulls);

      const result = await service.findOne(mockUser.id, 'weighing-1');

      // employeeIds is cast directly, so null becomes null (cast as string[])
      expect(result.employeeIds).toBeNull();
      // serviceProviderIds has || [] fallback, so null becomes []
      expect(result.serviceProviderIds).toEqual([]);
      // appliedMedicines is cast, so null becomes null (cast as array | undefined)
      expect(result.appliedMedicines).toBeNull();
    });

    it('should transform with number weight (not Decimal)', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      const weighingWithNumber = {
        ...mockWeighing,
        weight: 350,
      };
      prismaService.weighing.findFirst.mockResolvedValue(weighingWithNumber);

      const result = await service.findOne(mockUser.id, 'weighing-1');

      expect(result.weight).toBe(350);
    });
  });
});
