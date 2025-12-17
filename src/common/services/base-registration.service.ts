import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from './prisma.service';
import type { PrismaService as PrismaServiceType } from './prisma.service';
import { BaseRegistrationCreateDto } from '../dto/registration-base.dto';

export interface RegistrationEntityConfig {
  modelName: 'buyer' | 'supplier' | 'serviceProvider';
  propertyRelationName:
    | 'buyerProperty'
    | 'supplierProperty'
    | 'serviceProviderProperty';
  entityName: string; // For error messages: 'Buyer', 'Supplier', 'Service Provider'
  entityIdField: 'buyerId' | 'supplierId' | 'serviceProviderId';
}

export interface RegistrationEntity {
  id: string;
  code: string;
  name: string;
  cpf: string | null;
  cnpj: string | null;
  email: string | null;
  phone: string | null;
  status: string;
  companyId: string;
  street: string | null;
  number: string | null;
  complement: string | null;
  neighborhood: string | null;
  city: string | null;
  state: string | null;
  zipCode: string | null;
  createdAt: Date;
  updatedAt: Date;
  properties: { propertyId: string }[];
}

export interface UpdateDto {
  code?: string;
  name?: string;
  cpf?: string | null;
  cnpj?: string | null;
  email?: string | null;
  phone?: string | null;
  status?: 'active' | 'inactive';
  propertyIds?: string[];
  street?: string | null;
  number?: string | null;
  complement?: string | null;
  neighborhood?: string | null;
  city?: string | null;
  state?: string | null;
  zipCode?: string | null;
}

@Injectable()
export abstract class BaseRegistrationService<T extends RegistrationEntity> {
  constructor(
    protected prisma: PrismaService,
    protected config: RegistrationEntityConfig,
  ) {}

  protected validateCpfCnpjExclusive({
    cpf,
    cnpj,
  }: {
    cpf?: string | null;
    cnpj?: string | null;
  }): void {
    const cpfValue = (cpf ?? '').trim();
    const cnpjValue = (cnpj ?? '').trim();
    const hasCpf = cpfValue.length > 0;
    const hasCnpj = cnpjValue.length > 0;

    if (hasCpf === hasCnpj) {
      // both present or both absent
      throw new BadRequestException(
        `Exactly one of CPF or CNPJ must be provided for ${this.config.entityName}`,
      );
    }
  }

  async create(userId: string, createDto: BaseRegistrationCreateDto) {
    const companyId = await this.getUserCompanyId(userId);

    // Validate all properties belong to company
    await this.validatePropertiesBelongToCompany(
      createDto.propertyIds,
      companyId,
    );

    // With `exactOptionalPropertyTypes`, avoid passing explicit `undefined` to optional props
    this.validateCpfCnpjExclusive({
      cpf: createDto.cpf ?? null,
      cnpj: createDto.cnpj ?? null,
    });

    // Check if code already exists for this company (excluding soft-deleted)
    const existing = await this.findByCode(companyId, createDto.code);

    if (existing) {
      throw new ConflictException(
        `${this.config.entityName} with this code already exists for your company`,
      );
    }

    const entity = await this.createEntity(createDto, companyId);

    return this.transformEntity(entity);
  }

  async findAll(userId: string) {
    const companyId = await this.getUserCompanyId(userId);

    const entities = await this.findManyByCompany(companyId);

    return entities.map((entity) => this.transformEntity(entity));
  }

  async findOne(userId: string, id: string) {
    const companyId = await this.getUserCompanyId(userId);
    const entity = await this.findByIdAndCompany(id, companyId);
    return this.transformEntity(entity);
  }

