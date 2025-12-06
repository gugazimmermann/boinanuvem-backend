import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException } from '@nestjs/common';
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
    cpf: '123.456.789-00',
    cnpj: '12.345.678/0001-90',
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
    cpf: '123.456.789-00',
    cnpj: '12.345.678/0001-90',
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
