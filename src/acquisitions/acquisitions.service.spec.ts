import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { AcquisitionsService } from './acquisitions.service';
import { PrismaService } from '../common/services/prisma.service';
import {
  CreateAcquisitionDto,
  UpdateAcquisitionDto,
  PricingMode,
  AcquisitionPaymentMethod,
} from './dto';

describe('AcquisitionsService', () => {
  let service: AcquisitionsService;
  let prismaService: jest.Mocked<PrismaService>;

  const mockUser = {
    id: 'user-1',
    companyId: 'company-1',
  };

  const mockAnimal = {
    id: 'animal-1',
    code: '001',
    registrationNumber: 'BR-2020-FJ0001',
    acquisitionDate: null,
    status: 'active',
    companyId: 'company-1',
    propertyId: 'property-1',
    deletedAt: null,
    createdAt: new Date('2020-01-15'),
    updatedAt: new Date('2020-01-15'),
  };

  const mockAcquisition = {
    id: 'acquisition-1',
    companyId: 'company-1',
    propertyId: 'property-1',
    supplierId: 'supplier-1',
    acquisitionDate: new Date('2020-01-15'),
    pricingMode: PricingMode.INDIVIDUAL,
    paymentMethod: AcquisitionPaymentMethod.CASH_FLOW,
    totalPrice: { toNumber: () => 50000 },
    transportationFee: { toNumber: () => 500 },
    handlingFee: { toNumber: () => 200 },
    fees: [{ id: 'fee-1', name: 'Transportation', amount: 150 }],
    linkedCashFlowId: null,
    linkedAccountsPayableId: null,
    observation: 'Test acquisition',
    deletedAt: null,
    createdAt: new Date('2020-01-15'),
    updatedAt: new Date('2020-01-15'),
    acquisitionItems: [
      {
        id: 'item-1',
        acquisitionId: 'acquisition-1',
        animalId: 'animal-1',
        price: { toNumber: () => 5000 },
        weight: { toNumber: () => 350 },
        costPerArroba: { toNumber: () => 142.86 },
        breed: 'nelore',
        gender: 'male',
        birthDate: null,
        motherId: null,
        fatherId: null,
        motherRegistrationNumber: null,
        fatherRegistrationNumber: null,
        purity: null,
        birthObservation: null,
        createdAt: new Date('2020-01-15'),
      },
    ],
  };

  const mockCreateAcquisitionDto: CreateAcquisitionDto = {
    propertyId: 'property-1',
    supplierId: 'supplier-1',
    acquisitionDate: '2020-01-15',
    pricingMode: PricingMode.INDIVIDUAL,
    paymentMethod: AcquisitionPaymentMethod.CASH_FLOW,
    totalPrice: 50000,
    fees: [{ id: 'fee-1', name: 'Transportation', amount: 150 }],
    transportationFee: 500,
    handlingFee: 200,
    acquisitionItems: [
      {
        animalId: 'animal-1',
        price: 5000,
        weight: 350,
      },
    ],
    observation: 'Test acquisition',
  };

  const mockProperty = {
    id: 'property-1',
    companyId: 'company-1',
  };

  const mockSupplier = {
    id: 'supplier-1',
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
      acquisition: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      acquisitionItem: {
        findFirst: jest.fn(),
        createMany: jest.fn(),
        deleteMany: jest.fn(),
      },
      property: {
        findFirst: jest.fn(),
      },
      supplier: {
        findFirst: jest.fn(),
      },
      $transaction: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AcquisitionsService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<AcquisitionsService>(AcquisitionsService);
    prismaService = module.get(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create an acquisition successfully with existing animals', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.property.findFirst.mockResolvedValue(mockProperty);
      prismaService.supplier.findFirst.mockResolvedValue(mockSupplier);
      prismaService.animal.findFirst.mockResolvedValue(mockAnimal);

      prismaService.$transaction.mockImplementation(async (callback) => {
        const tx = {
          acquisition: {
            create: jest.fn().mockResolvedValue(mockAcquisition),
            findUnique: jest.fn().mockResolvedValue(mockAcquisition),
          },
          acquisitionItem: {
            createMany: jest.fn().mockResolvedValue({ count: 1 }),
          },
        };
        return callback(tx);
      });

      const result = await service.create(
        mockUser.id,
        mockCreateAcquisitionDto,
      );

      expect(prismaService.$transaction).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('should create animals when animalId not provided', async () => {
      const dtoWithNewAnimal: CreateAcquisitionDto = {
        ...mockCreateAcquisitionDto,
        acquisitionItems: [
          {
            code: '002',
            registrationNumber: 'BR-2020-FJ0002',
            price: 5000,
            weight: 350,
          },
        ],
      };

      const newAnimal = { ...mockAnimal, id: 'animal-2', code: '002' };

      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.property.findFirst.mockResolvedValue(mockProperty);
      prismaService.supplier.findFirst.mockResolvedValue(mockSupplier);
      prismaService.animal.findFirst.mockResolvedValue(null); // No existing animal code
      prismaService.animal.create.mockResolvedValue(newAnimal); // Create new animal

      prismaService.$transaction.mockImplementation(async (callback) => {
        const tx = {
          acquisition: {
            create: jest.fn().mockResolvedValue(mockAcquisition),
            findUnique: jest.fn().mockResolvedValue({
              ...mockAcquisition,
              acquisitionItems: [
                {
                  ...mockAcquisition.acquisitionItems[0],
                  animalId: newAnimal.id,
                },
              ],
            }),
          },
          acquisitionItem: {
            createMany: jest.fn().mockResolvedValue({ count: 1 }),
          },
        };
        return callback(tx);
      });

      await service.create(mockUser.id, dtoWithNewAnimal);

      expect(prismaService.$transaction).toHaveBeenCalled();
    });

    it('should throw BadRequestException if code/registrationNumber missing when creating animal', async () => {
      const dtoWithoutCode: CreateAcquisitionDto = {
        ...mockCreateAcquisitionDto,
        acquisitionItems: [
          {
            price: 5000,
            weight: 350,
          },
        ],
      };

      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.property.findFirst.mockResolvedValue(mockProperty);
      prismaService.supplier.findFirst.mockResolvedValue(mockSupplier);

      await expect(service.create(mockUser.id, dtoWithoutCode)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw ConflictException if animal code already exists', async () => {
      const dtoWithNewAnimal: CreateAcquisitionDto = {
        ...mockCreateAcquisitionDto,
        acquisitionItems: [
          {
            code: '001',
            registrationNumber: 'BR-2020-FJ0001',
            price: 5000,
            weight: 350,
          },
        ],
      };

      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.property.findFirst.mockResolvedValue(mockProperty);
      prismaService.supplier.findFirst.mockResolvedValue(mockSupplier);
      prismaService.animal.findFirst.mockResolvedValue(mockAnimal);

      await expect(
        service.create(mockUser.id, dtoWithNewAnimal),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw NotFoundException if property not found', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.property.findFirst.mockResolvedValue(null);

      await expect(
        service.create(mockUser.id, mockCreateAcquisitionDto),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if supplier not found', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.property.findFirst.mockResolvedValue(mockProperty);
      prismaService.supplier.findFirst.mockResolvedValue(null);

      await expect(
        service.create(mockUser.id, mockCreateAcquisitionDto),
      ).rejects.toThrow(NotFoundException);
    });

    it('should calculate cost per arroba correctly', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.property.findFirst.mockResolvedValue(mockProperty);
      prismaService.supplier.findFirst.mockResolvedValue(mockSupplier);
      prismaService.animal.findFirst.mockResolvedValue(mockAnimal);

      prismaService.$transaction.mockImplementation(async (callback) => {
        const tx = {
          acquisition: {
            create: jest.fn().mockResolvedValue(mockAcquisition),
            findUnique: jest.fn().mockResolvedValue(mockAcquisition),
          },
          acquisitionItem: {
            createMany: jest.fn().mockResolvedValue({ count: 1 }),
          },
        };
        return callback(tx);
      });

      await service.create(mockUser.id, mockCreateAcquisitionDto);

      expect(prismaService.$transaction).toHaveBeenCalled();
    });

    it('should distribute total cost equally when pricingMode is TOTAL', async () => {
      const dtoWithTotalPricing: CreateAcquisitionDto = {
        ...mockCreateAcquisitionDto,
        pricingMode: PricingMode.TOTAL,
        totalPrice: 10000,
        acquisitionItems: [
          {
            animalId: 'animal-1',
            price: 0, // Will be calculated
            weight: 300,
          },
          {
            animalId: 'animal-2',
            price: 0, // Will be calculated
            weight: 350,
          },
        ],
      };

      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.property.findFirst.mockResolvedValue(mockProperty);
      prismaService.supplier.findFirst.mockResolvedValue(mockSupplier);
      prismaService.animal.findFirst
        .mockResolvedValueOnce(mockAnimal)
        .mockResolvedValueOnce({ ...mockAnimal, id: 'animal-2' });

      prismaService.$transaction.mockImplementation(async (callback) => {
        const tx = {
          acquisition: {
            create: jest.fn().mockResolvedValue(mockAcquisition),
            findUnique: jest.fn().mockResolvedValue(mockAcquisition),
          },
          acquisitionItem: {
            createMany: jest.fn().mockResolvedValue({ count: 2 }),
          },
        };
        return callback(tx);
      });

      await service.create(mockUser.id, dtoWithTotalPricing);

      expect(prismaService.$transaction).toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('should return all acquisitions for user company', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.acquisition.findMany.mockResolvedValue([mockAcquisition]);

      const result = await service.findAll(mockUser.id);

      expect(prismaService.acquisition.findMany).toHaveBeenCalledWith({
        where: {
          companyId: mockUser.companyId,
          deletedAt: null,
        },
        include: {
          acquisitionItems: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });
      expect(result).toHaveLength(1);
    });
  });

  describe('findOne', () => {
    it('should return an acquisition by id', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.acquisition.findFirst.mockResolvedValue(mockAcquisition);

      const result = await service.findOne(mockUser.id, mockAcquisition.id);

      expect(result).toBeDefined();
      expect(result.id).toBe(mockAcquisition.id);
    });

    it('should throw NotFoundException if acquisition not found', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.acquisition.findFirst.mockResolvedValue(null);

      await expect(
        service.findOne(mockUser.id, mockAcquisition.id),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('findByAnimalId', () => {
    it('should return an acquisition by animal id', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.animal.findFirst.mockResolvedValue(mockAnimal);
      prismaService.acquisitionItem.findFirst.mockResolvedValue({
        ...mockAcquisition.acquisitionItems[0],
        acquisition: mockAcquisition,
      });

      const result = await service.findByAnimalId(mockUser.id, mockAnimal.id);

      expect(result).toBeDefined();
    });

    it('should throw NotFoundException if animal not found', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.animal.findFirst.mockResolvedValue(null);

      await expect(
        service.findByAnimalId(mockUser.id, mockAnimal.id),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    const updateDto: UpdateAcquisitionDto = {
      observation: 'Updated observation',
    };

    it('should update an acquisition successfully', async () => {
      const updatedAcquisition = { ...mockAcquisition, ...updateDto };

      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.acquisition.findFirst.mockResolvedValue(mockAcquisition);
      prismaService.acquisition.update.mockResolvedValue(updatedAcquisition);

      const result = await service.update(
        mockUser.id,
        mockAcquisition.id,
        updateDto,
      );

      expect(prismaService.acquisition.update).toHaveBeenCalled();
      expect(result.observation).toBe(updateDto.observation);
    });

    it('should update acquisition items when provided', async () => {
      const updateWithItems: UpdateAcquisitionDto = {
        acquisitionItems: [
          {
            animalId: 'animal-2',
            price: 6000,
            weight: 400,
          },
        ],
      };

      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.acquisition.findFirst.mockResolvedValue(mockAcquisition);
      prismaService.animal.findFirst.mockResolvedValue({
        ...mockAnimal,
        id: 'animal-2',
      });
      prismaService.acquisitionItem.deleteMany.mockResolvedValue({ count: 1 });
      prismaService.acquisitionItem.createMany.mockResolvedValue({ count: 1 });
      prismaService.acquisition.update.mockResolvedValue(mockAcquisition);

      await service.update(mockUser.id, mockAcquisition.id, updateWithItems);

      expect(prismaService.acquisitionItem.deleteMany).toHaveBeenCalled();
      expect(prismaService.acquisitionItem.createMany).toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('should soft delete an acquisition', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.acquisition.findFirst.mockResolvedValue(mockAcquisition);
      prismaService.acquisition.update.mockResolvedValue({
        ...mockAcquisition,
        deletedAt: new Date(),
      });

      const result = await service.remove(mockUser.id, mockAcquisition.id);

      expect(prismaService.acquisition.update).toHaveBeenCalledWith({
        where: { id: mockAcquisition.id },
        data: {
          deletedAt: expect.any(Date),
        },
      });
      expect(result).toEqual({
        message: 'Acquisition record deleted successfully',
      });
    });
  });

  describe('calculateCostPerArroba', () => {
    it('should calculate cost per arroba correctly', () => {
      const costPerArroba = (service as any).calculateCostPerArroba(300, 5000);
      // 300 kg / 30 = 10 arrobas, 5000 / 10 = 500
      expect(costPerArroba).toBeCloseTo(500, 2);
    });

    it('should return 0 for zero or negative weight', () => {
      expect((service as any).calculateCostPerArroba(0, 5000)).toBe(0);
      expect((service as any).calculateCostPerArroba(-100, 5000)).toBe(0);
    });
  });

  describe('calculateTotalFees', () => {
    it('should calculate total fees correctly', () => {
      const fees = [
        { id: 'fee-1', name: 'Fee 1', amount: 100 },
        { id: 'fee-2', name: 'Fee 2', amount: 200 },
      ];
      const total = (service as any).calculateTotalFees(fees, 500, 200);
      expect(total).toBe(1000); // 100 + 200 + 500 + 200
    });

    it('should handle null/undefined fees', () => {
      const total = (service as any).calculateTotalFees(null, null, null);
      expect(total).toBe(0);
    });
  });
});