  async update(userId: string, id: string, updateDto: UpdateDto) {
    const companyId = await this.getUserCompanyId(userId);
    const existing = await this.findByIdAndCompany(id, companyId);

    // If code is being updated, check for conflicts
    if (updateDto.code && updateDto.code !== existing.code) {
      await this.validateCodeConflict(
        companyId,
        id,
        updateDto.code,
        existing.code,
      );
    }

    // Validate CPF/CNPJ (effective: existing + patch) for base registration entities
    const effectiveCpf =
      updateDto.cpf !== undefined ? updateDto.cpf : existing.cpf;
    const effectiveCnpj =
      updateDto.cnpj !== undefined ? updateDto.cnpj : existing.cnpj;
    this.validateCpfCnpjExclusive({ cpf: effectiveCpf, cnpj: effectiveCnpj });

    // If propertyIds are being updated, validate them
    if (updateDto.propertyIds) {
      await this.validatePropertiesBelongToCompany(
        updateDto.propertyIds,
        companyId,
      );
    }

    const updateData = this.buildUpdateData(updateDto);

    // Update entity
    const updated = await this.updateEntity(id, updateData);

    // Sync property relations if propertyIds were provided
    if (updateDto.propertyIds) {
      await this.syncPropertyRelations(id, updateDto.propertyIds);
      // Re-fetch to get updated relations
      const entityWithRelations = await this.findById(id);
      return this.transformEntity(entityWithRelations!);
    }

    return this.transformEntity(updated);
  }

  async remove(userId: string, id: string) {
    const companyId = await this.getUserCompanyId(userId);
    await this.findByIdAndCompany(id, companyId);

    // Soft delete by setting deletedAt timestamp
    await this.updateEntity(id, { deletedAt: new Date() });

    return { message: `${this.config.entityName} deleted successfully` };
  }

  protected async getUserCompanyId(userId: string): Promise<string> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { companyId: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user.companyId;
  }

  protected async findByIdAndCompany(
    id: string,
    companyId: string,
  ): Promise<T> {
    const entity = await this.findFirst({
      where: {
        id,
        companyId,
        deletedAt: null,
      },
      include: {
        properties: {
          select: {
            propertyId: true,
          },
        },
      },
    });

    if (!entity) {
      throw new NotFoundException(`${this.config.entityName} not found`);
    }

    return entity as T;
  }

  protected async findByCode(
    companyId: string,
    code: string,
  ): Promise<T | null> {
    return (await this.findFirst({
      where: {
        companyId,
        code,
        deletedAt: null,
      },
    })) as T | null;
  }

