import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../common/services/prisma.service';
import type { InputJsonValue } from '@prisma/client/runtime/library';
import { Prisma } from '@prisma/client';
import { CreateSaleDto, UpdateSaleDto } from './dto';

type DecimalValue = { toNumber(): number } | number | null;

@Injectable()
export class SalesService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, createSaleDto: CreateSaleDto) {
    const companyId = await this.getUserCompanyId(userId);

    await this.validateSaleInputs(createSaleDto, companyId);

    // Validate all animals belong to company and are active
    await this.validateAnimalsForSale(createSaleDto.saleItems, companyId);

    const feesJson = this.prepareFeesJson(createSaleDto.fees);

    const result = await this.createSaleTransaction(
      createSaleDto,
      companyId,
      feesJson,
    );

    return this.transformSale(result!);
  }

  async findAll(userId: string) {
    const companyId = await this.getUserCompanyId(userId);

    const sales = await this.prisma.sale.findMany({
      where: {
        companyId,
        deletedAt: null,
      },
      include: {
        saleItems: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return sales.map((sale) => this.transformSale(sale));
  }

  async findOne(userId: string, id: string) {
    const companyId = await this.getUserCompanyId(userId);
    const sale = await this.findSaleByIdAndCompany(id, companyId);
    return this.transformSale(sale);
  }

  async findByAnimalId(userId: string, animalId: string) {
    const companyId = await this.getUserCompanyId(userId);

    // Validate animal belongs to company
    await this.validateAnimalBelongsToCompany(animalId, companyId);

    const sales = await this.prisma.sale.findMany({
      where: {
        companyId,
        deletedAt: null,
        saleItems: {
          some: {
            animalId,
          },
        },
      },
      include: {
        saleItems: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return sales.map((sale) => this.transformSale(sale));
  }

  async update(userId: string, id: string, updateSaleDto: UpdateSaleDto) {
    const companyId = await this.getUserCompanyId(userId);
    const existing = await this.findSaleByIdAndCompany(id, companyId);

    await this.validateUpdateInputs(updateSaleDto, companyId);

    // If saleItems are being updated, validate animals
    if (updateSaleDto.saleItems) {
      await this.validateAnimalsForSale(updateSaleDto.saleItems, companyId);

      // Handle animal status changes
      const previousAnimalIds = existing.saleItems.map((item) => item.animalId);
      const newAnimalIds = updateSaleDto.saleItems.map((item) => item.animalId);

      // Restore status for removed animals
      const removedIds = previousAnimalIds.filter(
        (id) => !newAnimalIds.includes(id),
      );
      await this.updateAnimalStatuses(removedIds, 'active');

      // Set status to sold for newly added animals
      const addedIds = newAnimalIds.filter(
        (id) => !previousAnimalIds.includes(id),
      );
      await this.validateAnimalsForSale(
        updateSaleDto.saleItems.filter((item) =>
          addedIds.includes(item.animalId),
        ),
        companyId,
      );
      await this.updateAnimalStatuses(addedIds, 'sold');
    }

    const updateData = this.buildUpdateData(updateSaleDto);

    await this.prisma.sale.update({
      where: { id },
      data: updateData,
      include: {
        saleItems: true,
      },
    });

    // Update sale items if provided
    if (updateSaleDto.saleItems) {
      await this.updateSaleItems(id, updateSaleDto.saleItems);
    }

    const finalSale = await this.prisma.sale.findUnique({
      where: { id },
      include: {
        saleItems: true,
      },
    });

    return this.transformSale(finalSale!);
  }

  async remove(userId: string, id: string) {
    const companyId = await this.getUserCompanyId(userId);
    const sale = await this.findSaleByIdAndCompany(id, companyId);

    // Restore animal statuses to active
    const animalIds = sale.saleItems.map((item) => item.animalId);
    await this.updateAnimalStatuses(animalIds, 'active');

    // Soft delete
    await this.prisma.sale.update({
      where: { id },
      data: {
        deletedAt: new Date(),
      },
    });

    return { message: 'Sale record deleted successfully' };
  }

  private async getUserCompanyId(userId: string): Promise<string> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { companyId: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user.companyId;
  }

  private async findSaleByIdAndCompany(id: string, companyId: string) {
    const sale = await this.prisma.sale.findFirst({
      where: {
        id,
        companyId,
        deletedAt: null,
      },
      include: {
        saleItems: true,
      },
    });

    if (!sale) {
      throw new NotFoundException('Sale record not found');
    }

    return sale;
  }

  private async validateSaleInputs(
    dto: CreateSaleDto | UpdateSaleDto,
    companyId: string,
  ): Promise<void> {
    if (dto.propertyId) {
      await this.validatePropertyBelongsToCompany(dto.propertyId, companyId);
    }

    if (dto.buyerId) {
      await this.validateBuyerBelongsToCompany(dto.buyerId, companyId);
    }
  }

  private async validateUpdateInputs(
    dto: UpdateSaleDto,
    companyId: string,
  ): Promise<void> {
    await this.validateSaleInputs(dto, companyId);
  }

  private async validatePropertyBelongsToCompany(
    propertyId: string,
    companyId: string,
  ): Promise<void> {
    const property = await this.prisma.property.findFirst({
      where: {
        id: propertyId,
        companyId,
        deletedAt: null,
      },
      select: { id: true },
    });

    if (!property) {
      throw new NotFoundException(
        'Property not found or does not belong to your company',
      );
    }
  }

  private async validateBuyerBelongsToCompany(
    buyerId: string,
    companyId: string,
  ): Promise<void> {
    const buyer = await this.prisma.buyer.findFirst({
      where: {
        id: buyerId,
        companyId,
        deletedAt: null,
      },
      select: { id: true },
    });

    if (!buyer) {
      throw new NotFoundException(
        'Buyer not found or does not belong to your company',
      );
    }
  }

  private async validateAnimalBelongsToCompany(
    animalId: string,
    companyId: string,
  ): Promise<void> {
    const animal = await this.prisma.animal.findFirst({
      where: {
        id: animalId,
        companyId,
        deletedAt: null,
      },
    });

    if (!animal) {
      throw new NotFoundException(
        'Animal not found or does not belong to your company',
      );
    }
  }

  private async validateAnimalsForSale(
    saleItems: Array<{ animalId: string }>,
    companyId: string,
  ): Promise<void> {
    for (const item of saleItems) {
      const animal = await this.prisma.animal.findFirst({
        where: {
          id: item.animalId,
          companyId,
          deletedAt: null,
        },
      });

      if (!animal) {
        throw new NotFoundException(
          `Animal ${item.animalId} not found or does not belong to your company`,
        );
      }

      if (animal.status === 'sold') {
        throw new BadRequestException(
          `Animal ${item.animalId} is already sold`,
        );
      }

      if (animal.status === 'inactive') {
        throw new BadRequestException(
          `Animal ${item.animalId} is inactive and cannot be sold`,
        );
      }
    }
  }

  private async updateAnimalStatuses(
    animalIds: string[],
    status: 'active' | 'sold' | 'inactive',
  ): Promise<void> {
    await this.prisma.animal.updateMany({
      where: {
        id: {
          in: animalIds,
        },
      },
      data: {
        status,
      },
    });
  }

  private prepareFeesJson(
    fees?: Array<{ id: string; name: string; amount: number }>,
  ): InputJsonValue | Prisma.NullableJsonNullValueInput {
    return fees ? (fees as unknown as InputJsonValue) : Prisma.JsonNull;
  }

  private async createSaleTransaction(
    dto: CreateSaleDto,
    companyId: string,
    feesJson: InputJsonValue | Prisma.NullableJsonNullValueInput,
  ) {
    return this.prisma.$transaction(async (tx) => {
      // Create the sale
      const sale = await tx.sale.create({
        data: {
          companyId,
          propertyId: dto.propertyId,
          buyerId: dto.buyerId,
          saleDate: new Date(dto.saleDate),
          saleType: dto.saleType,
          pricingMode: dto.pricingMode,
          paymentMethod: dto.paymentMethod,
          totalPrice: dto.totalPrice,
          fees: feesJson,
          transportationFee: dto.transportationFee ?? null,
          additionalFees: dto.additionalFees ?? null,
          observation: dto.observation ?? null,
        },
      });

      // Create sale items
      await tx.saleItem.createMany({
        data: dto.saleItems.map((item) => ({
          saleId: sale.id,
          animalId: item.animalId,
          price: item.price,
          weight: item.weight,
          carcassWeight: item.carcassWeight ?? null,
        })),
      });

      // Update animal statuses to sold
      const animalIds = dto.saleItems.map((item) => item.animalId);
      await tx.animal.updateMany({
        where: {
          id: {
            in: animalIds,
          },
        },
        data: {
          status: 'sold',
        },
      });

      return tx.sale.findUnique({
        where: { id: sale.id },
        include: {
          saleItems: true,
        },
      });
    });
  }

  private buildUpdateData(dto: UpdateSaleDto): Record<string, unknown> {
    const updateData: Record<string, unknown> = {};

    if (dto.saleDate !== undefined) {
      updateData.saleDate = new Date(dto.saleDate);
    }

    this.addIfDefined(updateData, 'propertyId', dto.propertyId);
    this.addIfDefined(updateData, 'buyerId', dto.buyerId);
    this.addIfDefined(updateData, 'saleType', dto.saleType);
    this.addIfDefined(updateData, 'pricingMode', dto.pricingMode);
    this.addIfDefined(updateData, 'paymentMethod', dto.paymentMethod);
    this.addIfDefined(updateData, 'totalPrice', dto.totalPrice);
    this.addIfNotUndefined(
      updateData,
      'transportationFee',
      dto.transportationFee,
    );
    this.addIfNotUndefined(updateData, 'additionalFees', dto.additionalFees);
    this.addIfNotUndefined(updateData, 'observation', dto.observation);

    if (dto.fees !== undefined) {
      updateData.fees = dto.fees
        ? (dto.fees as unknown as InputJsonValue)
        : Prisma.JsonNull;
    }

    return updateData;
  }

  private async updateSaleItems(
    saleId: string,
    saleItems: Array<{
      animalId: string;
      price: number;
      weight: number;
      carcassWeight?: number;
    }>,
  ): Promise<void> {
    // Delete existing items
    await this.prisma.saleItem.deleteMany({
      where: { saleId },
    });

    // Create new items
    await this.prisma.saleItem.createMany({
      data: saleItems.map((item) => ({
        saleId,
        animalId: item.animalId,
        price: item.price,
        weight: item.weight,
        carcassWeight: item.carcassWeight ?? null,
      })),
    });
  }

  private addIfDefined(
    data: Record<string, unknown>,
    key: string,
    value: unknown,
  ): void {
    if (value !== undefined && value !== null) {
      data[key] = value;
    }
  }

  private addIfNotUndefined(
    data: Record<string, unknown>,
    key: string,
    value: unknown,
  ): void {
    if (value !== undefined) {
      data[key] = value ?? null;
    }
  }

  private transformSale(sale: {
    id: string;
    companyId: string;
    propertyId: string;
    buyerId: string;
    saleDate: Date;
    saleType: string;
    pricingMode: string;
    paymentMethod: string;
    totalPrice: { toNumber(): number } | number;
    fees: unknown;
    transportationFee: DecimalValue;
    additionalFees: DecimalValue;
    linkedCashFlowId: string | null;
    linkedAccountsReceivableId: string | null;
    observation: string | null;
    createdAt: Date;
    updatedAt: Date;
    saleItems: Array<{
      id: string;
      animalId: string;
      price: { toNumber(): number } | number;
      weight: { toNumber(): number } | number;
      carcassWeight: DecimalValue;
      createdAt: Date;
    }>;
  }) {
    const totalPriceValue =
      typeof sale.totalPrice === 'object'
        ? sale.totalPrice.toNumber()
        : sale.totalPrice;
    const transportationFeeValue = this.extractDecimalValue(
      sale.transportationFee,
    );
    const additionalFeesValue = this.extractDecimalValue(sale.additionalFees);

    return {
      id: sale.id,
      companyId: sale.companyId,
      propertyId: sale.propertyId,
      buyerId: sale.buyerId,
      saleDate: sale.saleDate,
      saleType: sale.saleType,
      pricingMode: sale.pricingMode,
      paymentMethod: sale.paymentMethod,
      totalPrice: totalPriceValue,
      fees: sale.fees as
        | Array<{ id: string; name: string; amount: number }>
        | undefined,
      transportationFee: transportationFeeValue,
      additionalFees: additionalFeesValue,
      linkedCashFlowId: sale.linkedCashFlowId ?? undefined,
      linkedAccountsReceivableId: sale.linkedAccountsReceivableId ?? undefined,
      observation: sale.observation ?? undefined,
      saleItems: sale.saleItems.map((item) => this.transformSaleItem(item)),
      createdAt: sale.createdAt,
      updatedAt: sale.updatedAt,
    };
  }

  private extractDecimalValue(
    value: { toNumber(): number } | number | null,
  ): number | undefined {
    if (value === null) return undefined;
    return typeof value === 'object' ? value.toNumber() : value;
  }

  private transformSaleItem(item: {
    id: string;
    animalId: string;
    price: { toNumber(): number } | number;
    weight: { toNumber(): number } | number;
    carcassWeight: DecimalValue;
    createdAt: Date;
  }) {
    const carcassWeightValue = this.extractCarcassWeightValue(
      item.carcassWeight,
    );

    return {
      id: item.id,
      animalId: item.animalId,
      price:
        typeof item.price === 'object' ? item.price.toNumber() : item.price,
      weight:
        typeof item.weight === 'object' ? item.weight.toNumber() : item.weight,
      carcassWeight: carcassWeightValue,
      createdAt: item.createdAt,
    };
  }

  private extractCarcassWeightValue(
    value: { toNumber(): number } | number | null,
  ): number | undefined {
    if (value === null) return undefined;
    return typeof value === 'object' ? value.toNumber() : value;
  }
}
