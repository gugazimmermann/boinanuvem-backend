import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { EmployeeObservationsService } from './employee-observations.service';
import { PrismaService } from '../common/services/prisma.service';
import {
  CreateEmployeeObservationDto,
  UpdateEmployeeObservationDto,
} from './dto';

describe('EmployeeObservationsService', () => {
  let service: EmployeeObservationsService;
  let prismaService: jest.Mocked<PrismaService>;

  const mockUser = { id: 'user-1', companyId: 'company-1' };
  const mockEmployee = {
    id: 'employee-1',
    companyId: 'company-1',
    deletedAt: null,
  };
  const mockObservation = {
    id: 'obs-1',
    employeeId: 'employee-1',
    observation: 'Test observation',
    fileIds: ['file-1'],
    companyId: 'company-1',
    createdBy: 'user-1',
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };
  const mockCreateDto: CreateEmployeeObservationDto = {
    observation: 'Test observation',
    fileIds: ['file-1'],
  };

  beforeEach(async () => {
    const mockPrismaService = {
      user: { findUnique: jest.fn() },
      employee: { findFirst: jest.fn() },
      employeeObservation: {
        create: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmployeeObservationsService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<EmployeeObservationsService>(
      EmployeeObservationsService,
    );
    prismaService = module.get(PrismaService) as jest.Mocked<PrismaService>;
  });

  afterEach(() => jest.clearAllMocks());

  it('should be defined', () => expect(service).toBeDefined());

  describe('create', () => {
    it('should create successfully', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.employee.findFirst.mockResolvedValue(mockEmployee);
      prismaService.employeeObservation.create.mockResolvedValue(
        mockObservation,
      );

      const result = await service.create(
        'user-1',
        'employee-1',
        mockCreateDto,
      );

      expect(result.id).toBe(mockObservation.id);
    });

    it('should throw if employee not found', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.employee.findFirst.mockResolvedValue(null);

      await expect(
        service.create('user-1', 'employee-1', mockCreateDto),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('findAllByEmployeeId', () => {
    it('should return observations', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.employee.findFirst.mockResolvedValue(mockEmployee);
      prismaService.employeeObservation.findMany.mockResolvedValue([
        mockObservation,
      ]);

      const result = await service.findAllByEmployeeId('user-1', 'employee-1');

      expect(result).toHaveLength(1);
    });
  });

  describe('findOne', () => {
    it('should return observation', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.employeeObservation.findFirst.mockResolvedValue(
        mockObservation,
      );

      const result = await service.findOne('user-1', 'obs-1');

      expect(result.id).toBe(mockObservation.id);
    });
  });

  describe('update', () => {
    it('should update successfully', async () => {
      const updateDto: UpdateEmployeeObservationDto = {
        observation: 'Updated',
      };
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.employeeObservation.findFirst.mockResolvedValue(
        mockObservation,
      );
      prismaService.employeeObservation.update.mockResolvedValue({
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
      prismaService.employeeObservation.findFirst.mockResolvedValue(
        mockObservation,
      );
      prismaService.employeeObservation.update.mockResolvedValue(
        mockObservation,
      );

      const result = await service.remove('user-1', 'obs-1');

      expect(result.message).toBe('Observation deleted successfully');
    });
  });
});
