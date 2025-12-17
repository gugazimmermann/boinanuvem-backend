import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import {
  BaseRegistrationService,
  RegistrationEntity,
  RegistrationEntityConfig,
} from './base-registration.service';
import { PrismaService } from './prisma.service';
import { BaseRegistrationCreateDto } from '../dto/registration-base.dto';
import type { UpdateDto } from './base-registration.service';

// Test implementation class
class TestRegistrationService extends BaseRegistrationService<RegistrationEntity> {
  constructor(prisma: PrismaService, config: RegistrationEntityConfig) {
    super(prisma, config);
  }

  protected async createEntity(
    createDto: BaseRegistrationCreateDto,
    companyId: string,
  ): Promise<RegistrationEntity> {
    return {
      id: 'entity-1',
      code: createDto.code,
      name: createDto.name,
      cpf: createDto.cpf ?? null,
      cnpj: createDto.cnpj ?? null,
      email: createDto.email ?? null,
      phone: createDto.phone ?? null,
      status: createDto.status,
      companyId,
      street: createDto.street ?? null,
      number: createDto.number ?? null,
      complement: createDto.complement ?? null,
      neighborhood: createDto.neighborhood ?? null,
      city: createDto.city ?? null,
      state: createDto.state ?? null,
      zipCode: createDto.zipCode ?? null,
      createdAt: new Date(),
      updatedAt: new Date(),
      properties: createDto.propertyIds.map((propertyId) => ({
        propertyId,
      })),
    };
  }

  protected async updateEntity(
    id: string,
    data: Record<string, unknown>,
  ): Promise<RegistrationEntity> {
    return {
      id,
      code: (data.code as string) || '001',
      name: (data.name as string) || 'Test Entity',
      cpf: (data.cpf as string) || null,
      cnpj: (data.cnpj as string) || null,
      email: (data.email as string) || null,
      phone: (data.phone as string) || null,
      status: (data.status as string) || 'active',
      companyId: 'company-1',
      street: (data.street as string) || null,
      number: (data.number as string) || null,
      complement: (data.complement as string) || null,
      neighborhood: (data.neighborhood as string) || null,
      city: (data.city as string) || null,
      state: (data.state as string) || null,
      zipCode: (data.zipCode as string) || null,
      createdAt: new Date(),
      updatedAt: new Date(),
      properties: [],
    };
  }

  protected async findFirst(args: unknown): Promise<unknown> {
    const where = (args as { where: Record<string, unknown> }).where;
    if (where?.id === 'entity-1' && where?.companyId === 'company-1') {
      return {
        id: 'entity-1',
        code: '001',
        name: 'Test Entity',
        cpf: '12345678900',
        cnpj: null,
        email: null,
        phone: null,
        status: 'active',
        companyId: 'company-1',
        street: null,
        number: null,
        complement: null,
        neighborhood: null,
        city: null,
        state: null,
        zipCode: null,
        deletedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        properties: [{ propertyId: 'property-1' }],
      };
    }
    if (where?.code === '001' && where?.companyId === 'company-1') {
      return {
        id: 'entity-1',
        code: '001',
        name: 'Test Entity',
        companyId: 'company-1',
        deletedAt: null,
      };
    }
    return null;
  }

  protected async findMany(args: unknown): Promise<unknown[]> {
    const where = (args as { where: Record<string, unknown> }).where;
    if (where?.companyId === 'company-1') {
      return [
        {
          id: 'entity-1',
          code: '001',
          name: 'Test Entity',
          cpf: null,
          cnpj: null,
          email: null,
          phone: null,
          status: 'active',
          companyId: 'company-1',
          street: null,
          number: null,
          complement: null,
          neighborhood: null,
          city: null,
          state: null,
          zipCode: null,
          deletedAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          properties: [{ propertyId: 'property-1' }],
        },
      ];
    }
    return [];
  }

