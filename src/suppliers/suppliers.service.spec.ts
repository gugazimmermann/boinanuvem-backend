import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, BadRequestException } from '@nestjs/common';
import { SuppliersService } from './suppliers.service';
import { PrismaService } from '../common/services/prisma.service';
import { CreateSupplierDto, UpdateSupplierDto } from './dto';

describe('SuppliersService', () => {
  let service: SuppliersService;
  let prismaService: jest.Mocked<PrismaService>;

  const mockUser = {
    id: 'user-1',
    companyId: 'company-1',
  };

  const mockSupplier = {
    id: 'supplier-1',
    code: '001',
    name: 'Fornecedor de Ração LTDA',
    cpf: '12345678900',
    cnpj: null,
    email: 'contato@fornecedor.com',
    phone: '(47) 99999-9999',
    status: 'active',
    companyId: 'company-1',
    street: 'Rua das Flores',
    number: '123',
    complement: 'Galpão 1',
    neighborhood: 'Centro',
    city: 'São Paulo',
    state: 'SP',
    zipCode: '01310-100',
    deletedAt: null,
    createdAt: new Date('2025-01-15'),
    updatedAt: new Date('2025-01-15'),
    properties: [{ propertyId: 'property-1' }],
  };

  const mockCreateSupplierDto: CreateSupplierDto = {
    code: '001',
    name: 'Fornecedor de Ração LTDA',
    cpf: '12345678900',
    cnpj: undefined,
    email: 'contato@fornecedor.com',
    phone: '(47) 99999-9999',
    status: 'active',
    propertyIds: ['property-1'],
    street: 'Rua das Flores',
    number: '123',
    complement: 'Galpão 1',
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
      supplier: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      property: {
        findMany: jest.fn(),
      },
      supplierProperty: {
        deleteMany: jest.fn(),
        createMany: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SuppliersService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<SuppliersService>(SuppliersService);
    prismaService = module.get(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a supplier successfully', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.property.findMany.mockResolvedValue([{ id: 'property-1' }]);
      prismaService.supplier.findFirst.mockResolvedValue(null);
      prismaService.supplier.create.mockResolvedValue(mockSupplier);

      const result = await service.create(mockUser.id, mockCreateSupplierDto);

      expect(prismaService.supplier.create).toHaveBeenCalled();
      expect(result.propertyIds).toEqual(['property-1']);
    });

    it('should throw ConflictException if supplier code already exists', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.property.findMany.mockResolvedValue([{ id: 'property-1' }]);
      prismaService.supplier.findFirst.mockResolvedValue(mockSupplier);

      await expect(
        service.create(mockUser.id, mockCreateSupplierDto),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw BadRequestException when both CPF and CNPJ are provided', async () => {
      const dtoWithBoth: CreateSupplierDto = {
        ...mockCreateSupplierDto,
        code: '003',
        cpf: '12345678900',
        cnpj: '12345678000190',
      };

      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.property.findMany.mockResolvedValue([{ id: 'property-1' }]);
      prismaService.supplier.findFirst.mockResolvedValue(null);

      await expect(service.create(mockUser.id, dtoWithBoth)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException when neither CPF nor CNPJ is provided', async () => {
      const dtoWithoutBoth: CreateSupplierDto = {
        ...mockCreateSupplierDto,
        code: '004',
        cpf: undefined,
        cnpj: undefined,
      };

      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.property.findMany.mockResolvedValue([{ id: 'property-1' }]);
      prismaService.supplier.findFirst.mockResolvedValue(null);

      await expect(service.create(mockUser.id, dtoWithoutBoth)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should create successfully with only CNPJ', async () => {
      const dtoWithCnpj: CreateSupplierDto = {
        ...mockCreateSupplierDto,
        code: '005',
        cpf: undefined,
        cnpj: '12345678000190',
      };

      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.property.findMany.mockResolvedValue([{ id: 'property-1' }]);
      prismaService.supplier.findFirst.mockResolvedValue(null);
      prismaService.supplier.create.mockResolvedValue({
        ...mockSupplier,
        cpf: null,
        cnpj: '12345678000190',
      });

      const result = await service.create(mockUser.id, dtoWithCnpj);

      expect(result).toBeDefined();
      expect(result.cnpj).toBe('12345678000190');
    });
  });

  describe('findAll', () => {
    it('should return all suppliers for user company', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.supplier.findMany.mockResolvedValue([mockSupplier]);

      const result = await service.findAll(mockUser.id);

      expect(result).toHaveLength(1);
      expect(result[0].propertyIds).toEqual(['property-1']);
    });
  });

  describe('findOne', () => {
    it('should return a supplier by id', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.supplier.findFirst.mockResolvedValue(mockSupplier);

      const result = await service.findOne(mockUser.id, mockSupplier.id);

      expect(result).toBeDefined();
      expect(result.id).toBe(mockSupplier.id);
    });
  });

  describe('update', () => {
    it('should update a supplier successfully', async () => {
      const updateDto: UpdateSupplierDto = {
        name: 'Updated Name',
      };
      const updatedSupplier = { ...mockSupplier, ...updateDto };

      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.supplier.findFirst.mockResolvedValue(mockSupplier);
      prismaService.supplier.update.mockResolvedValue(updatedSupplier);

      const result = await service.update(
        mockUser.id,
        mockSupplier.id,
        updateDto,
      );

      expect(result.name).toBe(updateDto.name);
    });

    it('should throw BadRequestException when updating to have both CPF and CNPJ', async () => {
      const updateDto: UpdateSupplierDto = {
        cpf: '12345678900',
        cnpj: '12345678000190',
      };

      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.supplier.findFirst.mockResolvedValue(mockSupplier);

      await expect(
        service.update(mockUser.id, mockSupplier.id, updateDto),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when updating to have neither CPF nor CNPJ', async () => {
      const updateDto: UpdateSupplierDto = {
        cpf: null,
        cnpj: null,
      };

      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.supplier.findFirst.mockResolvedValue({
        ...mockSupplier,
        cpf: null,
        cnpj: null,
      });

      await expect(
        service.update(mockUser.id, mockSupplier.id, updateDto),
      ).rejects.toThrow(BadRequestException);
    });

    it('should update successfully when changing from CPF to CNPJ', async () => {
      const updateDto: UpdateSupplierDto = {
        cpf: null,
        cnpj: '12345678000190',
      };
      const updatedSupplier = {
        ...mockSupplier,
        cpf: null,
        cnpj: '12345678000190',
      };

      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.supplier.findFirst.mockResolvedValue(mockSupplier);
      prismaService.supplier.update.mockResolvedValue(updatedSupplier);
      prismaService.supplier.findUnique.mockResolvedValue(updatedSupplier);

      const result = await service.update(
        mockUser.id,
        mockSupplier.id,
        updateDto,
      );

      expect(result).toBeDefined();
    });
  });

  describe('remove', () => {
    it('should soft delete a supplier', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.supplier.findFirst.mockResolvedValue(mockSupplier);
      prismaService.supplier.update.mockResolvedValue({
        ...mockSupplier,
        deletedAt: new Date(),
      });

      const result = await service.remove(mockUser.id, mockSupplier.id);

      expect(result).toEqual({ message: 'Supplier deleted successfully' });
    });
  });
});
