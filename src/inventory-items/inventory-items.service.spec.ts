import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { InventoryItemsService } from './inventory-items.service';
import { PrismaService } from '../common/services/prisma.service';
import {
  CreateInventoryItemDto,
  UpdateInventoryItemDto,
  InventoryItemCategory,
} from './dto';

describe('InventoryItemsService', () => {
  let service: InventoryItemsService;
  let prismaService: jest.Mocked<PrismaService>;

  const mockUser = {
    id: 'user-1',
    companyId: 'company-1',
  };

  const mockProperty = {
    id: 'property-1',
    companyId: 'company-1',
    deletedAt: null,
  };

  const mockSupplier = {
    id: 'supplier-1',
    companyId: 'company-1',
    deletedAt: null,
  };

  const mockInventoryItem = {
    id: 'item-1',
    code: 'INV000',
    name: 'Test Item',
    description: 'Test description',
    category: 'medication',
    customCategory: null,
    unit: 'kg',
    minimumStock: 10,
    unitPrice: 50.0,
    supplierId: 'supplier-1',
    hasExpiration: false,
    expirationDate: null,
    usageAmount: null,
    usageUnit: null,
    usageBasis: null,
    companyId: 'company-1',
    deletedAt: null,
    createdAt: new Date('2025-01-15'),
    updatedAt: new Date('2025-01-15'),
    properties: [{ propertyId: 'property-1' }],
  };

  const mockCreateInventoryItemDto: CreateInventoryItemDto = {
    code: 'INV001',
    name: 'Test Item',
    description: 'Test description',
    category: 'medication',
    unit: 'kg',
    minimumStock: 10,
    unitPrice: 50.0,
    propertyIds: ['property-1'],
  };

  beforeEach(async () => {
    const mockPrismaService = {
      user: {
        findUnique: jest.fn(),
      },
      property: {
        findMany: jest.fn(),
      },
      supplier: {
        findFirst: jest.fn(),
      },
      inventoryItem: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        findUnique: jest.fn(),
      },
      inventoryItemProperty: {
        createMany: jest.fn(),
        deleteMany: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InventoryItemsService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<InventoryItemsService>(InventoryItemsService);
    prismaService = module.get(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create an inventory item successfully', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.property.findMany.mockResolvedValue([mockProperty]);
      prismaService.inventoryItem.findFirst.mockResolvedValue(null); // No existing code
      prismaService.inventoryItem.create.mockResolvedValue(mockInventoryItem);
      prismaService.inventoryItemProperty.createMany.mockResolvedValue({
        count: 1,
      });
      prismaService.inventoryItem.findUnique.mockResolvedValue({
        ...mockInventoryItem,
        properties: [{ propertyId: 'property-1' }],
      });

      const result = await service.create(
        mockUser.id,
        mockCreateInventoryItemDto,
      );

      expect(prismaService.inventoryItem.create).toHaveBeenCalled();
      expect(prismaService.inventoryItemProperty.createMany).toHaveBeenCalled();
      expect(result).toBeDefined();
      expect(result.id).toBe('item-1');
    });

    it('should throw ConflictException if code already exists', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.property.findMany.mockResolvedValue([mockProperty]);
      prismaService.inventoryItem.findFirst.mockResolvedValue(
        mockInventoryItem,
      ); // Existing code

      await expect(
        service.create(mockUser.id, mockCreateInventoryItemDto),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw NotFoundException if property not found', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.property.findMany.mockResolvedValue([]); // No properties found

      await expect(
        service.create(mockUser.id, mockCreateInventoryItemDto),
      ).rejects.toThrow(NotFoundException);
    });

    it('should validate supplier if provided', async () => {
      const dtoWithSupplier = {
        ...mockCreateInventoryItemDto,
        supplierId: 'supplier-1',
      };

      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.property.findMany.mockResolvedValue([mockProperty]);
      prismaService.inventoryItem.findFirst.mockResolvedValue(null);
      prismaService.supplier.findFirst.mockResolvedValue(mockSupplier);
      prismaService.inventoryItem.create.mockResolvedValue(mockInventoryItem);
      prismaService.inventoryItemProperty.createMany.mockResolvedValue({
        count: 1,
      });
      prismaService.inventoryItem.findUnique.mockResolvedValue({
        ...mockInventoryItem,
        properties: [{ propertyId: 'property-1' }],
      });

      await service.create(mockUser.id, dtoWithSupplier);

      expect(prismaService.supplier.findFirst).toHaveBeenCalled();
    });

    it('should throw NotFoundException if supplier not found', async () => {
      const dtoWithSupplier = {
        ...mockCreateInventoryItemDto,
        supplierId: 'supplier-1',
      };

      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.property.findMany.mockResolvedValue([mockProperty]);
      prismaService.inventoryItem.findFirst.mockResolvedValue(null);
      prismaService.supplier.findFirst.mockResolvedValue(null);

      await expect(
        service.create(mockUser.id, dtoWithSupplier),
      ).rejects.toThrow(NotFoundException);
    });

    it('should create item without supplierId', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.property.findMany.mockResolvedValue([mockProperty]);
      prismaService.inventoryItem.findFirst.mockResolvedValue(null);
      prismaService.inventoryItem.create.mockResolvedValue(mockInventoryItem);
      prismaService.inventoryItemProperty.createMany.mockResolvedValue({
        count: 1,
      });
      prismaService.inventoryItem.findUnique.mockResolvedValue({
        ...mockInventoryItem,
        properties: [{ propertyId: 'property-1' }],
      });

      const dtoWithoutSupplier = {
        ...mockCreateInventoryItemDto,
        supplierId: undefined,
      };

      await service.create(mockUser.id, dtoWithoutSupplier);

      expect(prismaService.supplier.findFirst).not.toHaveBeenCalled();
      expect(prismaService.inventoryItem.create).toHaveBeenCalled();
    });

    it('should create item with expirationDate', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.property.findMany.mockResolvedValue([mockProperty]);
      prismaService.inventoryItem.findFirst.mockResolvedValue(null);
      prismaService.inventoryItem.create.mockResolvedValue({
        ...mockInventoryItem,
        hasExpiration: true,
        expirationDate: new Date('2025-12-31'),
      });
      prismaService.inventoryItemProperty.createMany.mockResolvedValue({
        count: 1,
      });
      prismaService.inventoryItem.findUnique.mockResolvedValue({
        ...mockInventoryItem,
        hasExpiration: true,
        expirationDate: new Date('2025-12-31'),
        properties: [{ propertyId: 'property-1' }],
      });

      const dtoWithExpiration: CreateInventoryItemDto = {
        ...mockCreateInventoryItemDto,
        hasExpiration: true,
        expirationDate: '2025-12-31',
      };

      await service.create(mockUser.id, dtoWithExpiration);

      expect(prismaService.inventoryItem.create).toHaveBeenCalled();
    });

    it('should create item with customCategory when category is CUSTOM', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.property.findMany.mockResolvedValue([mockProperty]);
      prismaService.inventoryItem.findFirst.mockResolvedValue(null);
      prismaService.inventoryItem.create.mockResolvedValue({
        ...mockInventoryItem,
        category: InventoryItemCategory.CUSTOM,
        customCategory: 'My Custom Category',
      });
      prismaService.inventoryItemProperty.createMany.mockResolvedValue({
        count: 1,
      });
      prismaService.inventoryItem.findUnique.mockResolvedValue({
        ...mockInventoryItem,
        category: InventoryItemCategory.CUSTOM,
        customCategory: 'My Custom Category',
        properties: [{ propertyId: 'property-1' }],
      });

      const dtoWithCustom: CreateInventoryItemDto = {
        ...mockCreateInventoryItemDto,
        category: InventoryItemCategory.CUSTOM,
        customCategory: 'My Custom Category',
      };

      await service.create(mockUser.id, dtoWithCustom);

      expect(prismaService.inventoryItem.create).toHaveBeenCalled();
    });

    it('should create item with empty propertyIds array', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.inventoryItem.findFirst.mockResolvedValue(null);
      prismaService.inventoryItem.create.mockResolvedValue(mockInventoryItem);
      prismaService.inventoryItem.findUnique.mockResolvedValue({
        ...mockInventoryItem,
        properties: [],
      });

      const dtoWithEmptyProperties: CreateInventoryItemDto = {
        ...mockCreateInventoryItemDto,
        propertyIds: [],
      };

      await service.create(mockUser.id, dtoWithEmptyProperties);

      expect(prismaService.property.findMany).not.toHaveBeenCalled();
      // When propertyIds is empty, createMany is not called
      expect(
        prismaService.inventoryItemProperty.createMany,
      ).not.toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('should return all inventory items for company', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.inventoryItem.findMany.mockResolvedValue([
        mockInventoryItem,
      ]);

      const result = await service.findAll(mockUser.id);

      expect(prismaService.inventoryItem.findMany).toHaveBeenCalledWith({
        where: {
          companyId: 'company-1',
          deletedAt: null,
        },
        include: {
          properties: {
            select: {
              propertyId: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });
      expect(result).toHaveLength(1);
    });
  });

  describe('findOne', () => {
    it('should return inventory item by ID', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.inventoryItem.findFirst.mockResolvedValue(
        mockInventoryItem,
      );

      const result = await service.findOne(mockUser.id, 'item-1');

      expect(result).toBeDefined();
      expect(result.id).toBe('item-1');
    });

    it('should throw NotFoundException if item not found', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.inventoryItem.findFirst.mockResolvedValue(null);

      await expect(service.findOne(mockUser.id, 'item-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('should update inventory item successfully', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.inventoryItem.findFirst.mockResolvedValue(
        mockInventoryItem,
      );
      prismaService.inventoryItem.update.mockResolvedValue({
        ...mockInventoryItem,
        name: 'Updated Item',
      });
      prismaService.inventoryItem.findUnique.mockResolvedValue({
        ...mockInventoryItem,
        name: 'Updated Item',
        properties: [{ propertyId: 'property-1' }],
      });

      const updateDto: UpdateInventoryItemDto = {
        name: 'Updated Item',
      };

      const result = await service.update(mockUser.id, 'item-1', updateDto);

      expect(prismaService.inventoryItem.update).toHaveBeenCalled();
      expect(result.name).toBe('Updated Item');
    });

    it('should throw ConflictException if code already exists', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.inventoryItem.findFirst
        .mockResolvedValueOnce(mockInventoryItem) // Existing item (code: 'INV000')
        .mockResolvedValueOnce({
          ...mockInventoryItem,
          id: 'item-2',
          code: 'INV001',
        }); // Another item with code 'INV001' that conflicts

      const updateDto: UpdateInventoryItemDto = {
        code: 'INV001',
      };

      await expect(
        service.update(mockUser.id, 'item-1', updateDto),
      ).rejects.toThrow(ConflictException);
    });

    it('should update property relations', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.inventoryItem.findFirst.mockResolvedValue(
        mockInventoryItem,
      );
      prismaService.property.findMany.mockResolvedValue([mockProperty]);
      prismaService.inventoryItemProperty.deleteMany.mockResolvedValue({
        count: 1,
      });
      prismaService.inventoryItemProperty.createMany.mockResolvedValue({
        count: 1,
      });
      prismaService.inventoryItem.update.mockResolvedValue(mockInventoryItem);
      prismaService.inventoryItem.findUnique.mockResolvedValue({
        ...mockInventoryItem,
        properties: [{ propertyId: 'property-1' }],
      });

      const updateDto: UpdateInventoryItemDto = {
        propertyIds: ['property-1'],
      };

      await service.update(mockUser.id, 'item-1', updateDto);

      expect(prismaService.inventoryItemProperty.deleteMany).toHaveBeenCalled();
      expect(prismaService.inventoryItemProperty.createMany).toHaveBeenCalled();
    });

    it('should not validate code if unchanged', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.inventoryItem.findFirst.mockResolvedValue(
        mockInventoryItem,
      );
      prismaService.inventoryItem.update.mockResolvedValue(mockInventoryItem);
      prismaService.inventoryItem.findUnique.mockResolvedValue({
        ...mockInventoryItem,
        properties: [{ propertyId: 'property-1' }],
      });

      const updateDto: UpdateInventoryItemDto = {
        code: 'INV000', // Same as existing
      };

      await service.update(mockUser.id, 'item-1', updateDto);

      // Should not call findByCode again since code is unchanged
      expect(prismaService.inventoryItem.findFirst).toHaveBeenCalledTimes(1);
    });

    it('should not validate code if empty string', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.inventoryItem.findFirst.mockResolvedValue(
        mockInventoryItem,
      );
      prismaService.inventoryItem.update.mockResolvedValue(mockInventoryItem);
      prismaService.inventoryItem.findUnique.mockResolvedValue({
        ...mockInventoryItem,
        properties: [{ propertyId: 'property-1' }],
      });

      const updateDto: UpdateInventoryItemDto = {
        code: '',
      };

      await service.update(mockUser.id, 'item-1', updateDto);

      expect(prismaService.inventoryItem.update).toHaveBeenCalled();
    });

    it('should update category to CUSTOM and set customCategory', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.inventoryItem.findFirst.mockResolvedValue(
        mockInventoryItem,
      );
      prismaService.inventoryItem.update.mockResolvedValue({
        ...mockInventoryItem,
        category: InventoryItemCategory.CUSTOM,
        customCategory: 'New Custom',
      });
      prismaService.inventoryItem.findUnique.mockResolvedValue({
        ...mockInventoryItem,
        category: InventoryItemCategory.CUSTOM,
        customCategory: 'New Custom',
        properties: [{ propertyId: 'property-1' }],
      });

      const updateDto: UpdateInventoryItemDto = {
        category: InventoryItemCategory.CUSTOM,
        customCategory: 'New Custom',
      };

      await service.update(mockUser.id, 'item-1', updateDto);

      expect(prismaService.inventoryItem.update).toHaveBeenCalled();
    });

    it('should update category from CUSTOM to other and set customCategory to null', async () => {
      const itemWithCustom = {
        ...mockInventoryItem,
        category: InventoryItemCategory.CUSTOM,
        customCategory: 'Old Custom',
      };
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.inventoryItem.findFirst.mockResolvedValue(itemWithCustom);
      prismaService.inventoryItem.update.mockResolvedValue({
        ...itemWithCustom,
        category: InventoryItemCategory.FEED,
        customCategory: null,
      });
      prismaService.inventoryItem.findUnique.mockResolvedValue({
        ...itemWithCustom,
        category: InventoryItemCategory.FEED,
        customCategory: null,
        properties: [{ propertyId: 'property-1' }],
      });

      const updateDto: UpdateInventoryItemDto = {
        category: InventoryItemCategory.FEED,
      };

      await service.update(mockUser.id, 'item-1', updateDto);

      expect(prismaService.inventoryItem.update).toHaveBeenCalled();
    });

    it('should update with empty propertyIds array', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.inventoryItem.findFirst.mockResolvedValue(
        mockInventoryItem,
      );
      prismaService.inventoryItemProperty.deleteMany.mockResolvedValue({
        count: 1,
      });
      prismaService.inventoryItem.update.mockResolvedValue(mockInventoryItem);
      prismaService.inventoryItem.findUnique.mockResolvedValue({
        ...mockInventoryItem,
        properties: [],
      });

      const updateDto: UpdateInventoryItemDto = {
        propertyIds: [],
      };

      await service.update(mockUser.id, 'item-1', updateDto);

      expect(prismaService.inventoryItemProperty.deleteMany).toHaveBeenCalled();
      // When propertyIds is empty, createMany is not called (length check prevents it)
      expect(
        prismaService.inventoryItemProperty.createMany,
      ).not.toHaveBeenCalled();
    });

    it('should update supplierId to null', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.inventoryItem.findFirst.mockResolvedValue(
        mockInventoryItem,
      );
      prismaService.inventoryItem.update.mockResolvedValue({
        ...mockInventoryItem,
        supplierId: null,
      });
      prismaService.inventoryItem.findUnique.mockResolvedValue({
        ...mockInventoryItem,
        supplierId: null,
        properties: [{ propertyId: 'property-1' }],
      });

      const updateDto: UpdateInventoryItemDto = {
        supplierId: null,
      };

      await service.update(mockUser.id, 'item-1', updateDto);

      expect(prismaService.inventoryItem.update).toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('should soft delete inventory item', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.inventoryItem.findFirst.mockResolvedValue(
        mockInventoryItem,
      );
      prismaService.inventoryItem.update.mockResolvedValue({
        ...mockInventoryItem,
        deletedAt: new Date(),
      });

      await service.remove(mockUser.id, 'item-1');

      expect(prismaService.inventoryItem.update).toHaveBeenCalledWith({
        where: { id: 'item-1' },
        data: { deletedAt: expect.any(Date) },
      });
    });
  });

  describe('transform methods', () => {
    it('should transform item with null Decimal values', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      const itemWithNulls = {
        ...mockInventoryItem,
        unitPrice: null,
        usageAmount: null,
      };
      prismaService.inventoryItem.findFirst.mockResolvedValue(itemWithNulls);

      const result = await service.findOne(mockUser.id, 'item-1');

      expect(result.unitPrice).toBeUndefined();
      expect(result.usageAmount).toBeUndefined();
    });

    it('should transform item with number values (not Decimal objects)', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      const itemWithNumbers = {
        ...mockInventoryItem,
        minimumStock: 10,
        unitPrice: 50.0,
        usageAmount: 5.0,
      };
      prismaService.inventoryItem.findFirst.mockResolvedValue(itemWithNumbers);

      const result = await service.findOne(mockUser.id, 'item-1');

      expect(result.minimumStock).toBe(10);
      expect(result.unitPrice).toBe(50.0);
      expect(result.usageAmount).toBe(5.0);
    });

    it('should transform item with Decimal objects', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      const itemWithDecimals = {
        ...mockInventoryItem,
        minimumStock: { toNumber: () => 10 },
        unitPrice: { toNumber: () => 50.0 },
        usageAmount: { toNumber: () => 5.0 },
      };
      prismaService.inventoryItem.findFirst.mockResolvedValue(itemWithDecimals);

      const result = await service.findOne(mockUser.id, 'item-1');

      expect(result.minimumStock).toBe(10);
      expect(result.unitPrice).toBe(50.0);
      expect(result.usageAmount).toBe(5.0);
    });

    it('should transform item without properties', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      const itemWithoutProperties = {
        ...mockInventoryItem,
        properties: undefined,
      };
      prismaService.inventoryItem.findFirst.mockResolvedValue(
        itemWithoutProperties,
      );

      const result = await service.findOne(mockUser.id, 'item-1');

      expect(result.propertyIds).toEqual([]);
    });
  });
});
