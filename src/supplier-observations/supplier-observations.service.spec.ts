import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { SupplierObservationsService } from './supplier-observations.service';
import { PrismaService } from '../common/services/prisma.service';
import {
  CreateSupplierObservationDto,
  UpdateSupplierObservationDto,
} from './dto';

describe('SupplierObservationsService', () => {
  let service: SupplierObservationsService;
  let prismaService: jest.Mocked<PrismaService>;

  const mockUser = { id: 'user-1', companyId: 'company-1' };
  const mockSupplier = {
    id: 'supplier-1',
    companyId: 'company-1',
    deletedAt: null,
  };
  const mockObservation = {
    id: 'obs-1',
    supplierId: 'supplier-1',
    observation: 'Test observation',
    fileIds: ['file-1'],
    companyId: 'company-1',
    createdBy: 'user-1',
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };
  const mockCreateDto: CreateSupplierObservationDto = {
    observation: 'Test observation',
    fileIds: ['file-1'],
  };

  beforeEach(async () => {
    const mockPrismaService = {
      user: { findUnique: jest.fn() },
      supplier: { findFirst: jest.fn() },
      supplierObservation: {
        create: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SupplierObservationsService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<SupplierObservationsService>(
      SupplierObservationsService,
    );
    prismaService = module.get(PrismaService) as jest.Mocked<PrismaService>;
  });

  afterEach(() => jest.clearAllMocks());

  it('should be defined', () => expect(service).toBeDefined());

  describe('create', () => {
    it('should create successfully', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.supplier.findFirst.mockResolvedValue(mockSupplier);
      prismaService.supplierObservation.create.mockResolvedValue(
        mockObservation,
      );

      const result = await service.create(
        'user-1',
        'supplier-1',
        mockCreateDto,
      );

      expect(result.id).toBe(mockObservation.id);
    });

    it('should throw if supplier not found', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.supplier.findFirst.mockResolvedValue(null);

      await expect(
        service.create('user-1', 'supplier-1', mockCreateDto),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('findAllBySupplierId', () => {
    it('should return observations', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.supplier.findFirst.mockResolvedValue(mockSupplier);
      prismaService.supplierObservation.findMany.mockResolvedValue([
        mockObservation,
      ]);

      const result = await service.findAllBySupplierId('user-1', 'supplier-1');

      expect(result).toHaveLength(1);
    });
  });

  describe('findOne', () => {
    it('should return observation', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.supplierObservation.findFirst.mockResolvedValue(
        mockObservation,
      );

      const result = await service.findOne('user-1', 'obs-1');

      expect(result.id).toBe(mockObservation.id);
    });
  });

  describe('update', () => {
    it('should update successfully', async () => {
      const updateDto: UpdateSupplierObservationDto = {
        observation: 'Updated',
      };
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.supplierObservation.findFirst.mockResolvedValue(
        mockObservation,
      );
      prismaService.supplierObservation.update.mockResolvedValue({
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
      prismaService.supplierObservation.findFirst.mockResolvedValue(
        mockObservation,
      );
      prismaService.supplierObservation.update.mockResolvedValue(
        mockObservation,
      );

      const result = await service.remove('user-1', 'obs-1');

      expect(result.message).toBe('Observation deleted successfully');
    });
  });
});
