import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { BuyerObservationsService } from './buyer-observations.service';
import { PrismaService } from '../common/services/prisma.service';
import { CreateBuyerObservationDto, UpdateBuyerObservationDto } from './dto';

describe('BuyerObservationsService', () => {
  let service: BuyerObservationsService;
  let prismaService: jest.Mocked<PrismaService>;

  const mockUser = {
    id: 'user-1',
    companyId: 'company-1',
  };

  const mockBuyer = {
    id: 'buyer-1',
    companyId: 'company-1',
    deletedAt: null,
  };

  const mockObservation = {
    id: 'obs-1',
    buyerId: 'buyer-1',
    observation: 'Test observation',
    fileIds: ['file-1', 'file-2'],
    companyId: 'company-1',
    createdBy: 'user-1',
    createdAt: new Date('2025-01-15'),
    updatedAt: new Date('2025-01-15'),
    deletedAt: null,
  };

  const mockCreateDto: CreateBuyerObservationDto = {
    observation: 'Test observation',
    fileIds: ['file-1', 'file-2'],
  };

  beforeEach(async () => {
    const mockPrismaService = {
      user: {
        findUnique: jest.fn(),
      },
      buyer: {
        findFirst: jest.fn(),
      },
      buyerObservation: {
        create: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BuyerObservationsService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<BuyerObservationsService>(BuyerObservationsService);
    prismaService = module.get(PrismaService) as jest.Mocked<PrismaService>;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create an observation successfully', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.buyer.findFirst.mockResolvedValue(mockBuyer);
      prismaService.buyerObservation.create.mockResolvedValue(mockObservation);

      const result = await service.create('user-1', 'buyer-1', mockCreateDto);

      expect(prismaService.buyerObservation.create).toHaveBeenCalled();
      expect(result.id).toBe(mockObservation.id);
    });

    it('should throw NotFoundException if buyer not found', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.buyer.findFirst.mockResolvedValue(null);

      await expect(
        service.create('user-1', 'buyer-1', mockCreateDto),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('findAllByBuyerId', () => {
    it('should return all observations for a buyer', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.buyer.findFirst.mockResolvedValue(mockBuyer);
      prismaService.buyerObservation.findMany.mockResolvedValue([
        mockObservation,
      ]);

      const result = await service.findAllByBuyerId('user-1', 'buyer-1');

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(mockObservation.id);
    });
  });

  describe('findOne', () => {
    it('should return an observation by id', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.buyerObservation.findFirst.mockResolvedValue(
        mockObservation,
      );

      const result = await service.findOne('user-1', 'obs-1');

      expect(result.id).toBe(mockObservation.id);
    });

    it('should throw NotFoundException if observation not found', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.buyerObservation.findFirst.mockResolvedValue(null);

      await expect(service.findOne('user-1', 'obs-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('should update an observation successfully', async () => {
      const updateDto: UpdateBuyerObservationDto = {
        observation: 'Updated observation',
      };
      const updatedObservation = {
        ...mockObservation,
        observation: 'Updated observation',
      };

      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.buyerObservation.findFirst.mockResolvedValue(
        mockObservation,
      );
      prismaService.buyerObservation.update.mockResolvedValue(
        updatedObservation,
      );

      const result = await service.update('user-1', 'obs-1', updateDto);

      expect(result.observation).toBe('Updated observation');
    });
  });

  describe('remove', () => {
    it('should soft delete an observation', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.buyerObservation.findFirst.mockResolvedValue(
        mockObservation,
      );
      prismaService.buyerObservation.update.mockResolvedValue({
        ...mockObservation,
        deletedAt: new Date(),
      });

      const result = await service.remove('user-1', 'obs-1');

      expect(result.message).toBe('Observation deleted successfully');
    });
  });
});
