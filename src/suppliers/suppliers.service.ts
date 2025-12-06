import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/services/prisma.service';
import {
  BaseRegistrationService,
  RegistrationEntity,
} from '../common/services/base-registration.service';
import { BaseRegistrationCreateDto } from '../common/dto/registration-base.dto';
import { CreateSupplierDto, UpdateSupplierDto } from './dto';

type SupplierEntity = RegistrationEntity;

@Injectable()
export class SuppliersService extends BaseRegistrationService<SupplierEntity> {
  constructor(prisma: PrismaService) {
    super(prisma, {
      modelName: 'supplier',
      propertyRelationName: 'supplierProperty',
      entityName: 'Supplier',
      entityIdField: 'supplierId',
    });
  }

  async create(userId: string, createSupplierDto: CreateSupplierDto) {
    return super.create(userId, createSupplierDto);
  }

  async findAll(userId: string) {
    return super.findAll(userId);
  }

  async findOne(userId: string, id: string) {
    return super.findOne(userId, id);
  }

  async update(
    userId: string,
    id: string,
    updateSupplierDto: UpdateSupplierDto,
  ) {
    return super.update(userId, id, updateSupplierDto);
  }

  async remove(userId: string, id: string) {
    return super.remove(userId, id);
  }

  protected async createEntity(
    createDto: BaseRegistrationCreateDto,
    companyId: string,
  ): Promise<SupplierEntity> {
    return (await this.prisma.supplier.create({
      data: {
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
        properties: {
          create: createDto.propertyIds.map((propertyId) => ({
            propertyId,
          })),
        },
      },
      include: {
        properties: {
          select: {
            propertyId: true,
          },
        },
      },
    })) as SupplierEntity;
  }

  protected async updateEntity(
    id: string,
    data: Record<string, unknown>,
  ): Promise<SupplierEntity> {
    return (await this.prisma.supplier.update({
      where: { id },
      data,
      include: {
        properties: {
          select: {
            propertyId: true,
          },
        },
      },
    })) as SupplierEntity;
  }

  protected async findFirst(args: unknown): Promise<unknown> {
    return this.prisma.supplier.findFirst(args as never);
  }

  protected async findMany(args: unknown): Promise<unknown[]> {
    return this.prisma.supplier.findMany(args as never);
  }

  protected async findUnique(args: unknown): Promise<unknown> {
    return this.prisma.supplier.findUnique(args as never);
  }
}
