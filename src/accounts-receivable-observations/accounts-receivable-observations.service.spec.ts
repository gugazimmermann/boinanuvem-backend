import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { AccountsReceivableObservationsService } from './accounts-receivable-observations.service';
import { PrismaService } from '../common/services/prisma.service';
import {
  CreateAccountsReceivableObservationDto,
  UpdateAccountsReceivableObservationDto,
} from './dto';

describe('AccountsReceivableObservationsService', () => {
  let service: AccountsReceivableObservationsService;
  let prismaService: jest.Mocked<PrismaService>;

  const mockUser = { id: 'user-1', companyId: 'company-1' };
  const mockAccountsReceivable = {
    id: 'ar-1',
    companyId: 'company-1',
    deletedAt: null,
  };
  const mockObservation = {
    id: 'obs-1',
    accountsReceivableId: 'ar-1',
    observation: 'Test observation',
    fileIds: ['file-1'],
    companyId: 'company-1',
    createdBy: 'user-1',
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };
  const mockCreateDto: CreateAccountsReceivableObservationDto = {
    accountsReceivableId: 'ar-1',
    observation: 'Test observation',
    fileIds: ['file-1'],
  };

  beforeEach(async () => {
    const mockPrismaService = {
      user: { findUnique: jest.fn() },
      accountsReceivable: { findFirst: jest.fn() },
      accountsReceivableObservation: {
        create: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AccountsReceivableObservationsService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<AccountsReceivableObservationsService>(
      AccountsReceivableObservationsService,
    );
    prismaService = module.get(PrismaService) as jest.Mocked<PrismaService>;
  });

  afterEach(() => jest.clearAllMocks());

  it('should be defined', () => expect(service).toBeDefined());

  describe('create', () => {
    it('should create successfully', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.accountsReceivable.findFirst.mockResolvedValue(
        mockAccountsReceivable,
      );
      prismaService.accountsReceivableObservation.create.mockResolvedValue(
        mockObservation,
      );

      const result = await service.create('user-1', mockCreateDto);

      expect(result.id).toBe(mockObservation.id);
    });

    it('should throw if accounts receivable not found', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.accountsReceivable.findFirst.mockResolvedValue(null);

      await expect(service.create('user-1', mockCreateDto)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findAll', () => {
    it('should return all observations', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.accountsReceivableObservation.findMany.mockResolvedValue([
        mockObservation,
      ]);

      const result = await service.findAll('user-1');

      expect(result).toHaveLength(1);
    });
  });

  describe('findAllByAccountsReceivableId', () => {
    it('should return observations', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.accountsReceivable.findFirst.mockResolvedValue(
        mockAccountsReceivable,
      );
      prismaService.accountsReceivableObservation.findMany.mockResolvedValue([
        mockObservation,
      ]);

      const result = await service.findAllByAccountsReceivableId(
        'user-1',
        'ar-1',
      );

      expect(result).toHaveLength(1);
    });
  });

  describe('findOne', () => {
    it('should return observation', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.accountsReceivableObservation.findFirst.mockResolvedValue(
        mockObservation,
      );

      const result = await service.findOne('user-1', 'obs-1');

      expect(result.id).toBe(mockObservation.id);
    });
  });

  describe('update', () => {
    it('should update successfully', async () => {
      const updateDto: UpdateAccountsReceivableObservationDto = {
        observation: 'Updated',
      };
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.accountsReceivableObservation.findFirst.mockResolvedValue(
        mockObservation,
      );
      prismaService.accountsReceivableObservation.update.mockResolvedValue({
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
      prismaService.accountsReceivableObservation.findFirst.mockResolvedValue(
        mockObservation,
      );
      prismaService.accountsReceivableObservation.update.mockResolvedValue(
        mockObservation,
      );

      const result = await service.remove('user-1', 'obs-1');

      expect(result.message).toBe('Observation deleted successfully');
    });
  });
});
