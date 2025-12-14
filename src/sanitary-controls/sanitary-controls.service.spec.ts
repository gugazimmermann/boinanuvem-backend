import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { SanitaryControlsService } from './sanitary-controls.service';
import { PrismaService } from '../common/services/prisma.service';
import { CreateSanitaryControlDto, UpdateSanitaryControlDto } from './dto';

describe('SanitaryControlsService', () => {
  let service: SanitaryControlsService;
  let prismaService: jest.Mocked<PrismaService>;

  const mockUser = {
    id: 'user-1',
    companyId: 'company-1',
  };

  const mockAnimal = {
    id: 'animal-1',
    companyId: 'company-1',
    deletedAt: null,
  };

  const mockSanitaryControl = {
    id: 'sc-1',
    animalId: 'animal-1',
    date: new Date('2025-01-15'),
    itemId: 'item-1', // Legacy field
    quantity: 10, // Legacy field
    calculatedDosage: 5.5, // Legacy field
    observation: 'Test control',
    companyId: 'company-1',
    employeeIds: null,
    serviceProviderIds: null,
    deletedAt: null,
    createdAt: new Date('2025-01-15'),
    updatedAt: new Date('2025-01-15'),
    items: [
      // Junction table relation
      {
        id: 'sci-1',
        itemId: 'item-1',
        quantity: 10,
        calculatedDosage: 5.5,
      },
    ],
  };

  const mockCreateSanitaryControlDto: CreateSanitaryControlDto = {
    animalId: 'animal-1',
    date: '2025-01-15',
    appliedMedicines: [
      {
        itemId: 'item-1',
        quantity: 10,
        calculatedDosage: 5.5,
      },
    ],
    observation: 'Test control',
  };

  beforeEach(async () => {
    const mockPrismaService = {
      user: {
        findUnique: jest.fn(),
      },
      animal: {
        findFirst: jest.fn(),
      },
      inventoryItem: {
        findFirst: jest.fn(),
      },
      employee: {
        findMany: jest.fn(),
      },
      serviceProvider: {
        findMany: jest.fn(),
      },
      sanitaryControl: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      sanitaryControlItem: {
        createMany: jest.fn(),
        deleteMany: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SanitaryControlsService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<SanitaryControlsService>(SanitaryControlsService);
    prismaService = module.get(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a sanitary control record with appliedMedicines array', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.animal.findFirst.mockResolvedValue(mockAnimal);
      prismaService.inventoryItem.findFirst.mockResolvedValue({
        id: 'item-1',
        companyId: 'company-1',
        deletedAt: null,
      });
      prismaService.sanitaryControl.create.mockResolvedValue(
        mockSanitaryControl,
      );
      prismaService.sanitaryControlItem.createMany.mockResolvedValue({
        count: 1,
      });
      prismaService.sanitaryControl.findUnique.mockResolvedValue(
        mockSanitaryControl,
      );

      const result = await service.create(
        mockUser.id,
        mockCreateSanitaryControlDto,
      );

      expect(prismaService.sanitaryControl.create).toHaveBeenCalled();
      expect(prismaService.sanitaryControlItem.createMany).toHaveBeenCalled();
      expect(result).toBeDefined();
      expect(result.id).toBe('sc-1');
      expect(Array.isArray(result.appliedMedicines)).toBe(true);
      expect(result.appliedMedicines.length).toBe(1);
    });

    it('should create with multiple medicines', async () => {
      const dtoWithMultipleMedicines: CreateSanitaryControlDto = {
        animalId: 'animal-1',
        date: '2025-01-15',
        appliedMedicines: [
          {
            itemId: 'item-1',
            quantity: 10,
            calculatedDosage: 5.5,
          },
          {
            itemId: 'item-2',
            quantity: 20,
            calculatedDosage: 10.0,
          },
        ],
      };

      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.animal.findFirst.mockResolvedValue(mockAnimal);
      prismaService.inventoryItem.findFirst
        .mockResolvedValueOnce({
          id: 'item-1',
          companyId: 'company-1',
          deletedAt: null,
        })
        .mockResolvedValueOnce({
          id: 'item-2',
          companyId: 'company-1',
          deletedAt: null,
        });
      prismaService.sanitaryControl.create.mockResolvedValue(
        mockSanitaryControl,
      );
      prismaService.sanitaryControlItem.createMany.mockResolvedValue({
        count: 2,
      });
      prismaService.sanitaryControl.findUnique.mockResolvedValue({
        ...mockSanitaryControl,
        items: [
          {
            id: 'sci-1',
            itemId: 'item-1',
            quantity: 10,
            calculatedDosage: 5.5,
          },
          {
            id: 'sci-2',
            itemId: 'item-2',
            quantity: 20,
            calculatedDosage: 10.0,
          },
        ],
      });

      const result = await service.create(
        mockUser.id,
        dtoWithMultipleMedicines,
      );

      expect(prismaService.sanitaryControlItem.createMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.arrayContaining([
            expect.objectContaining({ itemId: 'item-1' }),
            expect.objectContaining({ itemId: 'item-2' }),
          ]),
        }),
      );
      expect(result.appliedMedicines.length).toBe(2);
    });

    it('should create with legacy itemId format (backward compatibility)', async () => {
      const legacyDto: CreateSanitaryControlDto = {
        animalId: 'animal-1',
        date: '2025-01-15',
        itemId: 'item-1',
        quantity: 10,
        calculatedDosage: 5.5,
      };

      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.animal.findFirst.mockResolvedValue(mockAnimal);
      prismaService.inventoryItem.findFirst.mockResolvedValue({
        id: 'item-1',
        companyId: 'company-1',
        deletedAt: null,
      });
      prismaService.sanitaryControl.create.mockResolvedValue(
        mockSanitaryControl,
      );
      prismaService.sanitaryControlItem.createMany.mockResolvedValue({
        count: 1,
      });
      prismaService.sanitaryControl.findUnique.mockResolvedValue(
        mockSanitaryControl,
      );

      const result = await service.create(mockUser.id, legacyDto);

      expect(prismaService.sanitaryControlItem.createMany).toHaveBeenCalled();
      expect(result.appliedMedicines.length).toBe(1);
    });

    it('should throw NotFoundException if animal not found', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.animal.findFirst.mockResolvedValue(null);

      await expect(
        service.create(mockUser.id, mockCreateSanitaryControlDto),
      ).rejects.toThrow(NotFoundException);
    });

    it('should create without optional fields', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.animal.findFirst.mockResolvedValue(mockAnimal);
      prismaService.sanitaryControl.create.mockResolvedValue({
        ...mockSanitaryControl,
        itemId: null,
        quantity: null,
        calculatedDosage: null,
        items: [],
      });
      prismaService.sanitaryControl.findUnique.mockResolvedValue({
        ...mockSanitaryControl,
        itemId: null,
        quantity: null,
        calculatedDosage: null,
        items: [],
      });

      const dtoWithoutOptionals: CreateSanitaryControlDto = {
        animalId: 'animal-1',
        date: '2025-01-15',
      };

      const result = await service.create(mockUser.id, dtoWithoutOptionals);

      expect(prismaService.inventoryItem.findFirst).not.toHaveBeenCalled();
      expect(prismaService.employee.findMany).not.toHaveBeenCalled();
      expect(prismaService.serviceProvider.findMany).not.toHaveBeenCalled();
      expect(prismaService.sanitaryControl.create).toHaveBeenCalled();
      expect(
        prismaService.sanitaryControlItem.createMany,
      ).not.toHaveBeenCalled();
      expect(result.appliedMedicines).toEqual([]);
    });

    it('should validate employees if provided', async () => {
      const mockEmployees = [
        { id: 'employee-1', companyId: 'company-1' },
        { id: 'employee-2', companyId: 'company-1' },
      ];

      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.animal.findFirst.mockResolvedValue(mockAnimal);
      prismaService.inventoryItem.findFirst.mockResolvedValue({
        id: 'item-1',
        companyId: 'company-1',
        deletedAt: null,
      });
      prismaService.employee.findMany.mockResolvedValue(mockEmployees);
      prismaService.sanitaryControl.create.mockResolvedValue({
        ...mockSanitaryControl,
        employeeIds: JSON.stringify(['employee-1', 'employee-2']),
      });
      prismaService.sanitaryControlItem.createMany.mockResolvedValue({
        count: 1,
      });
      prismaService.sanitaryControl.findUnique.mockResolvedValue({
        ...mockSanitaryControl,
        employeeIds: JSON.stringify(['employee-1', 'employee-2']),
      });

      const dtoWithEmployees: CreateSanitaryControlDto = {
        ...mockCreateSanitaryControlDto,
        employeeIds: ['employee-1', 'employee-2'],
      };

      await service.create(mockUser.id, dtoWithEmployees);

      expect(prismaService.employee.findMany).toHaveBeenCalled();
    });

    it('should throw NotFoundException if employees not found', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.animal.findFirst.mockResolvedValue(mockAnimal);
      prismaService.employee.findMany.mockResolvedValue([]);

      const dtoWithEmployees: CreateSanitaryControlDto = {
        ...mockCreateSanitaryControlDto,
        employeeIds: ['employee-1'],
      };

      await expect(
        service.create(mockUser.id, dtoWithEmployees),
      ).rejects.toThrow(NotFoundException);
    });

    it('should validate serviceProviders if provided', async () => {
      const mockServiceProviders = [{ id: 'sp-1', companyId: 'company-1' }];

      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.animal.findFirst.mockResolvedValue(mockAnimal);
      prismaService.inventoryItem.findFirst.mockResolvedValue({
        id: 'item-1',
        companyId: 'company-1',
        deletedAt: null,
      });
      prismaService.serviceProvider.findMany.mockResolvedValue(
        mockServiceProviders,
      );
      prismaService.sanitaryControl.create.mockResolvedValue({
        ...mockSanitaryControl,
        serviceProviderIds: JSON.stringify(['sp-1']),
      });
      prismaService.sanitaryControlItem.createMany.mockResolvedValue({
        count: 1,
      });
      prismaService.sanitaryControl.findUnique.mockResolvedValue({
        ...mockSanitaryControl,
        serviceProviderIds: JSON.stringify(['sp-1']),
      });

      const dtoWithServiceProviders: CreateSanitaryControlDto = {
        ...mockCreateSanitaryControlDto,
        serviceProviderIds: ['sp-1'],
      };

      await service.create(mockUser.id, dtoWithServiceProviders);

      expect(prismaService.serviceProvider.findMany).toHaveBeenCalled();
    });

    it('should throw NotFoundException if serviceProviders not found', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.animal.findFirst.mockResolvedValue(mockAnimal);
      prismaService.serviceProvider.findMany.mockResolvedValue([]);

      const dtoWithServiceProviders: CreateSanitaryControlDto = {
        ...mockCreateSanitaryControlDto,
        serviceProviderIds: ['sp-1'],
      };

      await expect(
        service.create(mockUser.id, dtoWithServiceProviders),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('findAll', () => {
    it('should return all sanitary control records for company with appliedMedicines', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.sanitaryControl.findMany.mockResolvedValue([
        mockSanitaryControl,
      ]);

      const result = await service.findAll(mockUser.id);

      expect(prismaService.sanitaryControl.findMany).toHaveBeenCalledWith({
        where: {
          companyId: 'company-1',
          deletedAt: null,
        },
        include: {
          items: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });
      expect(result).toHaveLength(1);
      expect(Array.isArray(result[0].appliedMedicines)).toBe(true);
    });
  });

  describe('findOne', () => {
    it('should return sanitary control record by ID with appliedMedicines', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.sanitaryControl.findFirst.mockResolvedValue(
        mockSanitaryControl,
      );
      prismaService.sanitaryControl.findUnique.mockResolvedValue(
        mockSanitaryControl,
      );

      const result = await service.findOne(mockUser.id, 'sc-1');

      expect(result).toBeDefined();
      expect(result.id).toBe('sc-1');
      expect(Array.isArray(result.appliedMedicines)).toBe(true);
      expect(result.appliedMedicines.length).toBe(1);
    });

    it('should throw NotFoundException if record not found', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.sanitaryControl.findFirst.mockResolvedValue(null);

      await expect(service.findOne(mockUser.id, 'sc-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findByAnimalId', () => {
    it('should return sanitary control records for animal with appliedMedicines', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.animal.findFirst.mockResolvedValue(mockAnimal);
      prismaService.sanitaryControl.findMany.mockResolvedValue([
        mockSanitaryControl,
      ]);

      const result = await service.findByAnimalId(mockUser.id, 'animal-1');

      expect(result).toHaveLength(1);
      expect(Array.isArray(result[0].appliedMedicines)).toBe(true);
    });
  });

  describe('update', () => {
    it('should update sanitary control record successfully', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.sanitaryControl.findFirst.mockResolvedValue(
        mockSanitaryControl,
      );
      prismaService.sanitaryControl.update.mockResolvedValue({
        ...mockSanitaryControl,
        observation: 'Updated observation',
      });
      prismaService.sanitaryControl.findUnique.mockResolvedValue({
        ...mockSanitaryControl,
        observation: 'Updated observation',
      });

      const updateDto: UpdateSanitaryControlDto = {
        observation: 'Updated observation',
      };

      const result = await service.update(mockUser.id, 'sc-1', updateDto);

      expect(prismaService.sanitaryControl.update).toHaveBeenCalled();
      expect(result.observation).toBe('Updated observation');
    });

    it('should update with appliedMedicines array', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.sanitaryControl.findFirst.mockResolvedValue(
        mockSanitaryControl,
      );
      prismaService.inventoryItem.findFirst.mockResolvedValue({
        id: 'item-2',
        companyId: 'company-1',
        deletedAt: null,
      });
      prismaService.sanitaryControl.update.mockResolvedValue(
        mockSanitaryControl,
      );
      prismaService.sanitaryControlItem.deleteMany.mockResolvedValue({
        count: 1,
      });
      prismaService.sanitaryControlItem.createMany.mockResolvedValue({
        count: 1,
      });
      prismaService.sanitaryControl.findUnique.mockResolvedValue({
        ...mockSanitaryControl,
        items: [
          {
            id: 'sci-2',
            itemId: 'item-2',
            quantity: 20,
            calculatedDosage: 10.0,
          },
        ],
      });

      const updateDto: UpdateSanitaryControlDto = {
        appliedMedicines: [
          {
            itemId: 'item-2',
            quantity: 20,
            calculatedDosage: 10.0,
          },
        ],
      };

      const result = await service.update(mockUser.id, 'sc-1', updateDto);

      expect(prismaService.sanitaryControlItem.deleteMany).toHaveBeenCalled();
      expect(prismaService.sanitaryControlItem.createMany).toHaveBeenCalled();
      expect(result.appliedMedicines[0].itemId).toBe('item-2');
    });

    it('should update with empty appliedMedicines array', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.sanitaryControl.findFirst.mockResolvedValue(
        mockSanitaryControl,
      );
      prismaService.sanitaryControl.update.mockResolvedValue(
        mockSanitaryControl,
      );
      prismaService.sanitaryControlItem.deleteMany.mockResolvedValue({
        count: 1,
      });
      prismaService.sanitaryControl.findUnique.mockResolvedValue({
        ...mockSanitaryControl,
        items: [],
        itemId: null,
        quantity: null,
        calculatedDosage: null,
      });

      const updateDto: UpdateSanitaryControlDto = {
        appliedMedicines: [],
      };

      const result = await service.update(mockUser.id, 'sc-1', updateDto);

      expect(prismaService.sanitaryControlItem.deleteMany).toHaveBeenCalled();
      expect(
        prismaService.sanitaryControlItem.createMany,
      ).not.toHaveBeenCalled();
      expect(result.appliedMedicines).toEqual([]);
    });

    it('should update with all optional fields using legacy format', async () => {
      const mockEmployees = [{ id: 'employee-1', companyId: 'company-1' }];
      const mockServiceProviders = [{ id: 'sp-1', companyId: 'company-1' }];

      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.sanitaryControl.findFirst.mockResolvedValue(
        mockSanitaryControl,
      );
      prismaService.animal.findFirst.mockResolvedValue(mockAnimal);
      prismaService.inventoryItem.findFirst.mockResolvedValue({
        id: 'item-2',
        companyId: 'company-1',
        deletedAt: null,
      });
      prismaService.employee.findMany.mockResolvedValue(mockEmployees);
      prismaService.serviceProvider.findMany.mockResolvedValue(
        mockServiceProviders,
      );
      prismaService.sanitaryControl.update.mockResolvedValue(
        mockSanitaryControl,
      );
      prismaService.sanitaryControlItem.deleteMany.mockResolvedValue({
        count: 1,
      });
      prismaService.sanitaryControlItem.createMany.mockResolvedValue({
        count: 1,
      });
      prismaService.sanitaryControl.findUnique.mockResolvedValue(
        mockSanitaryControl,
      );

      const updateDto: UpdateSanitaryControlDto = {
        animalId: 'animal-1',
        date: '2025-01-20',
        itemId: 'item-2',
        quantity: 20,
        calculatedDosage: 10.0,
        observation: 'Updated',
        employeeIds: ['employee-1'],
        serviceProviderIds: ['sp-1'],
      };

      await service.update(mockUser.id, 'sc-1', updateDto);

      expect(prismaService.sanitaryControl.update).toHaveBeenCalled();
      expect(prismaService.sanitaryControlItem.createMany).toHaveBeenCalled();
    });

    it('should update with itemId set to null', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.sanitaryControl.findFirst.mockResolvedValue(
        mockSanitaryControl,
      );
      prismaService.sanitaryControl.update.mockResolvedValue({
        ...mockSanitaryControl,
        itemId: null,
      });
      prismaService.sanitaryControl.findUnique.mockResolvedValue({
        ...mockSanitaryControl,
        itemId: null,
        items: [],
      });

      const updateDto: UpdateSanitaryControlDto = {
        itemId: null,
      };

      await service.update(mockUser.id, 'sc-1', updateDto);

      expect(prismaService.inventoryItem.findFirst).not.toHaveBeenCalled();
      expect(prismaService.sanitaryControl.update).toHaveBeenCalled();
    });

    it('should update with empty employeeIds array', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.sanitaryControl.findFirst.mockResolvedValue(
        mockSanitaryControl,
      );
      prismaService.sanitaryControl.update.mockResolvedValue(
        mockSanitaryControl,
      );
      prismaService.sanitaryControl.findUnique.mockResolvedValue(
        mockSanitaryControl,
      );

      const updateDto: UpdateSanitaryControlDto = {
        employeeIds: [],
      };

      await service.update(mockUser.id, 'sc-1', updateDto);

      expect(prismaService.employee.findMany).not.toHaveBeenCalled();
      expect(prismaService.sanitaryControl.update).toHaveBeenCalled();
    });

    it('should update with empty serviceProviderIds array', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.sanitaryControl.findFirst.mockResolvedValue(
        mockSanitaryControl,
      );
      prismaService.sanitaryControl.update.mockResolvedValue(
        mockSanitaryControl,
      );
      prismaService.sanitaryControl.findUnique.mockResolvedValue(
        mockSanitaryControl,
      );

      const updateDto: UpdateSanitaryControlDto = {
        serviceProviderIds: [],
      };

      await service.update(mockUser.id, 'sc-1', updateDto);

      expect(prismaService.serviceProvider.findMany).not.toHaveBeenCalled();
      expect(prismaService.sanitaryControl.update).toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('should soft delete sanitary control record', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.sanitaryControl.findFirst.mockResolvedValue(
        mockSanitaryControl,
      );
      prismaService.sanitaryControl.update.mockResolvedValue({
        ...mockSanitaryControl,
        deletedAt: new Date(),
      });

      await service.remove(mockUser.id, 'sc-1');

      expect(prismaService.sanitaryControl.update).toHaveBeenCalledWith({
        where: { id: 'sc-1' },
        data: { deletedAt: expect.any(Date) },
      });
    });
  });

  describe('transform methods', () => {
    it('should transform with junction table items', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.sanitaryControl.findFirst.mockResolvedValue(
        mockSanitaryControl,
      );
      prismaService.sanitaryControl.findUnique.mockResolvedValue(
        mockSanitaryControl,
      );

      const result = await service.findOne(mockUser.id, 'sc-1');

      expect(Array.isArray(result.appliedMedicines)).toBe(true);
      expect(result.appliedMedicines.length).toBe(1);
      expect(result.appliedMedicines[0]).toMatchObject({
        itemId: 'item-1',
        quantity: 10,
        calculatedDosage: 5.5,
      });
    });

    it('should fallback to legacy fields if no items in junction table', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      const controlWithLegacyOnly = {
        ...mockSanitaryControl,
        items: [],
      };
      prismaService.sanitaryControl.findFirst.mockResolvedValue(
        controlWithLegacyOnly,
      );
      prismaService.sanitaryControl.findUnique.mockResolvedValue(
        controlWithLegacyOnly,
      );

      const result = await service.findOne(mockUser.id, 'sc-1');

      expect(Array.isArray(result.appliedMedicines)).toBe(true);
      expect(result.appliedMedicines.length).toBe(1);
      expect(result.appliedMedicines[0].itemId).toBe('item-1');
    });

    it('should transform with null JSON fields', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      const controlWithNulls = {
        ...mockSanitaryControl,
        employeeIds: null,
        serviceProviderIds: null,
        items: [],
      };
      prismaService.sanitaryControl.findFirst.mockResolvedValue(
        controlWithNulls,
      );
      prismaService.sanitaryControl.findUnique.mockResolvedValue(
        controlWithNulls,
      );

      const result = await service.findOne(mockUser.id, 'sc-1');

      expect(result.employeeIds).toEqual([]);
      expect(result.serviceProviderIds).toEqual([]);
    });

    it('should transform with JSON string fields', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      const controlWithJson = {
        ...mockSanitaryControl,
        employeeIds: JSON.stringify(['employee-1', 'employee-2']),
        serviceProviderIds: JSON.stringify(['sp-1']),
      };
      prismaService.sanitaryControl.findFirst.mockResolvedValue(
        controlWithJson,
      );
      prismaService.sanitaryControl.findUnique.mockResolvedValue(
        controlWithJson,
      );

      const result = await service.findOne(mockUser.id, 'sc-1');

      expect(result.employeeIds).toEqual(['employee-1', 'employee-2']);
      expect(result.serviceProviderIds).toEqual(['sp-1']);
    });
  });
});