  protected async findUnique(args: unknown): Promise<unknown> {
    const where = (args as { where: Record<string, unknown> }).where;
    if (where?.id === 'entity-1') {
      return {
        id: 'entity-1',
        code: '001',
        name: 'Test Entity',
        cpf: null,
        cnpj: null,
        email: null,
        phone: null,
        status: 'active',
        companyId: 'company-1',
        street: null,
        number: null,
        complement: null,
        neighborhood: null,
        city: null,
        state: null,
        zipCode: null,
        deletedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        properties: [{ propertyId: 'property-1' }],
      };
    }
    return null;
  }
}

describe('BaseRegistrationService', () => {
  let service: TestRegistrationService;
  let prismaService: jest.Mocked<PrismaService>;

  const mockUser = {
    id: 'user-1',
    companyId: 'company-1',
  };

  const mockEntity: RegistrationEntity = {
    id: 'entity-1',
    code: '001',
    name: 'Test Entity',
    cpf: '12345678900',
    cnpj: null,
    email: null,
    phone: null,
    status: 'active',
    companyId: 'company-1',
    street: null,
    number: null,
    complement: null,
    neighborhood: null,
    city: null,
    state: null,
    zipCode: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    properties: [{ propertyId: 'property-1' }],
  };

  const mockCreateDto: BaseRegistrationCreateDto = {
    code: '001',
    name: 'Test Entity',
    cpf: '12345678900',
    status: 'active',
    propertyIds: ['property-1'],
  };

  beforeEach(async () => {
    const mockPrismaService = {
      user: {
        findUnique: jest.fn(),
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
        {
          provide: TestRegistrationService,
          useFactory: (prisma: PrismaService) => {
            return new TestRegistrationService(prisma, {
              modelName: 'buyer',
              propertyRelationName: 'buyerProperty',
              entityName: 'Buyer',
              entityIdField: 'buyerId',
            });
          },
          inject: [PrismaService],
        },
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<TestRegistrationService>(TestRegistrationService);
    prismaService = module.get(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create an entity successfully', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.property.findMany.mockResolvedValue([{ id: 'property-1' }]);
      // Mock findByCode to return null (no existing entity)
      jest.spyOn(service as any, 'findByCode').mockResolvedValue(null);

      const result = await service.create(mockUser.id, mockCreateDto);

      expect(result).toBeDefined();
      expect(result.code).toBe(mockCreateDto.code);
      expect(result.name).toBe(mockCreateDto.name);
    });

    it('should throw ConflictException if code already exists', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.property.findMany.mockResolvedValue([{ id: 'property-1' }]);

      await expect(service.create(mockUser.id, mockCreateDto)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should throw BadRequestException if propertyIds is empty', async () => {
      const dtoWithoutProperties: BaseRegistrationCreateDto = {
        ...mockCreateDto,
        propertyIds: [],
      };

      prismaService.user.findUnique.mockResolvedValue(mockUser);

      await expect(
        service.create(mockUser.id, dtoWithoutProperties),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException if user not found', async () => {
      prismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.create(mockUser.id, mockCreateDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException if properties not found', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.property.findMany.mockResolvedValue([{ id: 'property-1' }]);

      const dtoWithInvalidProperty: BaseRegistrationCreateDto = {
        ...mockCreateDto,
        propertyIds: ['property-1', 'property-2'],
      };

      await expect(
        service.create(mockUser.id, dtoWithInvalidProperty),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when both CPF and CNPJ are provided', async () => {
      const dtoWithBoth: BaseRegistrationCreateDto = {
        ...mockCreateDto,
        cpf: '12345678900',
        cnpj: '12345678000190',
      };

      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.property.findMany.mockResolvedValue([{ id: 'property-1' }]);
      jest.spyOn(service as any, 'findByCode').mockResolvedValue(null);

      await expect(service.create(mockUser.id, dtoWithBoth)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException when neither CPF nor CNPJ is provided', async () => {
      const dtoWithoutBoth: BaseRegistrationCreateDto = {
        ...mockCreateDto,
        cpf: undefined,
        cnpj: undefined,
      };

      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.property.findMany.mockResolvedValue([{ id: 'property-1' }]);
      jest.spyOn(service as any, 'findByCode').mockResolvedValue(null);

      await expect(service.create(mockUser.id, dtoWithoutBoth)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should create successfully with only CPF', async () => {
      const dtoWithCpf: BaseRegistrationCreateDto = {
        ...mockCreateDto,
        cpf: '12345678900',
        cnpj: undefined,
      };

      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.property.findMany.mockResolvedValue([{ id: 'property-1' }]);
      jest.spyOn(service as any, 'findByCode').mockResolvedValue(null);

      const result = await service.create(mockUser.id, dtoWithCpf);

      expect(result).toBeDefined();
      expect(result.cpf).toBe('12345678900');
    });

    it('should create successfully with only CNPJ', async () => {
      const dtoWithCnpj: BaseRegistrationCreateDto = {
        ...mockCreateDto,
        cpf: undefined,
        cnpj: '12345678000190',
      };

      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.property.findMany.mockResolvedValue([{ id: 'property-1' }]);
      jest.spyOn(service as any, 'findByCode').mockResolvedValue(null);

      const result = await service.create(mockUser.id, dtoWithCnpj);

      expect(result).toBeDefined();
      expect(result.cnpj).toBe('12345678000190');
    });
  });

  describe('findAll', () => {
    it('should return all entities for user company', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.findAll(mockUser.id);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('entity-1');
    });

    it('should return empty array when no entities exist', async () => {
      prismaService.user.findUnique.mockResolvedValue({
        ...mockUser,
        companyId: 'company-2',
      });

      const result = await service.findAll(mockUser.id);

      expect(result).toEqual([]);
    });

    it('should throw NotFoundException if user not found', async () => {
      prismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.findAll(mockUser.id)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findOne', () => {
    it('should return an entity by id', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.findOne(mockUser.id, 'entity-1');

      expect(result).toBeDefined();
      expect(result.id).toBe('entity-1');
    });

    it('should throw NotFoundException if entity not found', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);

      await expect(
        service.findOne(mockUser.id, 'non-existent-id'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if user not found', async () => {
      prismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.findOne(mockUser.id, 'entity-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('should update an entity successfully', async () => {
      const updateDto: UpdateDto = {
        name: 'Updated Name',
      };

      prismaService.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.update(mockUser.id, 'entity-1', updateDto);

      expect(result.name).toBe('Updated Name');
    });

    it('should update code and validate conflict when code changes', async () => {
      const updateDto: UpdateDto = {
        code: '002',
      };

      prismaService.user.findUnique.mockResolvedValue(mockUser);
      // Mock findByIdAndCompany to return existing entity
      jest
        .spyOn(service as any, 'findByIdAndCompany')
        .mockResolvedValue(mockEntity);
      // Mock validateCodeConflict to find a conflict
      jest
        .spyOn(service as any, 'validateCodeConflict')
        .mockRejectedValue(
          new ConflictException(
            'Buyer with this code already exists for your company',
          ),
        );

      await expect(
        service.update(mockUser.id, 'entity-1', updateDto),
      ).rejects.toThrow(ConflictException);
    });

    it('should not validate code conflict when code is unchanged', async () => {
      const updateDto: UpdateDto = {
        code: '001',
        name: 'Updated Name',
      };

      prismaService.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.update(mockUser.id, 'entity-1', updateDto);

      expect(result).toBeDefined();
    });

    it('should sync property relations when propertyIds are updated', async () => {
      const updateDto: UpdateDto = {
        propertyIds: ['property-1', 'property-2'],
      };

      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.property.findMany.mockResolvedValue([
        { id: 'property-1' },
        { id: 'property-2' },
      ]);
      prismaService.buyerProperty.deleteMany.mockResolvedValue({ count: 1 });
      prismaService.buyerProperty.createMany.mockResolvedValue({ count: 2 });

      const result = await service.update(mockUser.id, 'entity-1', updateDto);

      expect(prismaService.buyerProperty.deleteMany).toHaveBeenCalled();
      expect(prismaService.buyerProperty.createMany).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('should not sync property relations when propertyIds are not provided', async () => {
      const updateDto: UpdateDto = {
        name: 'Updated Name',
      };

      prismaService.user.findUnique.mockResolvedValue(mockUser);

      await service.update(mockUser.id, 'entity-1', updateDto);

      expect(prismaService.buyerProperty.deleteMany).not.toHaveBeenCalled();
      expect(prismaService.buyerProperty.createMany).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when propertyIds is empty', async () => {
      const updateDto: UpdateDto = {
        propertyIds: [],
      };

      prismaService.user.findUnique.mockResolvedValue(mockUser);
      jest
        .spyOn(service as any, 'findByIdAndCompany')
        .mockResolvedValue(mockEntity);

      await expect(
        service.update(mockUser.id, 'entity-1', updateDto),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException if entity not found', async () => {
      const updateDto: UpdateDto = {
        name: 'Updated Name',
      };

      prismaService.user.findUnique.mockResolvedValue(mockUser);

      await expect(
        service.update(mockUser.id, 'non-existent-id', updateDto),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if user not found', async () => {
      const updateDto: UpdateDto = {
        name: 'Updated Name',
      };

      prismaService.user.findUnique.mockResolvedValue(null);

      await expect(
        service.update(mockUser.id, 'entity-1', updateDto),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when updating to have both CPF and CNPJ', async () => {
      const updateDto: UpdateDto = {
        cpf: '12345678900',
        cnpj: '12345678000190',
      };

      prismaService.user.findUnique.mockResolvedValue(mockUser);
      jest
        .spyOn(service as any, 'findByIdAndCompany')
        .mockResolvedValue(mockEntity);

      await expect(
        service.update(mockUser.id, 'entity-1', updateDto),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when updating to have neither CPF nor CNPJ', async () => {
      const updateDto: UpdateDto = {
        cpf: null,
        cnpj: null,
      };

      prismaService.user.findUnique.mockResolvedValue(mockUser);
      jest
        .spyOn(service as any, 'findByIdAndCompany')
        .mockResolvedValue({ ...mockEntity, cpf: null, cnpj: null });

      await expect(
        service.update(mockUser.id, 'entity-1', updateDto),
      ).rejects.toThrow(BadRequestException);
    });

    it('should update successfully when changing from CPF to CNPJ', async () => {
      const updateDto: UpdateDto = {
        cpf: null,
        cnpj: '12345678000190',
      };

      prismaService.user.findUnique.mockResolvedValue(mockUser);
      jest
        .spyOn(service as any, 'findByIdAndCompany')
        .mockResolvedValue({ ...mockEntity, cpf: '12345678900', cnpj: null });

      const result = await service.update(mockUser.id, 'entity-1', updateDto);

      expect(result).toBeDefined();
    });

    it('should update successfully when changing from CNPJ to CPF', async () => {
      const updateDto: UpdateDto = {
        cpf: '12345678900',
        cnpj: null,
      };

      prismaService.user.findUnique.mockResolvedValue(mockUser);
      jest.spyOn(service as any, 'findByIdAndCompany').mockResolvedValue({
        ...mockEntity,
        cpf: null,
        cnpj: '12345678000190',
      });

      const result = await service.update(mockUser.id, 'entity-1', updateDto);

      expect(result).toBeDefined();
    });

    it('should update successfully when keeping existing CPF', async () => {
      const updateDto: UpdateDto = {
        name: 'Updated Name',
      };

      prismaService.user.findUnique.mockResolvedValue(mockUser);
      jest
        .spyOn(service as any, 'findByIdAndCompany')
        .mockResolvedValue({ ...mockEntity, cpf: '12345678900', cnpj: null });

      const result = await service.update(mockUser.id, 'entity-1', updateDto);

      expect(result).toBeDefined();
    });

    it('should update successfully when keeping existing CNPJ', async () => {
      const updateDto: UpdateDto = {
        name: 'Updated Name',
      };

      prismaService.user.findUnique.mockResolvedValue(mockUser);
      jest.spyOn(service as any, 'findByIdAndCompany').mockResolvedValue({
        ...mockEntity,
        cpf: null,
        cnpj: '12345678000190',
      });

      const result = await service.update(mockUser.id, 'entity-1', updateDto);

      expect(result).toBeDefined();
    });
  });

  describe('remove', () => {
    it('should soft delete an entity', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.remove(mockUser.id, 'entity-1');

      expect(result).toEqual({ message: 'Buyer deleted successfully' });
    });

    it('should throw NotFoundException if entity not found', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);

      await expect(
        service.remove(mockUser.id, 'non-existent-id'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if user not found', async () => {
      prismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.remove(mockUser.id, 'entity-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getUserCompanyId', () => {
    it('should return companyId for valid user', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);

      const result = await (service as any).getUserCompanyId(mockUser.id);

      expect(result).toBe(mockUser.companyId);
    });

    it('should throw NotFoundException if user not found', async () => {
      prismaService.user.findUnique.mockResolvedValue(null);

      await expect(
        (service as any).getUserCompanyId(mockUser.id),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('findByIdAndCompany', () => {
    it('should return entity when found', async () => {
      const result = await (service as any).findByIdAndCompany(
        'entity-1',
        'company-1',
      );

      expect(result).toBeDefined();
      expect(result.id).toBe('entity-1');
    });

    it('should throw NotFoundException when entity not found', async () => {
      await expect(
        (service as any).findByIdAndCompany('non-existent-id', 'company-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('findByCode', () => {
    it('should return entity when code exists', async () => {
      const result = await (service as any).findByCode('company-1', '001');

      expect(result).toBeDefined();
      expect(result.code).toBe('001');
    });

    it('should return null when code does not exist', async () => {
      const result = await (service as any).findByCode(
        'company-1',
        'non-existent-code',
      );

      expect(result).toBeNull();
    });
  });

  describe('findManyByCompany', () => {
    it('should return entities for company', async () => {
      const result = await (service as any).findManyByCompany('company-1');

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('entity-1');
    });

    it('should return empty array for company with no entities', async () => {
      const result = await (service as any).findManyByCompany('company-2');

      expect(result).toEqual([]);
    });
  });

  describe('findById', () => {
    it('should return entity when found', async () => {
      const result = await (service as any).findById('entity-1');

      expect(result).toBeDefined();
      expect(result.id).toBe('entity-1');
    });

    it('should return null when entity not found', async () => {
      const result = await (service as any).findById('non-existent-id');

      expect(result).toBeNull();
    });
  });

  describe('validateCodeConflict', () => {
    it('should return early when newCode is empty', async () => {
      await (service as any).validateCodeConflict(
        'company-1',
        'entity-1',
        '',
        '001',
      );

      // Should not throw
      expect(true).toBe(true);
    });

    it('should return early when newCode equals currentCode', async () => {
      await (service as any).validateCodeConflict(
        'company-1',
        'entity-1',
        '001',
        '001',
      );

      // Should not throw
      expect(true).toBe(true);
    });

    it('should throw ConflictException when code conflict exists', async () => {
      await expect(
        (service as any).validateCodeConflict(
          'company-1',
          'entity-2',
          '001',
          '002',
        ),
      ).rejects.toThrow(ConflictException);
    });

    it('should not throw when no conflict exists', async () => {
      await (service as any).validateCodeConflict(
        'company-1',
        'entity-1',
        '002',
        '001',
      );

      // Should not throw
      expect(true).toBe(true);
    });
  });

  describe('validatePropertiesBelongToCompany', () => {
    it('should not throw when all properties belong to company', async () => {
      prismaService.property.findMany.mockResolvedValue([
        { id: 'property-1' },
        { id: 'property-2' },
      ]);

      await (service as any).validatePropertiesBelongToCompany(
        ['property-1', 'property-2'],
        'company-1',
      );

      expect(prismaService.property.findMany).toHaveBeenCalled();
    });

    it('should throw BadRequestException if propertyIds is empty', async () => {
      await expect(
        (service as any).validatePropertiesBelongToCompany([], 'company-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException if properties not found', async () => {
      prismaService.property.findMany.mockResolvedValue([{ id: 'property-1' }]);

      await expect(
        (service as any).validatePropertiesBelongToCompany(
          ['property-1', 'property-2'],
          'company-1',
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if no properties found', async () => {
      prismaService.property.findMany.mockResolvedValue([]);

      await expect(
        (service as any).validatePropertiesBelongToCompany(
          ['property-1'],
          'company-1',
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('syncPropertyRelations', () => {
    it('should delete and create relations with properties', async () => {
      prismaService.buyerProperty.deleteMany.mockResolvedValue({ count: 1 });
      prismaService.buyerProperty.createMany.mockResolvedValue({ count: 2 });

      await (service as any).syncPropertyRelations('entity-1', [
        'property-1',
        'property-2',
      ]);

      expect(prismaService.buyerProperty.deleteMany).toHaveBeenCalled();
      expect(prismaService.buyerProperty.createMany).toHaveBeenCalledWith({
        data: [
          { buyerId: 'entity-1', propertyId: 'property-1' },
          { buyerId: 'entity-1', propertyId: 'property-2' },
        ],
      });
    });

    it('should only delete relations when propertyIds is empty', async () => {
      prismaService.buyerProperty.deleteMany.mockResolvedValue({ count: 1 });

      await (service as any).syncPropertyRelations('entity-1', []);

      expect(prismaService.buyerProperty.deleteMany).toHaveBeenCalled();
      expect(prismaService.buyerProperty.createMany).not.toHaveBeenCalled();
    });
  });

  describe('deletePropertyRelations', () => {
    it('should delete property relations', async () => {
      prismaService.buyerProperty.deleteMany.mockResolvedValue({ count: 1 });

      await (service as any).deletePropertyRelations('entity-1');

      expect(prismaService.buyerProperty.deleteMany).toHaveBeenCalledWith({
        where: { buyerId: 'entity-1' },
      });
    });
  });

  describe('createPropertyRelations', () => {
    it('should create property relations', async () => {
      prismaService.buyerProperty.createMany.mockResolvedValue({ count: 2 });

      await (service as any).createPropertyRelations('entity-1', [
        'property-1',
        'property-2',
      ]);

      expect(prismaService.buyerProperty.createMany).toHaveBeenCalledWith({
        data: [
          { buyerId: 'entity-1', propertyId: 'property-1' },
          { buyerId: 'entity-1', propertyId: 'property-2' },
        ],
      });
    });

    it('should handle single property', async () => {
      prismaService.buyerProperty.createMany.mockResolvedValue({ count: 1 });

      await (service as any).createPropertyRelations('entity-1', [
        'property-1',
      ]);

      expect(prismaService.buyerProperty.createMany).toHaveBeenCalledWith({
        data: [{ buyerId: 'entity-1', propertyId: 'property-1' }],
      });
    });
  });

  describe('buildUpdateData', () => {
    it('should build update data with all fields', () => {
      const updateDto: UpdateDto = {
        code: '002',
        name: 'Updated Name',
        status: 'inactive',
        cpf: '123.456.789-00',
        cnpj: '12.345.678/0001-90',
        email: 'test@example.com',
        phone: '(47) 99999-9999',
        street: 'Rua Test',
        number: '123',
        complement: 'Apt 1',
        neighborhood: 'Centro',
        city: 'São Paulo',
        state: 'SP',
        zipCode: '01310-100',
      };

      const result = (service as any).buildUpdateData(updateDto);

      expect(result.code).toBe('002');
      expect(result.name).toBe('Updated Name');
      expect(result.status).toBe('inactive');
      expect(result.cpf).toBe('123.456.789-00');
      expect(result.cnpj).toBe('12.345.678/0001-90');
      expect(result.email).toBe('test@example.com');
      expect(result.phone).toBe('(47) 99999-9999');
      expect(result.street).toBe('Rua Test');
      expect(result.number).toBe('123');
      expect(result.complement).toBe('Apt 1');
      expect(result.neighborhood).toBe('Centro');
      expect(result.city).toBe('São Paulo');
      expect(result.state).toBe('SP');
      expect(result.zipCode).toBe('01310-100');
    });

    it('should handle null values with addIfNotUndefined', () => {
      const updateDto: UpdateDto = {
        cpf: null,
        cnpj: null,
        email: null,
      };

      const result = (service as any).buildUpdateData(updateDto);

      expect(result.cpf).toBeNull();
      expect(result.cnpj).toBeNull();
      expect(result.email).toBeNull();
    });

    it('should exclude undefined values', () => {
      const updateDto: UpdateDto = {
        code: undefined,
        name: undefined,
      };

      const result = (service as any).buildUpdateData(updateDto);

      expect(result.code).toBeUndefined();
      expect(result.name).toBeUndefined();
    });
  });

  describe('addIfDefined', () => {
    it('should add value when defined and not null', () => {
      const data: Record<string, unknown> = {};

      (service as any).addIfDefined(data, 'key', 'value');

      expect(data.key).toBe('value');
    });

    it('should not add value when undefined', () => {
      const data: Record<string, unknown> = {};

      (service as any).addIfDefined(data, 'key', undefined);

      expect(data.key).toBeUndefined();
    });

    it('should not add value when null', () => {
      const data: Record<string, unknown> = {};

      (service as any).addIfDefined(data, 'key', null);

      expect(data.key).toBeUndefined();
    });
  });

  describe('addIfNotUndefined', () => {
    it('should add value when defined', () => {
      const data: Record<string, unknown> = {};

      (service as any).addIfNotUndefined(data, 'key', 'value');

      expect(data.key).toBe('value');
    });

    it('should add null when value is null', () => {
      const data: Record<string, unknown> = {};

      (service as any).addIfNotUndefined(data, 'key', null);

      expect(data.key).toBeNull();
    });

    it('should not add value when undefined', () => {
      const data: Record<string, unknown> = {};

      (service as any).addIfNotUndefined(data, 'key', undefined);

      expect(data.key).toBeUndefined();
    });
  });

  describe('transformEntity', () => {
    it('should transform entity with null values to undefined', () => {
      const entity: RegistrationEntity = {
        ...mockEntity,
        cpf: null,
        cnpj: null,
        email: null,
        phone: null,
        street: null,
        number: null,
        complement: null,
        neighborhood: null,
        city: null,
        state: null,
        zipCode: null,
      };

      const result = (service as any).transformEntity(entity);

      expect(result.cpf).toBeUndefined();
      expect(result.cnpj).toBeUndefined();
      expect(result.email).toBeUndefined();
      expect(result.phone).toBeUndefined();
      expect(result.street).toBeUndefined();
      expect(result.number).toBeUndefined();
      expect(result.complement).toBeUndefined();
      expect(result.neighborhood).toBeUndefined();
      expect(result.city).toBeUndefined();
      expect(result.state).toBeUndefined();
      expect(result.zipCode).toBeUndefined();
      expect(result.propertyIds).toEqual(['property-1']);
    });

    it('should transform entity with all fields', () => {
      const entity: RegistrationEntity = {
        ...mockEntity,
        cpf: '123.456.789-00',
        cnpj: '12.345.678/0001-90',
        email: 'test@example.com',
        phone: '(47) 99999-9999',
        street: 'Rua Test',
        number: '123',
        complement: 'Apt 1',
        neighborhood: 'Centro',
        city: 'São Paulo',
        state: 'SP',
        zipCode: '01310-100',
      };

      const result = (service as any).transformEntity(entity);

      expect(result.cpf).toBe('123.456.789-00');
      expect(result.cnpj).toBe('12.345.678/0001-90');
      expect(result.email).toBe('test@example.com');
      expect(result.phone).toBe('(47) 99999-9999');
      expect(result.street).toBe('Rua Test');
      expect(result.number).toBe('123');
      expect(result.complement).toBe('Apt 1');
      expect(result.neighborhood).toBe('Centro');
      expect(result.city).toBe('São Paulo');
      expect(result.state).toBe('SP');
      expect(result.zipCode).toBe('01310-100');
      expect(result.propertyIds).toEqual(['property-1']);
    });
  });

  describe('validateCpfCnpjExclusive', () => {
    it('should throw BadRequestException when both CPF and CNPJ are provided', () => {
      expect(() => {
        (service as any).validateCpfCnpjExclusive({
          cpf: '12345678900',
          cnpj: '12345678000190',
        });
      }).toThrow(BadRequestException);
    });

    it('should throw BadRequestException when both CPF and CNPJ are empty strings', () => {
      expect(() => {
        (service as any).validateCpfCnpjExclusive({
          cpf: '',
          cnpj: '',
        });
      }).toThrow(BadRequestException);
    });

    it('should throw BadRequestException when both CPF and CNPJ are null', () => {
      expect(() => {
        (service as any).validateCpfCnpjExclusive({
          cpf: null,
          cnpj: null,
        });
      }).toThrow(BadRequestException);
    });

    it('should throw BadRequestException when both CPF and CNPJ are undefined', () => {
      expect(() => {
        (service as any).validateCpfCnpjExclusive({
          cpf: undefined,
          cnpj: undefined,
        });
      }).toThrow(BadRequestException);
    });

    it('should throw BadRequestException when CPF is whitespace and CNPJ is empty', () => {
      expect(() => {
        (service as any).validateCpfCnpjExclusive({
          cpf: '   ',
          cnpj: '',
        });
      }).toThrow(BadRequestException);
    });

    it('should not throw when only CPF is provided', () => {
      expect(() => {
        (service as any).validateCpfCnpjExclusive({
          cpf: '12345678900',
          cnpj: null,
        });
      }).not.toThrow();
    });

    it('should not throw when only CNPJ is provided', () => {
      expect(() => {
        (service as any).validateCpfCnpjExclusive({
          cpf: null,
          cnpj: '12345678000190',
        });
      }).not.toThrow();
    });

    it('should not throw when CPF is provided and CNPJ is undefined', () => {
      expect(() => {
        (service as any).validateCpfCnpjExclusive({
          cpf: '12345678900',
          cnpj: undefined,
        });
      }).not.toThrow();
    });

    it('should not throw when CNPJ is provided and CPF is undefined', () => {
      expect(() => {
        (service as any).validateCpfCnpjExclusive({
          cpf: undefined,
          cnpj: '12345678000190',
        });
      }).not.toThrow();
    });

    it('should throw BadRequestException with correct entity name in message', () => {
      try {
        (service as any).validateCpfCnpjExclusive({
          cpf: '12345678900',
          cnpj: '12345678000190',
        });
        fail('Should have thrown BadRequestException');
      } catch (error) {
        expect(error).toBeInstanceOf(BadRequestException);
        expect(error.message).toContain('Buyer');
      }
    });
  });
});
