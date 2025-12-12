import { Test, TestingModule } from '@nestjs/testing';
import { ThrottlerModule } from '@nestjs/throttler';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { InventoryItemsController } from './inventory-items.controller';
import { InventoryItemsService } from './inventory-items.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { CreateInventoryItemDto, UpdateInventoryItemDto } from './dto';
import type { CurrentUser } from '../auth/decorators/current-user.decorator';

describe('InventoryItemsController', () => {
  let controller: InventoryItemsController;
  let inventoryItemsService: jest.Mocked<InventoryItemsService>;

  const mockCurrentUser: CurrentUser = {
    id: 'user-1',
    email: 'test@example.com',
    name: 'Test User',
    companyId: 'company-1',
    mainUser: false,
    permissions: {},
    company: {},
  };

  const mockInventoryItem = {
    id: 'item-1',
    code: 'INV001',
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
    propertyIds: ['property-1'],
    createdAt: new Date('2025-01-15'),
    updatedAt: new Date('2025-01-15'),
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
    const mockInventoryItemsService = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      imports: [ThrottlerModule.forRoot()],
      controllers: [InventoryItemsController],
      providers: [
        {
          provide: InventoryItemsService,
          useValue: mockInventoryItemsService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(PermissionsGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<InventoryItemsController>(InventoryItemsController);
    inventoryItemsService = module.get(InventoryItemsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create an inventory item successfully', async () => {
      inventoryItemsService.create.mockResolvedValue(mockInventoryItem);

      const result = await controller.create(
        mockCurrentUser,
        mockCreateInventoryItemDto,
      );

      expect(inventoryItemsService.create).toHaveBeenCalledWith(
        mockCurrentUser.id,
        mockCreateInventoryItemDto,
      );
      expect(result).toEqual(mockInventoryItem);
    });

    it('should handle ConflictException when code already exists', async () => {
      const error = new ConflictException(
        'Inventory item with this code already exists for your company',
      );
      inventoryItemsService.create.mockRejectedValue(error);

      await expect(
        controller.create(mockCurrentUser, mockCreateInventoryItemDto),
      ).rejects.toThrow(ConflictException);
    });

    it('should handle NotFoundException when property not found', async () => {
      const error = new NotFoundException(
        'One or more properties not found or do not belong to your company',
      );
      inventoryItemsService.create.mockRejectedValue(error);

      await expect(
        controller.create(mockCurrentUser, mockCreateInventoryItemDto),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('findAll', () => {
    it('should return all inventory items successfully', async () => {
      inventoryItemsService.findAll.mockResolvedValue([mockInventoryItem]);

      const result = await controller.findAll(mockCurrentUser);

      expect(inventoryItemsService.findAll).toHaveBeenCalledWith(
        mockCurrentUser.id,
      );
      expect(result).toEqual([mockInventoryItem]);
    });

    it('should return empty array when no items exist', async () => {
      inventoryItemsService.findAll.mockResolvedValue([]);

      const result = await controller.findAll(mockCurrentUser);

      expect(result).toEqual([]);
    });
  });

  describe('findOne', () => {
    it('should return an inventory item by id successfully', async () => {
      inventoryItemsService.findOne.mockResolvedValue(mockInventoryItem);

      const result = await controller.findOne(mockCurrentUser, 'item-1');

      expect(inventoryItemsService.findOne).toHaveBeenCalledWith(
        mockCurrentUser.id,
        'item-1',
      );
      expect(result).toEqual(mockInventoryItem);
    });

    it('should handle NotFoundException when item not found', async () => {
      const error = new NotFoundException('Inventory item not found');
      inventoryItemsService.findOne.mockRejectedValue(error);

      await expect(
        controller.findOne(mockCurrentUser, 'non-existent-id'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    const updateDto: UpdateInventoryItemDto = {
      name: 'Updated Item',
    };

    it('should update an inventory item successfully', async () => {
      const updatedItem = { ...mockInventoryItem, ...updateDto };
      inventoryItemsService.update.mockResolvedValue(updatedItem);

      const result = await controller.update(
        mockCurrentUser,
        'item-1',
        updateDto,
      );

      expect(inventoryItemsService.update).toHaveBeenCalledWith(
        mockCurrentUser.id,
        'item-1',
        updateDto,
      );
      expect(result).toEqual(updatedItem);
    });

    it('should handle NotFoundException when item not found', async () => {
      const error = new NotFoundException('Inventory item not found');
      inventoryItemsService.update.mockRejectedValue(error);

      await expect(
        controller.update(mockCurrentUser, 'non-existent-id', updateDto),
      ).rejects.toThrow(NotFoundException);
    });

    it('should handle ConflictException when code already exists', async () => {
      const error = new ConflictException(
        'Inventory item with this code already exists for your company',
      );
      inventoryItemsService.update.mockRejectedValue(error);

      await expect(
        controller.update(mockCurrentUser, 'item-1', { code: 'EXISTING' }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('remove', () => {
    it('should soft delete an inventory item successfully', async () => {
      inventoryItemsService.remove.mockResolvedValue(undefined);

      await controller.remove(mockCurrentUser, 'item-1');

      expect(inventoryItemsService.remove).toHaveBeenCalledWith(
        mockCurrentUser.id,
        'item-1',
      );
    });

    it('should handle NotFoundException when item not found', async () => {
      const error = new NotFoundException('Inventory item not found');
      inventoryItemsService.remove.mockRejectedValue(error);

      await expect(
        controller.remove(mockCurrentUser, 'non-existent-id'),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
