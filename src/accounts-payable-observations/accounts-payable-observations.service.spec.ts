import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { AccountsPayableObservationsService } from './accounts-payable-observations.service';
import { PrismaService } from '../common/services/prisma.service';
import {
  CreateAccountsPayableObservationDto,
  UpdateAccountsPayableObservationDto,
} from './dto';

describe('AccountsPayableObservationsService', () => {
  let service: AccountsPayableObservationsService;
  let prismaService: jest.Mocked<PrismaService>;

  const mockUser = { id: 'user-1', companyId: 'company-1' };
  const mockAccountsPayable = {
    id: 'ap-1',
    companyId: 'company-1',
    deletedAt: null,
  };
  const mockObservation = {
    id: 'obs-1',
    accountsPayableId: 'ap-1',
    observation: 'Test observation',
    fileIds: ['file-1'],
    companyId: 'company-1',
    createdBy: 'user-1',
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };
  const mockCreateDto: CreateAccountsPayableObservationDto = {
    accountsPayableId: 'ap-1',
    observation: 'Test observation',
    fileIds: ['file-1'],
  };

  beforeEach(async () => {
    const mockPrismaService = {
      user: { findUnique: jest.fn() },
      accountsPayable: { findFirst: jest.fn() },
      accountsPayableObservation: {
        create: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AccountsPayableObservationsService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<AccountsPayableObservationsService>(
      AccountsPayableObservationsService,
    );
    prismaService = module.get(PrismaService) as jest.Mocked<PrismaService>;
  });

  afterEach(() => jest.clearAllMocks());

  it('should be defined', () => expect(service).toBeDefined());

  describe('create', () => {
    it('should create successfully', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.accountsPayable.findFirst.mockResolvedValue(
        mockAccountsPayable,
      );
      prismaService.accountsPayableObservation.create.mockResolvedValue(
        mockObservation,
      );

      const result = await service.create('user-1', mockCreateDto);

      expect(result.id).toBe(mockObservation.id);
    });

    it('should throw if accounts payable not found', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.accountsPayable.findFirst.mockResolvedValue(null);

      await expect(service.create('user-1', mockCreateDto)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findAll', () => {
    it('should return all observations', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.accountsPayableObservation.findMany.mockResolvedValue([
        mockObservation,
      ]);

      const result = await service.findAll('user-1');

      expect(result).toHaveLength(1);
    });
  });

  describe('findAllByAccountsPayableId', () => {
    it('should return observations', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.accountsPayable.findFirst.mockResolvedValue(
        mockAccountsPayable,
      );
      prismaService.accountsPayableObservation.findMany.mockResolvedValue([
        mockObservation,
      ]);

      const result = await service.findAllByAccountsPayableId('user-1', 'ap-1');

      expect(result).toHaveLength(1);
    });
  });

  describe('findOne', () => {
    it('should return observation', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.accountsPayableObservation.findFirst.mockResolvedValue(
        mockObservation,
      );

      const result = await service.findOne('user-1', 'obs-1');

      expect(result.id).toBe(mockObservation.id);
    });
  });

  describe('update', () => {
    it('should update successfully', async () => {
      const updateDto: UpdateAccountsPayableObservationDto = {
        observation: 'Updated',
      };
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.accountsPayableObservation.findFirst.mockResolvedValue(
        mockObservation,
      );
      prismaService.accountsPayableObservation.update.mockResolvedValue({
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
      prismaService.accountsPayableObservation.findFirst.mockResolvedValue(
        mockObservation,
      );
      prismaService.accountsPayableObservation.update.mockResolvedValue(
        mockObservation,
      );

      const result = await service.remove('user-1', 'obs-1');

      expect(result.message).toBe('Observation deleted successfully');
    });
  });
});
