import { Test, TestingModule } from '@nestjs/testing';
import { ThrottlerModule } from '@nestjs/throttler';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { AcquisitionsController } from './acquisitions.controller';
import { AcquisitionsService } from './acquisitions.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import {
  CreateAcquisitionDto,
  UpdateAcquisitionDto,
  PricingMode,
  AcquisitionPaymentMethod,
} from './dto';
import type { CurrentUser } from '../auth/decorators/current-user.decorator';

describe('AcquisitionsController', () => {
  let controller: AcquisitionsController;
  let acquisitionsService: jest.Mocked<AcquisitionsService>;

  const mockCurrentUser: CurrentUser = {
    id: 'user-1',
    email: 'test@example.com',
    name: 'Test User',
    companyId: 'company-1',
    mainUser: false,
    permissions: {},
    company: {},
  };

  const mockAcquisition = {
    id: 'acquisition-1',
    propertyId: 'property-1',
    supplierId: 'supplier-1',
    acquisitionDate: new Date('2020-01-15'),
    pricingMode: PricingMode.INDIVIDUAL,
    paymentMethod: AcquisitionPaymentMethod.CASH_FLOW,
    totalPrice: 50000.0,
    transportationFee: 500.0,
    handlingFee: 200.0,
    fees: null,
    observation: 'Test acquisition',
    companyId: 'company-1',
    createdAt: new Date('2020-01-15'),
    updatedAt: new Date('2020-01-15'),
    acquisitionItems: [
      {
        id: 'item-1',
        acquisitionId: 'acquisition-1',
        animalId: 'animal-1',
        price: 5000.0,
        weight: 350.0,
        costPerArroba: 428.57,
      },
    ],
  };

  const mockCreateAcquisitionDto: CreateAcquisitionDto = {
    propertyId: 'property-1',
    supplierId: 'supplier-1',
    acquisitionDate: '2020-01-15',
    pricingMode: PricingMode.INDIVIDUAL,
    paymentMethod: AcquisitionPaymentMethod.CASH_FLOW,
    totalPrice: 50000.0,
    transportationFee: 500.0,
    handlingFee: 200.0,
    acquisitionItems: [
      {
        code: '001',
        registrationNumber: 'BR-2020-FJ0001',
        price: 5000.0,
        weight: 350.0,
      },
    ],
  };

  beforeEach(async () => {
    const mockAcquisitionsService = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      findByAnimalId: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      imports: [ThrottlerModule.forRoot()],
      controllers: [AcquisitionsController],
      providers: [
        {
          provide: AcquisitionsService,
          useValue: mockAcquisitionsService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(PermissionsGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<AcquisitionsController>(AcquisitionsController);
    acquisitionsService = module.get(AcquisitionsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create an acquisition successfully', async () => {
      acquisitionsService.create.mockResolvedValue(mockAcquisition);

      const result = await controller.create(
        mockCurrentUser,
        mockCreateAcquisitionDto,
      );

      expect(acquisitionsService.create).toHaveBeenCalledWith(
        mockCurrentUser.id,
        mockCreateAcquisitionDto,
      );
      expect(result).toEqual(mockAcquisition);
    });

    it('should handle ConflictException when code already exists', async () => {
      const error = new ConflictException(
        'Animal with this code already exists for your company',
      );
      acquisitionsService.create.mockRejectedValue(error);

      await expect(
        controller.create(mockCurrentUser, mockCreateAcquisitionDto),
      ).rejects.toThrow(ConflictException);
      expect(acquisitionsService.create).toHaveBeenCalledWith(
        mockCurrentUser.id,
        mockCreateAcquisitionDto,
      );
    });

    it('should handle NotFoundException when property not found', async () => {
      const error = new NotFoundException(
        'Property not found or does not belong to your company',
      );
      acquisitionsService.create.mockRejectedValue(error);

      await expect(
        controller.create(mockCurrentUser, mockCreateAcquisitionDto),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('findAll', () => {
    it('should return all acquisitions successfully', async () => {
      acquisitionsService.findAll.mockResolvedValue([mockAcquisition]);

      const result = await controller.findAll(mockCurrentUser);

      expect(acquisitionsService.findAll).toHaveBeenCalledWith(
        mockCurrentUser.id,
      );
      expect(result).toEqual([mockAcquisition]);
    });

    it('should return empty array when no acquisitions exist', async () => {
      acquisitionsService.findAll.mockResolvedValue([]);

      const result = await controller.findAll(mockCurrentUser);

      expect(result).toEqual([]);
      expect(acquisitionsService.findAll).toHaveBeenCalledWith(
        mockCurrentUser.id,
      );
    });

    it('should handle service errors', async () => {
      const error = new Error('Database connection failed');
      acquisitionsService.findAll.mockRejectedValue(error);

      await expect(controller.findAll(mockCurrentUser)).rejects.toThrow(
        'Database connection failed',
      );
    });
  });

  describe('findOne', () => {
    it('should return an acquisition by id successfully', async () => {
      acquisitionsService.findOne.mockResolvedValue(mockAcquisition);

      const result = await controller.findOne(
        mockCurrentUser,
        mockAcquisition.id,
      );

      expect(acquisitionsService.findOne).toHaveBeenCalledWith(
        mockCurrentUser.id,
        mockAcquisition.id,
      );
      expect(result).toEqual(mockAcquisition);
    });

    it('should handle NotFoundException when acquisition not found', async () => {
      const error = new NotFoundException('Acquisition record not found');
      acquisitionsService.findOne.mockRejectedValue(error);

      await expect(
        controller.findOne(mockCurrentUser, 'non-existent-id'),
      ).rejects.toThrow(NotFoundException);
      expect(acquisitionsService.findOne).toHaveBeenCalledWith(
        mockCurrentUser.id,
        'non-existent-id',
      );
    });
  });

  describe('findByAnimalId', () => {
    it('should return an acquisition by animal id successfully', async () => {
      acquisitionsService.findByAnimalId.mockResolvedValue(mockAcquisition);

      const result = await controller.findByAnimalId(
        mockCurrentUser,
        mockAcquisition.acquisitionItems[0].animalId,
      );

      expect(acquisitionsService.findByAnimalId).toHaveBeenCalledWith(
        mockCurrentUser.id,
        mockAcquisition.acquisitionItems[0].animalId,
      );
      expect(result).toEqual(mockAcquisition);
    });

    it('should handle NotFoundException when animal not found', async () => {
      const error = new NotFoundException('Animal not found');
      acquisitionsService.findByAnimalId.mockRejectedValue(error);

      await expect(
        controller.findByAnimalId(mockCurrentUser, 'non-existent-animal-id'),
      ).rejects.toThrow(NotFoundException);
      expect(acquisitionsService.findByAnimalId).toHaveBeenCalledWith(
        mockCurrentUser.id,
        'non-existent-animal-id',
      );
    });

    it('should handle NotFoundException when acquisition not found for animal', async () => {
      const error = new NotFoundException(
        'Acquisition record not found for this animal',
      );
      acquisitionsService.findByAnimalId.mockRejectedValue(error);

      await expect(
        controller.findByAnimalId(
          mockCurrentUser,
          'animal-without-acquisition',
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    const updateDto: UpdateAcquisitionDto = {
      observation: 'Updated observation',
    };

    it('should update an acquisition successfully', async () => {
      const updatedAcquisition = { ...mockAcquisition, ...updateDto };
      acquisitionsService.update.mockResolvedValue(updatedAcquisition);

      const result = await controller.update(
        mockCurrentUser,
        mockAcquisition.id,
        updateDto,
      );

      expect(acquisitionsService.update).toHaveBeenCalledWith(
        mockCurrentUser.id,
        mockAcquisition.id,
        updateDto,
      );
      expect(result).toEqual(updatedAcquisition);
    });

    it('should handle NotFoundException when acquisition not found', async () => {
      const error = new NotFoundException('Acquisition record not found');
      acquisitionsService.update.mockRejectedValue(error);

      await expect(
        controller.update(mockCurrentUser, 'non-existent-id', updateDto),
      ).rejects.toThrow(NotFoundException);
    });

    it('should handle service errors during update', async () => {
      const error = new Error('Update failed');
      acquisitionsService.update.mockRejectedValue(error);

      await expect(
        controller.update(mockCurrentUser, mockAcquisition.id, updateDto),
      ).rejects.toThrow('Update failed');
    });
  });

  describe('remove', () => {
    it('should soft delete an acquisition successfully', async () => {
      acquisitionsService.remove.mockResolvedValue({
        message: 'Acquisition record deleted successfully',
      });

      const result = await controller.remove(
        mockCurrentUser,
        mockAcquisition.id,
      );

      expect(acquisitionsService.remove).toHaveBeenCalledWith(
        mockCurrentUser.id,
        mockAcquisition.id,
      );
      expect(result).toEqual({
        message: 'Acquisition record deleted successfully',
      });
    });

    it('should handle NotFoundException when acquisition not found', async () => {
      const error = new NotFoundException('Acquisition record not found');
      acquisitionsService.remove.mockRejectedValue(error);

      await expect(
        controller.remove(mockCurrentUser, 'non-existent-id'),
      ).rejects.toThrow(NotFoundException);
      expect(acquisitionsService.remove).toHaveBeenCalledWith(
        mockCurrentUser.id,
        'non-existent-id',
      );
    });
  });
});
