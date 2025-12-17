import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, BadRequestException } from '@nestjs/common';
import { ServiceProvidersService } from './service-providers.service';
import { PrismaService } from '../common/services/prisma.service';
import { CreateServiceProviderDto, UpdateServiceProviderDto } from './dto';

describe('ServiceProvidersService', () => {
  let service: ServiceProvidersService;
  let prismaService: jest.Mocked<PrismaService>;

  const mockUser = {
    id: 'user-1',
    companyId: 'company-1',
  };

  const mockServiceProvider = {
    id: 'service-provider-1',
    code: '001',
    name: 'Serviços Agrícolas LTDA',
    cpf: '12345678900',
    cnpj: null,
    email: 'contato@servicosagricolas.com',
    phone: '(47) 99999-9999',
    status: 'active',
    companyId: 'company-1',
    street: 'Rua das Flores',
    number: '123',
    complement: 'Sala 101',
    neighborhood: 'Centro',
    city: 'São Paulo',
    state: 'SP',
    zipCode: '01310-100',
    deletedAt: null,
    createdAt: new Date('2025-01-15'),
    updatedAt: new Date('2025-01-15'),
    properties: [{ propertyId: 'property-1' }],
  };

  const mockCreateServiceProviderDto: CreateServiceProviderDto = {
    code: '001',
    name: 'Serviços Agrícolas LTDA',
    cpf: '12345678900',
    cnpj: undefined,
    email: 'contato@servicosagricolas.com',
    phone: '(47) 99999-9999',
    status: 'active',
    propertyIds: ['property-1'],
    street: 'Rua das Flores',
    number: '123',
    complement: 'Sala 101',
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
      serviceProvider: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      property: {
        findMany: jest.fn(),
      },
      serviceProviderProperty: {
        deleteMany: jest.fn(),
        createMany: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ServiceProvidersService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<ServiceProvidersService>(ServiceProvidersService);
    prismaService = module.get(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a service provider successfully', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.property.findMany.mockResolvedValue([{ id: 'property-1' }]);
      prismaService.serviceProvider.findFirst.mockResolvedValue(null);
      prismaService.serviceProvider.create.mockResolvedValue(
        mockServiceProvider,
      );

      const result = await service.create(
        mockUser.id,
        mockCreateServiceProviderDto,
      );

      expect(prismaService.serviceProvider.create).toHaveBeenCalled();
      expect(result.propertyIds).toEqual(['property-1']);
    });

    it('should throw ConflictException if service provider code already exists', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.property.findMany.mockResolvedValue([{ id: 'property-1' }]);
      prismaService.serviceProvider.findFirst.mockResolvedValue(
        mockServiceProvider,
      );

      await expect(
        service.create(mockUser.id, mockCreateServiceProviderDto),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw BadRequestException when both CPF and CNPJ are provided', async () => {
      const dtoWithBoth: CreateServiceProviderDto = {
        ...mockCreateServiceProviderDto,
        code: '003',
        cpf: '12345678900',
        cnpj: '12345678000190',
      };

      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.property.findMany.mockResolvedValue([{ id: 'property-1' }]);
      prismaService.serviceProvider.findFirst.mockResolvedValue(null);

      await expect(service.create(mockUser.id, dtoWithBoth)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException when neither CPF nor CNPJ is provided', async () => {
      const dtoWithoutBoth: CreateServiceProviderDto = {
        ...mockCreateServiceProviderDto,
        code: '004',
        cpf: undefined,
        cnpj: undefined,
      };

      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.property.findMany.mockResolvedValue([{ id: 'property-1' }]);
      prismaService.serviceProvider.findFirst.mockResolvedValue(null);

      await expect(service.create(mockUser.id, dtoWithoutBoth)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should create successfully with only CNPJ', async () => {
      const dtoWithCnpj: CreateServiceProviderDto = {
        ...mockCreateServiceProviderDto,
        code: '005',
        cpf: undefined,
        cnpj: '12345678000190',
      };

      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.property.findMany.mockResolvedValue([{ id: 'property-1' }]);
      prismaService.serviceProvider.findFirst.mockResolvedValue(null);
      prismaService.serviceProvider.create.mockResolvedValue({
        ...mockServiceProvider,
        cpf: null,
        cnpj: '12345678000190',
      });

      const result = await service.create(mockUser.id, dtoWithCnpj);

      expect(result).toBeDefined();
      expect(result.cnpj).toBe('12345678000190');
    });
  });

  describe('findAll', () => {
    it('should return all service providers for user company', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.serviceProvider.findMany.mockResolvedValue([
        mockServiceProvider,
      ]);

      const result = await service.findAll(mockUser.id);

      expect(result).toHaveLength(1);
      expect(result[0].propertyIds).toEqual(['property-1']);
    });
  });

  describe('findOne', () => {
    it('should return a service provider by id', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.serviceProvider.findFirst.mockResolvedValue(
        mockServiceProvider,
      );

      const result = await service.findOne(mockUser.id, mockServiceProvider.id);

      expect(result).toBeDefined();
      expect(result.id).toBe(mockServiceProvider.id);
    });
  });

  describe('update', () => {
    it('should update a service provider successfully', async () => {
      const updateDto: UpdateServiceProviderDto = {
        name: 'Updated Name',
      };
      const updatedServiceProvider = {
        ...mockServiceProvider,
        ...updateDto,
      };

      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.serviceProvider.findFirst.mockResolvedValue(
        mockServiceProvider,
      );
      prismaService.serviceProvider.update.mockResolvedValue(
        updatedServiceProvider,
      );

      const result = await service.update(
        mockUser.id,
        mockServiceProvider.id,
        updateDto,
      );

      expect(result.name).toBe(updateDto.name);
    });

    it('should throw BadRequestException when updating to have both CPF and CNPJ', async () => {
      const updateDto: UpdateServiceProviderDto = {
        cpf: '12345678900',
        cnpj: '12345678000190',
      };

      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.serviceProvider.findFirst.mockResolvedValue(
        mockServiceProvider,
      );

      await expect(
        service.update(mockUser.id, mockServiceProvider.id, updateDto),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when updating to have neither CPF nor CNPJ', async () => {
      const updateDto: UpdateServiceProviderDto = {
        cpf: null,
        cnpj: null,
      };

      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.serviceProvider.findFirst.mockResolvedValue({
        ...mockServiceProvider,
        cpf: null,
        cnpj: null,
      });

      await expect(
        service.update(mockUser.id, mockServiceProvider.id, updateDto),
      ).rejects.toThrow(BadRequestException);
    });

    it('should update successfully when changing from CPF to CNPJ', async () => {
      const updateDto: UpdateServiceProviderDto = {
        cpf: null,
        cnpj: '12345678000190',
      };
      const updatedServiceProvider = {
        ...mockServiceProvider,
        cpf: null,
        cnpj: '12345678000190',
      };

      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.serviceProvider.findFirst.mockResolvedValue(
        mockServiceProvider,
      );
      prismaService.serviceProvider.update.mockResolvedValue(
        updatedServiceProvider,
      );
      prismaService.serviceProvider.findUnique.mockResolvedValue(
        updatedServiceProvider,
      );

      const result = await service.update(
        mockUser.id,
        mockServiceProvider.id,
        updateDto,
      );

      expect(result).toBeDefined();
    });
  });

  describe('remove', () => {
    it('should soft delete a service provider', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.serviceProvider.findFirst.mockResolvedValue(
        mockServiceProvider,
      );
      prismaService.serviceProvider.update.mockResolvedValue({
        ...mockServiceProvider,
        deletedAt: new Date(),
      });

      const result = await service.remove(mockUser.id, mockServiceProvider.id);

      expect(result).toEqual({
        message: 'Service provider deleted successfully',
      });
    });
  });
});
