import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/services/prisma.service';
import {
  BaseRegistrationService,
  RegistrationEntity,
} from '../common/services/base-registration.service';
import { BaseRegistrationCreateDto } from '../common/dto/registration-base.dto';
import { CreateServiceProviderDto, UpdateServiceProviderDto } from './dto';

type ServiceProviderEntity = RegistrationEntity;

@Injectable()
export class ServiceProvidersService extends BaseRegistrationService<ServiceProviderEntity> {
  constructor(prisma: PrismaService) {
    super(prisma, {
      modelName: 'serviceProvider',
      propertyRelationName: 'serviceProviderProperty',
      entityName: 'Service provider',
      entityIdField: 'serviceProviderId',
    });
  }

  async create(
    userId: string,
    createServiceProviderDto: CreateServiceProviderDto,
  ) {
    return super.create(userId, createServiceProviderDto);
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
    updateServiceProviderDto: UpdateServiceProviderDto,
  ) {
    return super.update(userId, id, updateServiceProviderDto);
  }

  async remove(userId: string, id: string) {
    return super.remove(userId, id);
  }

  protected async createEntity(
    createDto: BaseRegistrationCreateDto,
    companyId: string,
  ): Promise<ServiceProviderEntity> {
    return (await this.prisma.serviceProvider.create({
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
    })) as ServiceProviderEntity;
  }

  protected async updateEntity(
    id: string,
    data: Record<string, unknown>,
  ): Promise<ServiceProviderEntity> {
    return (await this.prisma.serviceProvider.update({
      where: { id },
      data,
      include: {
        properties: {
          select: {
            propertyId: true,
          },
        },
      },
    })) as ServiceProviderEntity;
  }

  protected async findFirst(args: unknown): Promise<unknown> {
    return this.prisma.serviceProvider.findFirst(args as never);
  }

  protected async findMany(args: unknown): Promise<unknown[]> {
    return this.prisma.serviceProvider.findMany(args as never);
  }

  protected async findUnique(args: unknown): Promise<unknown> {
    return this.prisma.serviceProvider.findUnique(args as never);
  }
}
