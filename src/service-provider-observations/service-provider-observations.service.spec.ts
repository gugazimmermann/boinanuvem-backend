import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ServiceProviderObservationsService } from './service-provider-observations.service';
import { PrismaService } from '../common/services/prisma.service';
import {
  CreateServiceProviderObservationDto,
  UpdateServiceProviderObservationDto,
} from './dto';

describe('ServiceProviderObservationsService', () => {
  let service: ServiceProviderObservationsService;
  let prismaService: jest.Mocked<PrismaService>;

  const mockUser = { id: 'user-1', companyId: 'company-1' };
  const mockServiceProvider = {
    id: 'sp-1',
    companyId: 'company-1',
    deletedAt: null,
  };
  const mockObservation = {
    id: 'obs-1',
    serviceProviderId: 'sp-1',
    observation: 'Test observation',
    fileIds: ['file-1'],
    companyId: 'company-1',
    createdBy: 'user-1',
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };
  const mockCreateDto: CreateServiceProviderObservationDto = {
    observation: 'Test observation',
    fileIds: ['file-1'],
  };

  beforeEach(async () => {
    const mockPrismaService = {
      user: { findUnique: jest.fn() },
      serviceProvider: { findFirst: jest.fn() },
      serviceProviderObservation: {
        create: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ServiceProviderObservationsService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<ServiceProviderObservationsService>(
      ServiceProviderObservationsService,
    );
    prismaService = module.get(PrismaService) as jest.Mocked<PrismaService>;
  });

  afterEach(() => jest.clearAllMocks());

  it('should be defined', () => expect(service).toBeDefined());

  describe('create', () => {
    it('should create successfully', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.serviceProvider.findFirst.mockResolvedValue(
        mockServiceProvider,
      );
      prismaService.serviceProviderObservation.create.mockResolvedValue(
        mockObservation,
      );

      const result = await service.create('user-1', 'sp-1', mockCreateDto);

      expect(result.id).toBe(mockObservation.id);
    });

    it('should throw if service provider not found', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.serviceProvider.findFirst.mockResolvedValue(null);

      await expect(
        service.create('user-1', 'sp-1', mockCreateDto),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('findAllByServiceProviderId', () => {
    it('should return observations', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.serviceProvider.findFirst.mockResolvedValue(
        mockServiceProvider,
      );
      prismaService.serviceProviderObservation.findMany.mockResolvedValue([
        mockObservation,
      ]);

      const result = await service.findAllByServiceProviderId('user-1', 'sp-1');

      expect(result).toHaveLength(1);
    });
  });

  describe('findOne', () => {
    it('should return observation', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.serviceProviderObservation.findFirst.mockResolvedValue(
        mockObservation,
      );

      const result = await service.findOne('user-1', 'obs-1');

      expect(result.id).toBe(mockObservation.id);
    });
  });

  describe('update', () => {
    it('should update successfully', async () => {
      const updateDto: UpdateServiceProviderObservationDto = {
        observation: 'Updated',
      };
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.serviceProviderObservation.findFirst.mockResolvedValue(
        mockObservation,
      );
      prismaService.serviceProviderObservation.update.mockResolvedValue({
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
      prismaService.serviceProviderObservation.findFirst.mockResolvedValue(
        mockObservation,
      );
      prismaService.serviceProviderObservation.update.mockResolvedValue(
        mockObservation,
      );

      const result = await service.remove('user-1', 'obs-1');

      expect(result.message).toBe('Observation deleted successfully');
    });
  });
});
