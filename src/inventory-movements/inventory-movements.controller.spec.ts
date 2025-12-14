import { Test, TestingModule } from '@nestjs/testing';
import { ThrottlerModule } from '@nestjs/throttler';
import { NotFoundException } from '@nestjs/common';
import { InventoryMovementsController } from './inventory-movements.controller';
import { InventoryMovementsService } from './inventory-movements.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import {
  CreateInventoryMovementDto,
  UpdateInventoryMovementDto,
  InventoryMovementType,
} from './dto';
import type { CurrentUser } from '../auth/decorators/current-user.decorator';

describe('InventoryMovementsController', () => {
  let controller: InventoryMovementsController;
  let inventoryMovementsService: jest.Mocked<InventoryMovementsService>;

  const mockCurrentUser: CurrentUser = {
    id: 'user-1',
    email: 'test@example.com',
    name: 'Test User',
    companyId: 'company-1',
    mainUser: false,
    permissions: {},
    company: {},
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
    employeeIds: ['employee-1'],
    serviceProviderIds: ['sp-1'],
    observation: 'Test observation',
    fileIds: ['file-1'],
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
    const mockInventoryMovementsService = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      findByItemId: jest.fn(),
      findByPropertyId: jest.fn(),
      findByLocationId: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      imports: [ThrottlerModule.forRoot()],
      controllers: [InventoryMovementsController],
      providers: [
        {
          provide: InventoryMovementsService,
          useValue: mockInventoryMovementsService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(PermissionsGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<InventoryMovementsController>(
      InventoryMovementsController,
    );
    inventoryMovementsService = module.get(InventoryMovementsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create an inventory movement successfully', async () => {
      inventoryMovementsService.create.mockResolvedValue(mockInventoryMovement);

      const result = await controller.create(
        mockCurrentUser,
        mockCreateInventoryMovementDto,
      );

      expect(inventoryMovementsService.create).toHaveBeenCalledWith(
        mockCurrentUser.id,
        mockCreateInventoryMovementDto,
      );
      expect(result).toEqual(mockInventoryMovement);
    });
  });

  describe('findAll', () => {
    it('should return all inventory movements', async () => {
      inventoryMovementsService.findAll.mockResolvedValue([
        mockInventoryMovement,
      ]);

      const result = await controller.findAll(mockCurrentUser);

      expect(inventoryMovementsService.findAll).toHaveBeenCalledWith(
        mockCurrentUser.id,
      );
      expect(result).toEqual([mockInventoryMovement]);
    });
  });

  describe('findOne', () => {
    it('should return inventory movement by ID', async () => {
      inventoryMovementsService.findOne.mockResolvedValue(
        mockInventoryMovement,
      );

      const result = await controller.findOne(mockCurrentUser, 'movement-1');

      expect(inventoryMovementsService.findOne).toHaveBeenCalledWith(
        mockCurrentUser.id,
        'movement-1',
      );
      expect(result).toEqual(mockInventoryMovement);
    });

    it('should throw NotFoundException if movement not found', async () => {
      inventoryMovementsService.findOne.mockRejectedValue(
        new NotFoundException('Inventory movement not found'),
      );

      await expect(
        controller.findOne(mockCurrentUser, 'movement-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('findByItemId', () => {
    it('should return movements for specific item', async () => {
      inventoryMovementsService.findByItemId.mockResolvedValue([
        mockInventoryMovement,
      ]);

      const result = await controller.findByItemId(mockCurrentUser, 'item-1');

      expect(inventoryMovementsService.findByItemId).toHaveBeenCalledWith(
        mockCurrentUser.id,
        'item-1',
      );
      expect(result).toEqual([mockInventoryMovement]);
    });
  });

  describe('findByPropertyId', () => {
    it('should return movements for specific property', async () => {
      inventoryMovementsService.findByPropertyId.mockResolvedValue([
        mockInventoryMovement,
      ]);

      const result = await controller.findByPropertyId(
        mockCurrentUser,
        'property-1',
      );

      expect(inventoryMovementsService.findByPropertyId).toHaveBeenCalledWith(
        mockCurrentUser.id,
        'property-1',
      );
      expect(result).toEqual([mockInventoryMovement]);
    });
  });

  describe('findByLocationId', () => {
    it('should return movements for specific location', async () => {
      inventoryMovementsService.findByLocationId.mockResolvedValue([
        mockInventoryMovement,
      ]);

      const result = await controller.findByLocationId(
        mockCurrentUser,
        'location-1',
      );

      expect(inventoryMovementsService.findByLocationId).toHaveBeenCalledWith(
        mockCurrentUser.id,
        'location-1',
      );
      expect(result).toEqual([mockInventoryMovement]);
    });
  });

  describe('update', () => {
    it('should update inventory movement successfully', async () => {
      const updateDto: UpdateInventoryMovementDto = {
        quantity: 150,
      };

      const updatedMovement = {
        ...mockInventoryMovement,
        quantity: 150,
      };

      inventoryMovementsService.update.mockResolvedValue(updatedMovement);

      const result = await controller.update(
        mockCurrentUser,
        'movement-1',
        updateDto,
      );

      expect(inventoryMovementsService.update).toHaveBeenCalledWith(
        mockCurrentUser.id,
        'movement-1',
        updateDto,
      );
      expect(result).toEqual(updatedMovement);
    });
  });

  describe('remove', () => {
    it('should remove inventory movement successfully', async () => {
      inventoryMovementsService.remove.mockResolvedValue(undefined);

      await controller.remove(mockCurrentUser, 'movement-1');

      expect(inventoryMovementsService.remove).toHaveBeenCalledWith(
        mockCurrentUser.id,
        'movement-1',
      );
    });
  });
});
