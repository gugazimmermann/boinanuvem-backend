import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException } from '@nestjs/common';
import { BuyersService } from './buyers.service';
import { PrismaService } from '../common/services/prisma.service';
import { CreateBuyerDto, UpdateBuyerDto } from './dto';

describe('BuyersService', () => {
  let service: BuyersService;
  let prismaService: jest.Mocked<PrismaService>;

  const mockUser = {
    id: 'user-1',
    companyId: 'company-1',
  };

  const mockBuyer = {
    id: 'buyer-1',
    code: '001',
    name: 'Comprador de Gado LTDA',
    cpf: '123.456.789-00',
    cnpj: '12.345.678/0001-90',
    email: 'contato@comprador.com',
    phone: '(47) 99999-9999',
    status: 'active',
    companyId: 'company-1',
    street: 'Rua das Flores',
    number: '123',
    complement: 'Escritório 1',
    neighborhood: 'Centro',
    city: 'São Paulo',
    state: 'SP',
    zipCode: '01310-100',
    deletedAt: null,
    createdAt: new Date('2025-01-15'),
    updatedAt: new Date('2025-01-15'),
    properties: [{ propertyId: 'property-1' }],
  };

  const mockCreateBuyerDto: CreateBuyerDto = {
    code: '001',
    name: 'Comprador de Gado LTDA',
    cpf: '123.456.789-00',
    cnpj: '12.345.678/0001-90',
    email: 'contato@comprador.com',
    phone: '(47) 99999-9999',
    status: 'active',
    propertyIds: ['property-1'],
    street: 'Rua das Flores',
    number: '123',
    complement: 'Escritório 1',
    neighborhood: 'Centro',
    city: 'São Paulo',
    state: 'SP',
    zipCode: '01310-100',
  };

  beforeEach(async () => {
    const mockPrismaService = {
      user: {
        findUnique: jest.fn(),
      },
      buyer: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      property: {
        findMany: jest.fn(),
      },
      buyerProperty: {
        deleteMany: jest.fn(),
        createMany: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BuyersService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<BuyersService>(BuyersService);
    prismaService = module.get(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a buyer successfully', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.property.findMany.mockResolvedValue([{ id: 'property-1' }]);
      prismaService.buyer.findFirst.mockResolvedValue(null);
      prismaService.buyer.create.mockResolvedValue(mockBuyer);

      const result = await service.create(mockUser.id, mockCreateBuyerDto);

      expect(prismaService.buyer.create).toHaveBeenCalled();
      expect(result.propertyIds).toEqual(['property-1']);
    });

    it('should throw ConflictException if buyer code already exists', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.property.findMany.mockResolvedValue([{ id: 'property-1' }]);
      prismaService.buyer.findFirst.mockResolvedValue(mockBuyer);

      await expect(
        service.create(mockUser.id, mockCreateBuyerDto),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('findAll', () => {
    it('should return all buyers for user company', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.buyer.findMany.mockResolvedValue([mockBuyer]);

      const result = await service.findAll(mockUser.id);

      expect(result).toHaveLength(1);
      expect(result[0].propertyIds).toEqual(['property-1']);
    });
  });

  describe('findOne', () => {
    it('should return a buyer by id', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.buyer.findFirst.mockResolvedValue(mockBuyer);

      const result = await service.findOne(mockUser.id, mockBuyer.id);

      expect(result).toBeDefined();
      expect(result.id).toBe(mockBuyer.id);
    });
  });

  describe('update', () => {
    it('should update a buyer successfully', async () => {
      const updateDto: UpdateBuyerDto = {
        name: 'Updated Name',
      };
      const updatedBuyer = { ...mockBuyer, ...updateDto };

      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.buyer.findFirst.mockResolvedValue(mockBuyer);
      prismaService.buyer.update.mockResolvedValue(updatedBuyer);

      const result = await service.update(mockUser.id, mockBuyer.id, updateDto);

      expect(result.name).toBe(updateDto.name);
    });
  });

  describe('remove', () => {
    it('should soft delete a buyer', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.buyer.findFirst.mockResolvedValue(mockBuyer);
      prismaService.buyer.update.mockResolvedValue({
        ...mockBuyer,
        deletedAt: new Date(),
      });

      const result = await service.remove(mockUser.id, mockBuyer.id);

      expect(result).toEqual({ message: 'Buyer deleted successfully' });
    });
  });
});
