import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { CashFlowObservationsService } from './cash-flow-observations.service';
import { PrismaService } from '../common/services/prisma.service';
import {
  CreateCashFlowObservationDto,
  UpdateCashFlowObservationDto,
} from './dto';

describe('CashFlowObservationsService', () => {
  let service: CashFlowObservationsService;
  let prismaService: jest.Mocked<PrismaService>;

  const mockUser = { id: 'user-1', companyId: 'company-1' };
  const mockCashFlow = { id: 'cf-1', companyId: 'company-1', deletedAt: null };
  const mockObservation = {
    id: 'obs-1',
    cashFlowId: 'cf-1',
    observation: 'Test observation',
    fileIds: ['file-1'],
    companyId: 'company-1',
    createdBy: 'user-1',
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };
  const mockCreateDto: CreateCashFlowObservationDto = {
    cashFlowId: 'cf-1',
    observation: 'Test observation',
    fileIds: ['file-1'],
  };

  beforeEach(async () => {
    const mockPrismaService = {
      user: { findUnique: jest.fn() },
      cashFlow: { findFirst: jest.fn() },
      cashFlowObservation: {
        create: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CashFlowObservationsService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<CashFlowObservationsService>(
      CashFlowObservationsService,
    );
    prismaService = module.get(PrismaService) as jest.Mocked<PrismaService>;
  });

  afterEach(() => jest.clearAllMocks());

  it('should be defined', () => expect(service).toBeDefined());

  describe('create', () => {
    it('should create successfully', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.cashFlow.findFirst.mockResolvedValue(mockCashFlow);
      prismaService.cashFlowObservation.create.mockResolvedValue(
        mockObservation,
      );

      const result = await service.create('user-1', mockCreateDto);

      expect(result.id).toBe(mockObservation.id);
    });

    it('should throw if cash flow not found', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.cashFlow.findFirst.mockResolvedValue(null);

      await expect(service.create('user-1', mockCreateDto)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findAll', () => {
    it('should return all observations', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.cashFlowObservation.findMany.mockResolvedValue([
        mockObservation,
      ]);

      const result = await service.findAll('user-1');

      expect(result).toHaveLength(1);
    });
  });

  describe('findAllByCashFlowId', () => {
    it('should return observations for cash flow', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.cashFlow.findFirst.mockResolvedValue(mockCashFlow);
      prismaService.cashFlowObservation.findMany.mockResolvedValue([
        mockObservation,
      ]);

      const result = await service.findAllByCashFlowId('user-1', 'cf-1');

      expect(result).toHaveLength(1);
    });
  });

  describe('findOne', () => {
    it('should return observation', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.cashFlowObservation.findFirst.mockResolvedValue(
        mockObservation,
      );

      const result = await service.findOne('user-1', 'obs-1');

      expect(result.id).toBe(mockObservation.id);
    });
  });

  describe('update', () => {
    it('should update successfully', async () => {
      const updateDto: UpdateCashFlowObservationDto = {
        observation: 'Updated',
      };
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.cashFlowObservation.findFirst.mockResolvedValue(
        mockObservation,
      );
      prismaService.cashFlowObservation.update.mockResolvedValue({
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
      prismaService.cashFlowObservation.findFirst.mockResolvedValue(
        mockObservation,
      );
      prismaService.cashFlowObservation.update.mockResolvedValue(
        mockObservation,
      );

      const result = await service.remove('user-1', 'obs-1');

      expect(result.message).toBe('Observation deleted successfully');
    });
  });
});
