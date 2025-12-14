import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { InventoryMovementsService } from './inventory-movements.service';
import { PrismaService } from '../common/services/prisma.service';
import {
  CreateInventoryMovementDto,
  UpdateInventoryMovementDto,
  InventoryMovementType,
} from './dto';

describe('InventoryMovementsService', () => {
  let service: InventoryMovementsService;
  let prismaService: jest.Mocked<PrismaService>;

  const mockUser = {
    id: 'user-1',
    companyId: 'company-1',
  };

  const mockInventoryItem = {
    id: 'item-1',
    companyId: 'company-1',
    deletedAt: null,
  };

  const mockProperty = {
    id: 'property-1',
    companyId: 'company-1',
    deletedAt: null,
  };

  const mockLocation = {
    id: 'location-1',
    propertyId: 'property-1',
    companyId: 'company-1',
    deletedAt: null,
  };

  const mockSupplier = {
    id: 'supplier-1',
    companyId: 'company-1',
    deletedAt: null,
  };

  const mockEmployee = {
    id: 'employee-1',
    companyId: 'company-1',
    deletedAt: null,
  };

  const mockServiceProvider = {
    id: 'sp-1',
    companyId: 'company-1',
    deletedAt: null,
  };

  const mockInventoryMovement = {
    id: 'movement-1',
    itemId: 'item-1',
    type: InventoryMovementType.PURCHASE,
    quantity: 100,
    unitPrice: 2.5,
    date: new Date('2025-01-15'),
    description: 'Purchase of feed',
    supplierId: 'supplier-1',
    cashFlowId: null,
    propertyId: 'property-1',
    companyId: 'company-1',
    locationId: 'location-1',
    expirationDate: null,
    employeeIds: JSON.stringify(['employee-1']),
    serviceProviderIds: JSON.stringify(['sp-1']),
    observation: 'Test observation',
    fileIds: JSON.stringify(['file-1']),
    deletedAt: null,
    createdAt: new Date('2025-01-15'),
    updatedAt: new Date('2025-01-15'),
  };

  const mockCreateInventoryMovementDto: CreateInventoryMovementDto = {
    itemId: 'item-1',
    type: InventoryMovementType.PURCHASE,
    quantity: 100,
    unitPrice: 2.5,
    date: '2025-01-15',
    description: 'Purchase of feed',
    supplierId: 'supplier-1',
    propertyId: 'property-1',
    locationId: 'location-1',
    employeeIds: ['employee-1'],
    serviceProviderIds: ['sp-1'],
    observation: 'Test observation',
    fileIds: ['file-1'],
  };

  beforeEach(async () => {
    const mockPrismaService = {
      user: {
        findUnique: jest.fn(),
      },
      inventoryItem: {
        findFirst: jest.fn(),
      },
      property: {
        findFirst: jest.fn(),
      },
      location: {
        findFirst: jest.fn(),
      },
      supplier: {
        findFirst: jest.fn(),
      },
      employee: {
        findMany: jest.fn(),
      },
      serviceProvider: {
        findMany: jest.fn(),
      },
      inventoryMovement: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        findUnique: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InventoryMovementsService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<InventoryMovementsService>(InventoryMovementsService);
    prismaService = module.get(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a purchase inventory movement successfully', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.inventoryItem.findFirst.mockResolvedValue(
        mockInventoryItem,
      );
      prismaService.property.findFirst.mockResolvedValue(mockProperty);
      prismaService.location.findFirst.mockResolvedValue(mockLocation);
      prismaService.supplier.findFirst.mockResolvedValue(mockSupplier);
      prismaService.employee.findMany.mockResolvedValue([mockEmployee]);
      prismaService.serviceProvider.findMany.mockResolvedValue([
        mockServiceProvider,
      ]);
      prismaService.inventoryMovement.create.mockResolvedValue(
        mockInventoryMovement,
      );

      const result = await service.create(
        mockUser.id,
        mockCreateInventoryMovementDto,
      );

      expect(prismaService.inventoryMovement.create).toHaveBeenCalled();
      expect(result).toBeDefined();
      expect(result.id).toBe('movement-1');
      expect(result.type).toBe(InventoryMovementType.PURCHASE);
    });

    it('should create a consumption inventory movement successfully', async () => {
      const consumptionDto: CreateInventoryMovementDto = {
        itemId: 'item-1',
        type: InventoryMovementType.CONSUMPTION,
        quantity: 50,
        date: '2025-01-15',
        propertyId: 'property-1',
      };

      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.inventoryItem.findFirst.mockResolvedValue(
        mockInventoryItem,
      );
      prismaService.property.findFirst.mockResolvedValue(mockProperty);
      prismaService.inventoryMovement.create.mockResolvedValue({
        ...mockInventoryMovement,
        type: InventoryMovementType.CONSUMPTION,
        quantity: 50,
        supplierId: null,
      });

      const result = await service.create(mockUser.id, consumptionDto);

      expect(result.type).toBe(InventoryMovementType.CONSUMPTION);
      expect(result.quantity).toBe(50);
    });

    it('should throw NotFoundException if inventory item not found', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.inventoryItem.findFirst.mockResolvedValue(null);

      await expect(
        service.create(mockUser.id, mockCreateInventoryMovementDto),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if property not found', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.inventoryItem.findFirst.mockResolvedValue(
        mockInventoryItem,
      );
      prismaService.property.findFirst.mockResolvedValue(null);

      await expect(
        service.create(mockUser.id, mockCreateInventoryMovementDto),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if location not found', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.inventoryItem.findFirst.mockResolvedValue(
        mockInventoryItem,
      );
      prismaService.property.findFirst.mockResolvedValue(mockProperty);
      prismaService.location.findFirst.mockResolvedValue(null);

      await expect(
        service.create(mockUser.id, mockCreateInventoryMovementDto),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if location does not belong to property', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.inventoryItem.findFirst.mockResolvedValue(
        mockInventoryItem,
      );
      prismaService.property.findFirst.mockResolvedValue(mockProperty);
      prismaService.location.findFirst.mockResolvedValue(null); // Location not found with property

      await expect(
        service.create(mockUser.id, mockCreateInventoryMovementDto),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if supplier not found', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.inventoryItem.findFirst.mockResolvedValue(
        mockInventoryItem,
      );
      prismaService.property.findFirst.mockResolvedValue(mockProperty);
      prismaService.location.findFirst.mockResolvedValue(mockLocation);
      prismaService.supplier.findFirst.mockResolvedValue(null);

      await expect(
        service.create(mockUser.id, mockCreateInventoryMovementDto),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if employee not found', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.inventoryItem.findFirst.mockResolvedValue(
        mockInventoryItem,
      );
      prismaService.property.findFirst.mockResolvedValue(mockProperty);
      prismaService.location.findFirst.mockResolvedValue(mockLocation);
      prismaService.supplier.findFirst.mockResolvedValue(mockSupplier);
      prismaService.employee.findMany.mockResolvedValue([]); // No employees found

      await expect(
        service.create(mockUser.id, mockCreateInventoryMovementDto),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if service provider not found', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.inventoryItem.findFirst.mockResolvedValue(
        mockInventoryItem,
      );
      prismaService.property.findFirst.mockResolvedValue(mockProperty);
      prismaService.location.findFirst.mockResolvedValue(mockLocation);
      prismaService.supplier.findFirst.mockResolvedValue(mockSupplier);
      prismaService.employee.findMany.mockResolvedValue([mockEmployee]);
      prismaService.serviceProvider.findMany.mockResolvedValue([]); // No service providers found

      await expect(
        service.create(mockUser.id, mockCreateInventoryMovementDto),
      ).rejects.toThrow(NotFoundException);
    });

    it('should create movement without optional fields', async () => {
      const dtoWithoutOptionals: CreateInventoryMovementDto = {
        itemId: 'item-1',
        type: InventoryMovementType.CONSUMPTION,
        quantity: 50,
        date: '2025-01-15',
        propertyId: 'property-1',
      };

      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.inventoryItem.findFirst.mockResolvedValue(
        mockInventoryItem,
      );
      prismaService.property.findFirst.mockResolvedValue(mockProperty);
      prismaService.inventoryMovement.create.mockResolvedValue({
        ...mockInventoryMovement,
        type: InventoryMovementType.CONSUMPTION,
        quantity: 50,
        supplierId: null,
        locationId: null,
        employeeIds: null,
        serviceProviderIds: null,
      });

      await service.create(mockUser.id, dtoWithoutOptionals);

      expect(prismaService.location.findFirst).not.toHaveBeenCalled();
      expect(prismaService.supplier.findFirst).not.toHaveBeenCalled();
      expect(prismaService.employee.findMany).not.toHaveBeenCalled();
      expect(prismaService.serviceProvider.findMany).not.toHaveBeenCalled();
      expect(prismaService.inventoryMovement.create).toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('should return all inventory movements for company', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.inventoryMovement.findMany.mockResolvedValue([
        mockInventoryMovement,
      ]);

      const result = await service.findAll(mockUser.id);

      expect(prismaService.inventoryMovement.findMany).toHaveBeenCalledWith({
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

    it('should exclude soft-deleted movements', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.inventoryMovement.findMany.mockResolvedValue([]);

      const result = await service.findAll(mockUser.id);

      expect(prismaService.inventoryMovement.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            deletedAt: null,
          }),
        }),
      );
      expect(result).toHaveLength(0);
    });
  });

  describe('findOne', () => {
    it('should return inventory movement by ID', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.inventoryMovement.findFirst.mockResolvedValue(
        mockInventoryMovement,
      );

      const result = await service.findOne(mockUser.id, 'movement-1');

      expect(result).toBeDefined();
      expect(result.id).toBe('movement-1');
    });

    it('should throw NotFoundException if movement not found', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.inventoryMovement.findFirst.mockResolvedValue(null);

      await expect(service.findOne(mockUser.id, 'movement-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findByItemId', () => {
    it('should return movements for specific item', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.inventoryItem.findFirst.mockResolvedValue(
        mockInventoryItem,
      );
      prismaService.inventoryMovement.findMany.mockResolvedValue([
        mockInventoryMovement,
      ]);

      const result = await service.findByItemId(mockUser.id, 'item-1');

      expect(prismaService.inventoryMovement.findMany).toHaveBeenCalledWith({
        where: {
          itemId: 'item-1',
          companyId: 'company-1',
          deletedAt: null,
        },
        orderBy: {
          date: 'desc',
        },
      });
      expect(result).toHaveLength(1);
    });

    it('should throw NotFoundException if item not found', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.inventoryItem.findFirst.mockResolvedValue(null);

      await expect(service.findByItemId(mockUser.id, 'item-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findByPropertyId', () => {
    it('should return movements for specific property', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.property.findFirst.mockResolvedValue(mockProperty);
      prismaService.inventoryMovement.findMany.mockResolvedValue([
        mockInventoryMovement,
      ]);

      const result = await service.findByPropertyId(mockUser.id, 'property-1');

      expect(prismaService.inventoryMovement.findMany).toHaveBeenCalledWith({
        where: {
          propertyId: 'property-1',
          companyId: 'company-1',
          deletedAt: null,
        },
        orderBy: {
          date: 'desc',
        },
      });
      expect(result).toHaveLength(1);
    });

    it('should throw NotFoundException if property not found', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.property.findFirst.mockResolvedValue(null);

      await expect(
        service.findByPropertyId(mockUser.id, 'property-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('findByLocationId', () => {
    it('should return movements for specific location', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.location.findFirst.mockResolvedValue(mockLocation);
      prismaService.inventoryMovement.findMany.mockResolvedValue([
        mockInventoryMovement,
      ]);

      const result = await service.findByLocationId(mockUser.id, 'location-1');

      expect(prismaService.inventoryMovement.findMany).toHaveBeenCalledWith({
        where: {
          locationId: 'location-1',
          companyId: 'company-1',
          deletedAt: null,
        },
        orderBy: {
          date: 'desc',
        },
      });
      expect(result).toHaveLength(1);
    });

    it('should throw NotFoundException if location not found', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.location.findFirst.mockResolvedValue(null);

      await expect(
        service.findByLocationId(mockUser.id, 'location-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update inventory movement successfully', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.inventoryMovement.findFirst.mockResolvedValue(
        mockInventoryMovement,
      );
      prismaService.inventoryMovement.findUnique.mockResolvedValue({
        ...mockInventoryMovement,
        propertyId: 'property-1',
      });
      prismaService.inventoryMovement.update.mockResolvedValue({
        ...mockInventoryMovement,
        quantity: 150,
      });

      const updateDto: UpdateInventoryMovementDto = {
        quantity: 150,
      };

      const result = await service.update(mockUser.id, 'movement-1', updateDto);

      expect(prismaService.inventoryMovement.update).toHaveBeenCalled();
      expect(result.quantity).toBe(150);
    });

    it('should validate inventory item on update', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.inventoryMovement.findFirst.mockResolvedValue(
        mockInventoryMovement,
      );
      prismaService.inventoryItem.findFirst.mockResolvedValue(
        mockInventoryItem,
      );
      prismaService.inventoryMovement.findUnique.mockResolvedValue({
        ...mockInventoryMovement,
        propertyId: 'property-1',
      });
      prismaService.inventoryMovement.update.mockResolvedValue(
        mockInventoryMovement,
      );

      const updateDto: UpdateInventoryMovementDto = {
        itemId: 'item-1',
      };

      await service.update(mockUser.id, 'movement-1', updateDto);

      expect(prismaService.inventoryItem.findFirst).toHaveBeenCalled();
    });

    it('should validate property on update', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.inventoryMovement.findFirst.mockResolvedValue(
        mockInventoryMovement,
      );
      prismaService.property.findFirst.mockResolvedValue(mockProperty);
      prismaService.inventoryMovement.findUnique.mockResolvedValue({
        ...mockInventoryMovement,
        propertyId: 'property-1',
      });
      prismaService.inventoryMovement.update.mockResolvedValue(
        mockInventoryMovement,
      );

      const updateDto: UpdateInventoryMovementDto = {
        propertyId: 'property-1',
      };

      await service.update(mockUser.id, 'movement-1', updateDto);

      expect(prismaService.property.findFirst).toHaveBeenCalled();
    });

    it('should handle partial updates', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.inventoryMovement.findFirst.mockResolvedValue(
        mockInventoryMovement,
      );
      prismaService.inventoryMovement.findUnique.mockResolvedValue({
        ...mockInventoryMovement,
        propertyId: 'property-1',
      });
      prismaService.inventoryMovement.update.mockResolvedValue({
        ...mockInventoryMovement,
        description: 'Updated description',
      });

      const updateDto: UpdateInventoryMovementDto = {
        description: 'Updated description',
      };

      const result = await service.update(mockUser.id, 'movement-1', updateDto);

      expect(result.description).toBe('Updated description');
    });
  });

  describe('remove', () => {
    it('should soft delete inventory movement', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.inventoryMovement.findFirst.mockResolvedValue(
        mockInventoryMovement,
      );
      prismaService.inventoryMovement.update.mockResolvedValue({
        ...mockInventoryMovement,
        deletedAt: new Date(),
      });

      await service.remove(mockUser.id, 'movement-1');

      expect(prismaService.inventoryMovement.update).toHaveBeenCalledWith({
        where: { id: 'movement-1' },
        data: { deletedAt: expect.any(Date) },
      });
    });

    it('should throw NotFoundException if movement not found', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.inventoryMovement.findFirst.mockResolvedValue(null);

      await expect(service.remove(mockUser.id, 'movement-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('transformInventoryMovement', () => {
    it('should transform movement with JSON fields', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.inventoryMovement.findFirst.mockResolvedValue(
        mockInventoryMovement,
      );

      const result = await service.findOne(mockUser.id, 'movement-1');

      expect(Array.isArray(result.employeeIds)).toBe(true);
      expect(Array.isArray(result.serviceProviderIds)).toBe(true);
      expect(Array.isArray(result.fileIds)).toBe(true);
    });

    it('should transform movement with null JSON fields', async () => {
      const movementWithNulls = {
        ...mockInventoryMovement,
        employeeIds: null,
        serviceProviderIds: null,
        fileIds: null,
      };

      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.inventoryMovement.findFirst.mockResolvedValue(
        movementWithNulls,
      );

      const result = await service.findOne(mockUser.id, 'movement-1');

      expect(result.employeeIds).toEqual([]);
      expect(result.serviceProviderIds).toEqual([]);
      expect(result.fileIds).toEqual([]);
    });

    it('should transform Decimal quantity to number', async () => {
      const movementWithDecimal = {
        ...mockInventoryMovement,
        quantity: { toNumber: () => 100 },
        unitPrice: { toNumber: () => 2.5 },
      };

      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.inventoryMovement.findFirst.mockResolvedValue(
        movementWithDecimal,
      );

      const result = await service.findOne(mockUser.id, 'movement-1');

      expect(result.quantity).toBe(100);
      expect(result.unitPrice).toBe(2.5);
    });
  });
});