  protected async findManyByCompany(companyId: string): Promise<T[]> {
    return (await this.findMany({
      where: {
        companyId,
        deletedAt: null,
      },
      include: {
        properties: {
          select: {
            propertyId: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })) as T[];
  }

  protected async findById(id: string): Promise<T | null> {
    return (await this.findUnique({
      where: { id },
      include: {
        properties: {
          select: {
            propertyId: true,
          },
        },
      },
    })) as T | null;
  }

  protected async validateCodeConflict(
    companyId: string,
    entityId: string,
    newCode: string,
    currentCode: string,
  ): Promise<void> {
    if (!newCode || newCode === currentCode) {
      return;
    }

    const codeConflict = await this.findFirst({
      where: {
        companyId,
        code: newCode,
        deletedAt: null,
        NOT: { id: entityId },
      },
    });

    if (codeConflict) {
      throw new ConflictException(
        `${this.config.entityName} with this code already exists for your company`,
      );
    }
  }

  protected async validatePropertiesBelongToCompany(
    propertyIds: string[],
    companyId: string,
  ): Promise<void> {
    if (!propertyIds || propertyIds.length === 0) {
      throw new BadRequestException('At least one property must be selected');
    }

    const properties = await this.prisma.property.findMany({
      where: {
        id: { in: propertyIds },
        companyId,
        deletedAt: null,
      },
      select: { id: true },
    });

    if (properties.length !== propertyIds.length) {
      throw new NotFoundException(
        'One or more properties not found or do not belong to your company',
      );
    }
  }

  protected async syncPropertyRelations(
    entityId: string,
    propertyIds: string[],
  ): Promise<void> {
    // Delete existing relations
    await this.deletePropertyRelations(entityId);

    // Create new relations
    if (propertyIds.length > 0) {
      await this.createPropertyRelations(entityId, propertyIds);
    }
  }

  protected async deletePropertyRelations(entityId: string): Promise<void> {
    const relationModel = this.prisma[
      this.config.propertyRelationName as keyof PrismaServiceType
    ] as unknown as {
      deleteMany: (args: { where: Record<string, string> }) => Promise<unknown>;
    };
    await relationModel.deleteMany({
      where: { [this.config.entityIdField]: entityId },
    });
  }

  protected async createPropertyRelations(
    entityId: string,
    propertyIds: string[],
  ): Promise<void> {
    const relationModel = this.prisma[
      this.config.propertyRelationName as keyof PrismaServiceType
    ] as unknown as {
      createMany: (args: {
        data: Array<Record<string, string>>;
      }) => Promise<unknown>;
    };
    await relationModel.createMany({
      data: propertyIds.map((propertyId) => ({
        [this.config.entityIdField]: entityId,
        propertyId,
      })),
    });
  }

  protected buildUpdateData(updateDto: UpdateDto) {
    const data: Record<string, unknown> = {};

    this.addIfDefined(data, 'code', updateDto.code);
    this.addIfDefined(data, 'name', updateDto.name);
    this.addIfDefined(data, 'status', updateDto.status);
    this.addIfNotUndefined(data, 'cpf', updateDto.cpf);
    this.addIfNotUndefined(data, 'cnpj', updateDto.cnpj);
    this.addIfNotUndefined(data, 'email', updateDto.email);
    this.addIfNotUndefined(data, 'phone', updateDto.phone);
    this.addIfNotUndefined(data, 'street', updateDto.street);
    this.addIfNotUndefined(data, 'number', updateDto.number);
    this.addIfNotUndefined(data, 'complement', updateDto.complement);
    this.addIfNotUndefined(data, 'neighborhood', updateDto.neighborhood);
    this.addIfNotUndefined(data, 'city', updateDto.city);
    this.addIfNotUndefined(data, 'state', updateDto.state);
    this.addIfNotUndefined(data, 'zipCode', updateDto.zipCode);

    return data;
  }

  protected addIfDefined(
    data: Record<string, unknown>,
    key: string,
    value: unknown,
  ): void {
    if (value !== undefined && value !== null) {
      data[key] = value;
    }
  }

  protected addIfNotUndefined(
    data: Record<string, unknown>,
    key: string,
    value: unknown,
  ): void {
    if (value !== undefined) {
      data[key] = value ?? null;
    }
  }

  protected transformEntity(entity: T) {
    return {
      id: entity.id,
      code: entity.code,
      name: entity.name,
      cpf: entity.cpf ?? undefined,
      cnpj: entity.cnpj ?? undefined,
      email: entity.email ?? undefined,
      phone: entity.phone ?? undefined,
      status: entity.status,
      companyId: entity.companyId,
      propertyIds: entity.properties.map((p) => p.propertyId),
      street: entity.street ?? undefined,
      number: entity.number ?? undefined,
      complement: entity.complement ?? undefined,
      neighborhood: entity.neighborhood ?? undefined,
      city: entity.city ?? undefined,
      state: entity.state ?? undefined,
      zipCode: entity.zipCode ?? undefined,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }

  // Abstract methods that need to be implemented by subclasses
  protected abstract createEntity(
    createDto: BaseRegistrationCreateDto,
    companyId: string,
  ): Promise<T>;

  protected abstract updateEntity(
    id: string,
    data: Record<string, unknown>,
  ): Promise<T>;

  protected abstract findFirst(args: unknown): Promise<unknown>;

  protected abstract findMany(args: unknown): Promise<unknown[]>;

  protected abstract findUnique(args: unknown): Promise<unknown>;
}
