import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { LocationObservationsService } from './location-observations.service';
import { PrismaService } from '../common/services/prisma.service';
import {
  CreateLocationObservationDto,
  UpdateLocationObservationDto,
} from './dto';

describe('LocationObservationsService', () => {
  let service: LocationObservationsService;
  let prismaService: jest.Mocked<PrismaService>;

  const mockUser = { id: 'user-1', companyId: 'company-1' };
  const mockLocation = {
    id: 'location-1',
    companyId: 'company-1',
    deletedAt: null,
  };
  const mockObservation = {
    id: 'obs-1',
    locationId: 'location-1',
    observation: 'Test observation',
    fileIds: ['file-1'],
    companyId: 'company-1',
    createdBy: 'user-1',
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };
  const mockCreateDto: CreateLocationObservationDto = {
    observation: 'Test observation',
    fileIds: ['file-1'],
  };

  beforeEach(async () => {
    const mockPrismaService = {
      user: { findUnique: jest.fn() },
      location: { findFirst: jest.fn() },
      locationObservation: {
        create: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LocationObservationsService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<LocationObservationsService>(
      LocationObservationsService,
    );
    prismaService = module.get(PrismaService) as jest.Mocked<PrismaService>;
  });

  afterEach(() => jest.clearAllMocks());

  it('should be defined', () => expect(service).toBeDefined());

  describe('create', () => {
    it('should create successfully', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.location.findFirst.mockResolvedValue(mockLocation);
      prismaService.locationObservation.create.mockResolvedValue(
        mockObservation,
      );

      const result = await service.create(
        'user-1',
        'location-1',
        mockCreateDto,
      );

      expect(result.id).toBe(mockObservation.id);
    });

    it('should throw if location not found', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.location.findFirst.mockResolvedValue(null);

      await expect(
        service.create('user-1', 'location-1', mockCreateDto),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('findAllByLocationId', () => {
    it('should return observations', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.location.findFirst.mockResolvedValue(mockLocation);
      prismaService.locationObservation.findMany.mockResolvedValue([
        mockObservation,
      ]);

      const result = await service.findAllByLocationId('user-1', 'location-1');

      expect(result).toHaveLength(1);
    });
  });

  describe('findOne', () => {
    it('should return observation', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.locationObservation.findFirst.mockResolvedValue(
        mockObservation,
      );

      const result = await service.findOne('user-1', 'obs-1');

      expect(result.id).toBe(mockObservation.id);
    });
  });

  describe('update', () => {
    it('should update successfully', async () => {
      const updateDto: UpdateLocationObservationDto = {
        observation: 'Updated',
      };
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.locationObservation.findFirst.mockResolvedValue(
        mockObservation,
      );
      prismaService.locationObservation.update.mockResolvedValue({
        ...mockObservation,
        observation: 'Updated',
      });

      const result = await service.update('user-1', 'obs-1', updateDto);

      expect(result.observation).toBe('Updated');
    });
  });

  describe('remove', () => {
    it('should soft delete', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.locationObservation.findFirst.mockResolvedValue(
        mockObservation,
      );
      prismaService.locationObservation.update.mockResolvedValue(
        mockObservation,
      );

      const result = await service.remove('user-1', 'obs-1');

      expect(result.message).toBe('Observation deleted successfully');
    });
  });
});
