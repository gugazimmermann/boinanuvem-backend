import { Test, TestingModule } from '@nestjs/testing';
import { ThrottlerModule } from '@nestjs/throttler';
import { NotFoundException } from '@nestjs/common';
import { BreedingsController } from './breedings.controller';
import { BreedingsService } from './breedings.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { CreateBreedingDto, UpdateBreedingDto, BreedingMethod } from './dto';
import type { CurrentUser } from '../auth/decorators/current-user.decorator';

describe('BreedingsController', () => {
  let controller: BreedingsController;
  let breedingsService: jest.Mocked<BreedingsService>;

  const mockCurrentUser: CurrentUser = {
    id: 'user-1',
    email: 'test@example.com',
    name: 'Test User',
    companyId: 'company-1',
    mainUser: false,
    permissions: {},
    company: {},
  };

  const mockBreeding = {
    id: 'breeding-1',
    animalId: 'animal-1',
    date: new Date('2025-01-15'),
    method: BreedingMethod.NATURAL,
    bullId: 'bull-1',
    attemptNumber: null,
    semenCode: null,
    confirmed: false,
    observation: 'Test breeding',
    companyId: 'company-1',
    employeeIds: [],
    serviceProviderIds: [],
    createdAt: new Date('2025-01-15'),
    updatedAt: new Date('2025-01-15'),
  };

  const mockCreateBreedingDto: CreateBreedingDto = {
    animalId: 'animal-1',
    date: '2025-01-15',
    method: BreedingMethod.NATURAL,
    bullId: 'bull-1',
    observation: 'Test breeding',
  };

  beforeEach(async () => {
    const mockBreedingsService = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      findByAnimalId: jest.fn(),
      findUnconfirmed: jest.fn(),
      getNextAttemptNumber: jest.fn(),
      isAnimalPregnant: jest.fn(),
      getMostRecentConfirmedBreeding: jest.fn(),
      findByPropertyId: jest.fn(),
      getPregnantAnimalsByProperty: jest.fn(),
      update: jest.fn(),
      confirm: jest.fn(),
      unconfirmMostRecentBreeding: jest.fn(),
      remove: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      imports: [ThrottlerModule.forRoot()],
      controllers: [BreedingsController],
      providers: [
        {
          provide: BreedingsService,
          useValue: mockBreedingsService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(PermissionsGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<BreedingsController>(BreedingsController);
    breedingsService = module.get(BreedingsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create a breeding successfully', async () => {
      breedingsService.create.mockResolvedValue(mockBreeding);

      const result = await controller.create(
        mockCurrentUser,
        mockCreateBreedingDto,
      );

      expect(breedingsService.create).toHaveBeenCalledWith(
        mockCurrentUser.id,
        mockCreateBreedingDto,
      );
      expect(result).toEqual(mockBreeding);
    });

    it('should handle NotFoundException when animal not found', async () => {
      const error = new NotFoundException(
        'Animal not found or does not belong to your company',
      );
      breedingsService.create.mockRejectedValue(error);

      await expect(
        controller.create(mockCurrentUser, mockCreateBreedingDto),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('findAll', () => {
    it('should return all breedings successfully', async () => {
      breedingsService.findAll.mockResolvedValue([mockBreeding]);

      const result = await controller.findAll(mockCurrentUser);

      expect(breedingsService.findAll).toHaveBeenCalledWith(mockCurrentUser.id);
      expect(result).toEqual([mockBreeding]);
    });

    it('should return empty array when no breedings exist', async () => {
      breedingsService.findAll.mockResolvedValue([]);

      const result = await controller.findAll(mockCurrentUser);

      expect(result).toEqual([]);
    });
  });

  describe('findOne', () => {
    it('should return a breeding by id successfully', async () => {
      breedingsService.findOne.mockResolvedValue(mockBreeding);

      const result = await controller.findOne(mockCurrentUser, 'breeding-1');

      expect(breedingsService.findOne).toHaveBeenCalledWith(
        mockCurrentUser.id,
        'breeding-1',
      );
      expect(result).toEqual(mockBreeding);
    });

    it('should handle NotFoundException when breeding not found', async () => {
      const error = new NotFoundException('Breeding not found');
      breedingsService.findOne.mockRejectedValue(error);

      await expect(
        controller.findOne(mockCurrentUser, 'non-existent-id'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('findByAnimalId', () => {
    it('should return breedings by animal id successfully', async () => {
      breedingsService.findByAnimalId.mockResolvedValue([mockBreeding]);

      const result = await controller.findByAnimalId(
        mockCurrentUser,
        'animal-1',
      );

      expect(breedingsService.findByAnimalId).toHaveBeenCalledWith(
        mockCurrentUser.id,
        'animal-1',
      );
      expect(result).toEqual([mockBreeding]);
    });

    it('should handle NotFoundException when animal not found', async () => {
      const error = new NotFoundException(
        'Animal not found or does not belong to your company',
      );
      breedingsService.findByAnimalId.mockRejectedValue(error);

      await expect(
        controller.findByAnimalId(mockCurrentUser, 'non-existent-animal-id'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    const updateDto: UpdateBreedingDto = {
      observation: 'Updated observation',
    };

    it('should update a breeding successfully', async () => {
      const updatedBreeding = { ...mockBreeding, ...updateDto };
      breedingsService.update.mockResolvedValue(updatedBreeding);

      const result = await controller.update(
        mockCurrentUser,
        'breeding-1',
        updateDto,
      );

      expect(breedingsService.update).toHaveBeenCalledWith(
        mockCurrentUser.id,
        'breeding-1',
        updateDto,
      );
      expect(result).toEqual(updatedBreeding);
    });

    it('should handle NotFoundException when breeding not found', async () => {
      const error = new NotFoundException('Breeding not found');
      breedingsService.update.mockRejectedValue(error);

      await expect(
        controller.update(mockCurrentUser, 'non-existent-id', updateDto),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('confirm', () => {
    it('should confirm a breeding successfully', async () => {
      const confirmedBreeding = { ...mockBreeding, confirmed: true };
      breedingsService.confirm.mockResolvedValue(confirmedBreeding);

      const result = await controller.confirm(mockCurrentUser, 'breeding-1');

      expect(breedingsService.confirm).toHaveBeenCalledWith(
        mockCurrentUser.id,
        'breeding-1',
      );
      expect(result).toEqual(confirmedBreeding);
    });

    it('should handle NotFoundException when breeding not found', async () => {
      const error = new NotFoundException('Breeding not found');
      breedingsService.confirm.mockRejectedValue(error);

      await expect(
        controller.confirm(mockCurrentUser, 'non-existent-id'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('findUnconfirmed', () => {
    it('should return unconfirmed breedings successfully', async () => {
      breedingsService.findUnconfirmed.mockResolvedValue([mockBreeding]);

      const result = await controller.findUnconfirmed(mockCurrentUser);

      expect(breedingsService.findUnconfirmed).toHaveBeenCalledWith(
        mockCurrentUser.id,
      );
      expect(result).toEqual([mockBreeding]);
    });

    it('should return empty array when no unconfirmed breedings exist', async () => {
      breedingsService.findUnconfirmed.mockResolvedValue([]);

      const result = await controller.findUnconfirmed(mockCurrentUser);

      expect(result).toEqual([]);
    });
  });

  describe('getNextAttemptNumber', () => {
    it('should return next attempt number successfully', async () => {
      const mockResponse = { nextAttemptNumber: 2 };
      breedingsService.getNextAttemptNumber.mockResolvedValue(mockResponse);

      const result = await controller.getNextAttemptNumber(
        mockCurrentUser,
        'animal-1',
      );

      expect(breedingsService.getNextAttemptNumber).toHaveBeenCalledWith(
        mockCurrentUser.id,
        'animal-1',
      );
      expect(result).toEqual(mockResponse);
    });

    it('should handle NotFoundException when animal not found', async () => {
      const error = new NotFoundException(
        'Animal not found or does not belong to your company',
      );
      breedingsService.getNextAttemptNumber.mockRejectedValue(error);

      await expect(
        controller.getNextAttemptNumber(mockCurrentUser, 'non-existent-id'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('isAnimalPregnant', () => {
    it('should return pregnancy status successfully', async () => {
      const mockResponse = { isPregnant: true };
      breedingsService.isAnimalPregnant.mockResolvedValue(mockResponse);

      const result = await controller.isAnimalPregnant(
        mockCurrentUser,
        'animal-1',
      );

      expect(breedingsService.isAnimalPregnant).toHaveBeenCalledWith(
        mockCurrentUser.id,
        'animal-1',
      );
      expect(result).toEqual(mockResponse);
    });

    it('should return false when animal is not pregnant', async () => {
      const mockResponse = { isPregnant: false };
      breedingsService.isAnimalPregnant.mockResolvedValue(mockResponse);

      const result = await controller.isAnimalPregnant(
        mockCurrentUser,
        'animal-1',
      );

      expect(result.isPregnant).toBe(false);
    });

    it('should handle NotFoundException when animal not found', async () => {
      const error = new NotFoundException(
        'Animal not found or does not belong to your company',
      );
      breedingsService.isAnimalPregnant.mockRejectedValue(error);

      await expect(
        controller.isAnimalPregnant(mockCurrentUser, 'non-existent-id'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getMostRecentConfirmedBreeding', () => {
    it('should return most recent confirmed breeding successfully', async () => {
      const confirmedBreeding = { ...mockBreeding, confirmed: true };
      breedingsService.getMostRecentConfirmedBreeding.mockResolvedValue(
        confirmedBreeding,
      );

      const result = await controller.getMostRecentConfirmedBreeding(
        mockCurrentUser,
        'animal-1',
      );

      expect(
        breedingsService.getMostRecentConfirmedBreeding,
      ).toHaveBeenCalledWith(mockCurrentUser.id, 'animal-1');
      expect(result).toEqual(confirmedBreeding);
    });

    it('should return null when no confirmed breeding exists', async () => {
      breedingsService.getMostRecentConfirmedBreeding.mockResolvedValue(null);

      const result = await controller.getMostRecentConfirmedBreeding(
        mockCurrentUser,
        'animal-1',
      );

      expect(result).toBeNull();
    });

    it('should handle NotFoundException when animal not found', async () => {
      const error = new NotFoundException(
        'Animal not found or does not belong to your company',
      );
      breedingsService.getMostRecentConfirmedBreeding.mockRejectedValue(error);

      await expect(
        controller.getMostRecentConfirmedBreeding(
          mockCurrentUser,
          'non-existent-id',
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('findByPropertyId', () => {
    it('should return breedings by property successfully', async () => {
      breedingsService.findByPropertyId.mockResolvedValue([mockBreeding]);

      const result = await controller.findByPropertyId(
        mockCurrentUser,
        'property-1',
      );

      expect(breedingsService.findByPropertyId).toHaveBeenCalledWith(
        mockCurrentUser.id,
        'property-1',
      );
      expect(result).toEqual([mockBreeding]);
    });

    it('should return empty array when no breedings exist for property', async () => {
      breedingsService.findByPropertyId.mockResolvedValue([]);

      const result = await controller.findByPropertyId(
        mockCurrentUser,
        'property-1',
      );

      expect(result).toEqual([]);
    });

    it('should handle NotFoundException when property not found', async () => {
      const error = new NotFoundException(
        'Property not found or does not belong to your company',
      );
      breedingsService.findByPropertyId.mockRejectedValue(error);

      await expect(
        controller.findByPropertyId(mockCurrentUser, 'non-existent-id'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getPregnantAnimalsByProperty', () => {
    it('should return pregnant animal IDs successfully', async () => {
      const mockResponse = { animalIds: ['animal-1', 'animal-2'] };
      breedingsService.getPregnantAnimalsByProperty.mockResolvedValue(
        mockResponse,
      );

      const result = await controller.getPregnantAnimalsByProperty(
        mockCurrentUser,
        'property-1',
      );

      expect(
        breedingsService.getPregnantAnimalsByProperty,
      ).toHaveBeenCalledWith(mockCurrentUser.id, 'property-1');
      expect(result).toEqual(mockResponse);
    });

    it('should return empty array when no pregnant animals exist', async () => {
      const mockResponse = { animalIds: [] };
      breedingsService.getPregnantAnimalsByProperty.mockResolvedValue(
        mockResponse,
      );

      const result = await controller.getPregnantAnimalsByProperty(
        mockCurrentUser,
        'property-1',
      );

      expect(result.animalIds).toEqual([]);
    });

    it('should handle NotFoundException when property not found', async () => {
      const error = new NotFoundException(
        'Property not found or does not belong to your company',
      );
      breedingsService.getPregnantAnimalsByProperty.mockRejectedValue(error);

      await expect(
        controller.getPregnantAnimalsByProperty(
          mockCurrentUser,
          'non-existent-id',
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('unconfirmMostRecentBreeding', () => {
    it('should unconfirm most recent breeding successfully', async () => {
      const unconfirmedBreeding = { ...mockBreeding, confirmed: false };
      breedingsService.unconfirmMostRecentBreeding.mockResolvedValue(
        unconfirmedBreeding,
      );

      const result = await controller.unconfirmMostRecentBreeding(
        mockCurrentUser,
        'animal-1',
      );

      expect(breedingsService.unconfirmMostRecentBreeding).toHaveBeenCalledWith(
        mockCurrentUser.id,
        'animal-1',
      );
      expect(result.confirmed).toBe(false);
    });

    it('should handle NotFoundException when animal not found', async () => {
      const error = new NotFoundException(
        'Animal not found or does not belong to your company',
      );
      breedingsService.unconfirmMostRecentBreeding.mockRejectedValue(error);

      await expect(
        controller.unconfirmMostRecentBreeding(
          mockCurrentUser,
          'non-existent-id',
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should handle NotFoundException when no confirmed breeding exists', async () => {
      const error = new NotFoundException(
        'No confirmed breeding found for this animal',
      );
      breedingsService.unconfirmMostRecentBreeding.mockRejectedValue(error);

      await expect(
        controller.unconfirmMostRecentBreeding(mockCurrentUser, 'animal-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should soft delete a breeding successfully', async () => {
      breedingsService.remove.mockResolvedValue(undefined);

      await controller.remove(mockCurrentUser, 'breeding-1');

      expect(breedingsService.remove).toHaveBeenCalledWith(
        mockCurrentUser.id,
        'breeding-1',
      );
    });

    it('should handle NotFoundException when breeding not found', async () => {
      const error = new NotFoundException('Breeding not found');
      breedingsService.remove.mockRejectedValue(error);

      await expect(
        controller.remove(mockCurrentUser, 'non-existent-id'),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
