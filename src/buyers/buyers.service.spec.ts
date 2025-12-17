import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, BadRequestException } from '@nestjs/common';
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
    cpf: '12345678900',
    cnpj: null,
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
    cpf: '12345678900',
    cnpj: undefined,
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

    it('should throw BadRequestException when both CPF and CNPJ are provided', async () => {
      const dtoWithBoth: CreateBuyerDto = {
        ...mockCreateBuyerDto,
        code: '003',
        cpf: '12345678900',
        cnpj: '12345678000190',
      };

      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.property.findMany.mockResolvedValue([{ id: 'property-1' }]);
      prismaService.buyer.findFirst.mockResolvedValue(null);

      await expect(service.create(mockUser.id, dtoWithBoth)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException when neither CPF nor CNPJ is provided', async () => {
      const dtoWithoutBoth: CreateBuyerDto = {
        ...mockCreateBuyerDto,
        code: '004',
        cpf: undefined,
        cnpj: undefined,
      };

      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.property.findMany.mockResolvedValue([{ id: 'property-1' }]);
      prismaService.buyer.findFirst.mockResolvedValue(null);

      await expect(service.create(mockUser.id, dtoWithoutBoth)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should create successfully with only CNPJ', async () => {
      const dtoWithCnpj: CreateBuyerDto = {
        ...mockCreateBuyerDto,
        code: '005',
        cpf: undefined,
        cnpj: '12345678000190',
      };

      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.property.findMany.mockResolvedValue([{ id: 'property-1' }]);
      prismaService.buyer.findFirst.mockResolvedValue(null);
      prismaService.buyer.create.mockResolvedValue({
        ...mockBuyer,
        cpf: null,
        cnpj: '12345678000190',
      });

      const result = await service.create(mockUser.id, dtoWithCnpj);

      expect(result).toBeDefined();
      expect(result.cnpj).toBe('12345678000190');
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

    it('should throw BadRequestException when updating to have both CPF and CNPJ', async () => {
      const updateDto: UpdateBuyerDto = {
        cpf: '12345678900',
        cnpj: '12345678000190',
      };

      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.buyer.findFirst.mockResolvedValue(mockBuyer);

      await expect(
        service.update(mockUser.id, mockBuyer.id, updateDto),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when updating to have neither CPF nor CNPJ', async () => {
      const updateDto: UpdateBuyerDto = {
        cpf: null,
        cnpj: null,
      };

      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.buyer.findFirst.mockResolvedValue({
        ...mockBuyer,
        cpf: null,
        cnpj: null,
      });

      await expect(
        service.update(mockUser.id, mockBuyer.id, updateDto),
      ).rejects.toThrow(BadRequestException);
    });

    it('should update successfully when changing from CPF to CNPJ', async () => {
      const updateDto: UpdateBuyerDto = {
        cpf: null,
        cnpj: '12345678000190',
      };
      const updatedBuyer = {
        ...mockBuyer,
        cpf: null,
        cnpj: '12345678000190',
      };

      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.buyer.findFirst.mockResolvedValue(mockBuyer);
      prismaService.buyer.update.mockResolvedValue(updatedBuyer);
      prismaService.buyer.findUnique.mockResolvedValue(updatedBuyer);

      const result = await service.update(mockUser.id, mockBuyer.id, updateDto);

      expect(result).toBeDefined();
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
