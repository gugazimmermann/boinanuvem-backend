import { Test, TestingModule } from '@nestjs/testing';
import { ThrottlerModule } from '@nestjs/throttler';
import { NotFoundException } from '@nestjs/common';
import { SanitaryControlsController } from './sanitary-controls.controller';
import { SanitaryControlsService } from './sanitary-controls.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { CreateSanitaryControlDto, UpdateSanitaryControlDto } from './dto';
import type { CurrentUser } from '../auth/decorators/current-user.decorator';

describe('SanitaryControlsController', () => {
  let controller: SanitaryControlsController;
  let sanitaryControlsService: jest.Mocked<SanitaryControlsService>;

  const mockCurrentUser: CurrentUser = {
    id: 'user-1',
    email: 'test@example.com',
    name: 'Test User',
    companyId: 'company-1',
    mainUser: false,
    permissions: {},
    company: {},
  };

  const mockSanitaryControl = {
    id: 'sc-1',
    animalId: 'animal-1',
    date: new Date('2025-01-15'),
    appliedMedicines: [
      {
        itemId: 'item-1',
        quantity: 10,
        calculatedDosage: 5.5,
      },
    ],
    itemId: 'item-1', // Legacy field
    quantity: 10, // Legacy field
    calculatedDosage: 5.5, // Legacy field
    observation: 'Test control',
    companyId: 'company-1',
    employeeIds: [],
    serviceProviderIds: [],
    createdAt: new Date('2025-01-15'),
    updatedAt: new Date('2025-01-15'),
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
    const mockSanitaryControlsService = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      findByAnimalId: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      imports: [ThrottlerModule.forRoot()],
      controllers: [SanitaryControlsController],
      providers: [
        {
          provide: SanitaryControlsService,
          useValue: mockSanitaryControlsService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(PermissionsGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<SanitaryControlsController>(
      SanitaryControlsController,
    );
    sanitaryControlsService = module.get(SanitaryControlsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create a sanitary control record successfully', async () => {
      sanitaryControlsService.create.mockResolvedValue(mockSanitaryControl);

      const result = await controller.create(
        mockCurrentUser,
        mockCreateSanitaryControlDto,
      );

      expect(sanitaryControlsService.create).toHaveBeenCalledWith(
        mockCurrentUser.id,
        mockCreateSanitaryControlDto,
      );
      expect(result).toEqual(mockSanitaryControl);
      expect(Array.isArray(result.appliedMedicines)).toBe(true);
    });

    it('should handle NotFoundException when animal not found', async () => {
      const error = new NotFoundException(
        'Animal not found or does not belong to your company',
      );
      sanitaryControlsService.create.mockRejectedValue(error);

      await expect(
        controller.create(mockCurrentUser, mockCreateSanitaryControlDto),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('findAll', () => {
    it('should return all sanitary control records successfully', async () => {
      sanitaryControlsService.findAll.mockResolvedValue([mockSanitaryControl]);

      const result = await controller.findAll(mockCurrentUser);

      expect(sanitaryControlsService.findAll).toHaveBeenCalledWith(
        mockCurrentUser.id,
      );
      expect(result).toEqual([mockSanitaryControl]);
      expect(Array.isArray(result[0].appliedMedicines)).toBe(true);
    });
  });

  describe('findOne', () => {
    it('should return a sanitary control record by id successfully', async () => {
      sanitaryControlsService.findOne.mockResolvedValue(mockSanitaryControl);

      const result = await controller.findOne(mockCurrentUser, 'sc-1');

      expect(sanitaryControlsService.findOne).toHaveBeenCalledWith(
        mockCurrentUser.id,
        'sc-1',
      );
      expect(result).toEqual(mockSanitaryControl);
      expect(Array.isArray(result.appliedMedicines)).toBe(true);
    });
  });

  describe('findByAnimalId', () => {
    it('should return sanitary control records by animal id successfully', async () => {
      sanitaryControlsService.findByAnimalId.mockResolvedValue([
        mockSanitaryControl,
      ]);

      const result = await controller.findByAnimalId(
        mockCurrentUser,
        'animal-1',
      );

      expect(sanitaryControlsService.findByAnimalId).toHaveBeenCalledWith(
        mockCurrentUser.id,
        'animal-1',
      );
      expect(result).toEqual([mockSanitaryControl]);
      expect(Array.isArray(result[0].appliedMedicines)).toBe(true);
    });
  });

  describe('update', () => {
    const updateDto: UpdateSanitaryControlDto = {
      observation: 'Updated observation',
    };

    it('should update a sanitary control record successfully', async () => {
      const updated = { ...mockSanitaryControl, ...updateDto };
      sanitaryControlsService.update.mockResolvedValue(updated);

      const result = await controller.update(
        mockCurrentUser,
        'sc-1',
        updateDto,
      );

      expect(sanitaryControlsService.update).toHaveBeenCalledWith(
        mockCurrentUser.id,
        'sc-1',
        updateDto,
      );
      expect(result).toEqual(updated);
      expect(Array.isArray(result.appliedMedicines)).toBe(true);
    });

    it('should update with appliedMedicines array', async () => {
      const updateDtoWithMedicines: UpdateSanitaryControlDto = {
        appliedMedicines: [
          {
            itemId: 'item-2',
            quantity: 20,
            calculatedDosage: 10.0,
          },
        ],
      };
      const updated = {
        ...mockSanitaryControl,
        appliedMedicines: updateDtoWithMedicines.appliedMedicines,
      };
      sanitaryControlsService.update.mockResolvedValue(updated);

      const result = await controller.update(
        mockCurrentUser,
        'sc-1',
        updateDtoWithMedicines,
      );

      expect(result.appliedMedicines.length).toBe(1);
      expect(result.appliedMedicines[0].itemId).toBe('item-2');
    });
  });

  describe('remove', () => {
    it('should soft delete a sanitary control record successfully', async () => {
      sanitaryControlsService.remove.mockResolvedValue(undefined);

      await controller.remove(mockCurrentUser, 'sc-1');

      expect(sanitaryControlsService.remove).toHaveBeenCalledWith(
        mockCurrentUser.id,
        'sc-1',
      );
    });
  });
});
