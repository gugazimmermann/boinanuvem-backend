import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/services/prisma.service';
import {
  BaseRegistrationService,
  RegistrationEntity,
} from '../common/services/base-registration.service';
import { BaseRegistrationCreateDto } from '../common/dto/registration-base.dto';
import { CreateBuyerDto, UpdateBuyerDto } from './dto';

type BuyerEntity = RegistrationEntity;

@Injectable()
export class BuyersService extends BaseRegistrationService<BuyerEntity> {
  constructor(prisma: PrismaService) {
    super(prisma, {
      modelName: 'buyer',
      propertyRelationName: 'buyerProperty',
      entityName: 'Buyer',
      entityIdField: 'buyerId',
    });
  }

  async create(userId: string, createBuyerDto: CreateBuyerDto) {
    return super.create(userId, createBuyerDto);
  }

  async findAll(userId: string) {
    return super.findAll(userId);
  }

  async findOne(userId: string, id: string) {
    return super.findOne(userId, id);
  }

  async update(userId: string, id: string, updateBuyerDto: UpdateBuyerDto) {
    return super.update(userId, id, updateBuyerDto);
  }

  async remove(userId: string, id: string) {
    return super.remove(userId, id);
  }

  protected async createEntity(
    createDto: BaseRegistrationCreateDto,
    companyId: string,
  ): Promise<BuyerEntity> {
    return (await this.prisma.buyer.create({
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
    })) as BuyerEntity;
  }

  protected async updateEntity(
    id: string,
    data: Record<string, unknown>,
  ): Promise<BuyerEntity> {
    return (await this.prisma.buyer.update({
      where: { id },
      data,
      include: {
        properties: {
          select: {
            propertyId: true,
          },
        },
      },
    })) as BuyerEntity;
  }

  protected async findFirst(args: unknown): Promise<unknown> {
    return this.prisma.buyer.findFirst(args as never);
  }

  protected async findMany(args: unknown): Promise<unknown[]> {
    return this.prisma.buyer.findMany(args as never);
  }

  protected async findUnique(args: unknown): Promise<unknown> {
    return this.prisma.buyer.findUnique(args as never);
  }
}
