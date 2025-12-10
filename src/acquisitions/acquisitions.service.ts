import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../common/services/prisma.service';
import type { InputJsonValue } from '@prisma/client/runtime/library';
import { Prisma } from '@prisma/client';
import { CreateAcquisitionDto, UpdateAcquisitionDto, PricingMode } from './dto';

const ARROBA_KG = 30;

type DecimalValue = { toNumber(): number } | number | null;

@Injectable()
export class AcquisitionsService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, createAcquisitionDto: CreateAcquisitionDto) {
    const companyId = await this.getUserCompanyId(userId);

    await this.validateAcquisitionInputs(createAcquisitionDto, companyId);

    const totalFees = this.calculateTotalFees(
      createAcquisitionDto.fees,
      createAcquisitionDto.transportationFee,
      createAcquisitionDto.handlingFee,
    );

    const totalCost = createAcquisitionDto.totalPrice + (totalFees ?? 0);

    const processedItems = await this.processAcquisitionItems(
      createAcquisitionDto.acquisitionItems,
      createAcquisitionDto.pricingMode,
      totalCost,
      companyId,
      createAcquisitionDto.propertyId,
    );

    const feesJson = this.prepareFeesJson(createAcquisitionDto.fees);

    const result = await this.createAcquisitionTransaction(
      createAcquisitionDto,
      processedItems,
      companyId,
      feesJson,
    );

    return this.transformAcquisition(result!);
  }

  private async validateAcquisitionInputs(
    dto: CreateAcquisitionDto,
    companyId: string,
  ): Promise<void> {
    await this.validatePropertyBelongsToCompany(dto.propertyId, companyId);
    await this.validateSupplierBelongsToCompany(dto.supplierId, companyId);
  }

  private prepareFeesJson(
    fees?: Array<{ id: string; name: string; amount: number }>,
  ): InputJsonValue | Prisma.NullableJsonNullValueInput {
    return fees ? (fees as unknown as InputJsonValue) : Prisma.JsonNull;
  }

  private async createAcquisitionTransaction(
    dto: CreateAcquisitionDto,
    processedItems: Array<{
      animalId: string;
      price: number;
      weight: number;
      costPerArroba: number;
      breed?: string;
      gender?: string;
      birthDate?: string;
      motherId?: string;
      fatherId?: string;
      motherRegistrationNumber?: string;
      fatherRegistrationNumber?: string;
      purity?: string;
      birthObservation?: string;
    }>,
    companyId: string,
    feesJson: InputJsonValue | Prisma.NullableJsonNullValueInput,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const acquisition = await tx.acquisition.create({
        data: {
          companyId,
          propertyId: dto.propertyId,
          supplierId: dto.supplierId,
          acquisitionDate: new Date(dto.acquisitionDate),
          pricingMode: dto.pricingMode,
          paymentMethod: dto.paymentMethod,
          totalPrice: dto.totalPrice,
          transportationFee: dto.transportationFee ?? null,
          handlingFee: dto.handlingFee ?? null,
          fees: feesJson,
          observation: dto.observation ?? null,
        },
      });

      await tx.acquisitionItem.createMany({
        data: this.mapItemsToCreateData(processedItems, acquisition.id),
      });

      return tx.acquisition.findUnique({
        where: { id: acquisition.id },
        include: {
          acquisitionItems: true,
        },
      });
    });
  }

  private mapItemsToCreateData(
    items: Array<{
      animalId: string;
      price: number;
      weight: number;
      costPerArroba: number;
      breed?: string;
      gender?: string;
      birthDate?: string;
      motherId?: string;
      fatherId?: string;
      motherRegistrationNumber?: string;
      fatherRegistrationNumber?: string;
      purity?: string;
      birthObservation?: string;
    }>,
    acquisitionId: string,
  ) {
    return items.map((item) => ({
      acquisitionId,
      animalId: item.animalId,
      price: item.price,
      weight: item.weight,
      costPerArroba: item.costPerArroba,
      breed: item.breed ?? null,
      gender: item.gender ?? null,
      birthDate: item.birthDate ? new Date(item.birthDate) : null,
      motherId: item.motherId ?? null,
      fatherId: item.fatherId ?? null,
      motherRegistrationNumber: item.motherRegistrationNumber ?? null,
      fatherRegistrationNumber: item.fatherRegistrationNumber ?? null,
      purity: item.purity ?? null,
      birthObservation: item.birthObservation ?? null,
    }));
  }

  async findAll(userId: string) {
    const companyId = await this.getUserCompanyId(userId);

    const acquisitions = await this.prisma.acquisition.findMany({
      where: {
        companyId,
        deletedAt: null,
      },
      include: {
        acquisitionItems: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return acquisitions.map((acquisition) =>
      this.transformAcquisition(acquisition),
    );
  }

  async findOne(userId: string, id: string) {
    const companyId = await this.getUserCompanyId(userId);
    const acquisition = await this.findAcquisitionByIdAndCompany(id, companyId);
    return this.transformAcquisition(acquisition);
  }

  async findByAnimalId(userId: string, animalId: string) {
    const companyId = await this.getUserCompanyId(userId);

    // Validate animal belongs to company
    await this.validateAnimalBelongsToCompany(animalId, companyId);

    const acquisitionItem = await this.prisma.acquisitionItem.findFirst({
      where: {
        animalId,
      },
      include: {
        acquisition: {
          include: {
            acquisitionItems: true,
          },
        },
      },
    });

    if (
      !acquisitionItem ||
      acquisitionItem.acquisition.companyId !== companyId ||
      acquisitionItem.acquisition.deletedAt
    ) {
      throw new NotFoundException(
        'Acquisition record not found for this animal',
      );
    }

    return this.transformAcquisition(acquisitionItem.acquisition);
  }

  async update(
    userId: string,
    id: string,
    updateAcquisitionDto: UpdateAcquisitionDto,
  ) {
    const companyId = await this.getUserCompanyId(userId);
    const existing = await this.findAcquisitionByIdAndCompany(id, companyId);

    await this.validateUpdateInputs(updateAcquisitionDto, companyId);

    const updateData = this.buildUpdateData(updateAcquisitionDto);

    if (updateAcquisitionDto.acquisitionItems) {
      await this.updateAcquisitionItems(
        id,
        updateAcquisitionDto,
        existing,
        companyId,
      );
    }

    const updated = await this.prisma.acquisition.update({
      where: { id },
      data: updateData,
      include: {
        acquisitionItems: true,
      },
    });

    return this.transformAcquisition(updated);
  }

  private async validateUpdateInputs(
    dto: UpdateAcquisitionDto,
    companyId: string,
  ): Promise<void> {
    if (dto.propertyId) {
      await this.validatePropertyBelongsToCompany(dto.propertyId, companyId);
    }

    if (dto.supplierId) {
      await this.validateSupplierBelongsToCompany(dto.supplierId, companyId);
    }
  }

  private buildUpdateData(dto: UpdateAcquisitionDto): Record<string, unknown> {
    const updateData: Record<string, unknown> = {};

    if (dto.acquisitionDate !== undefined) {
      updateData.acquisitionDate = new Date(dto.acquisitionDate);
    }

    this.addIfDefined(updateData, 'propertyId', dto.propertyId);
    this.addIfDefined(updateData, 'supplierId', dto.supplierId);
    this.addIfDefined(updateData, 'pricingMode', dto.pricingMode);
    this.addIfDefined(updateData, 'paymentMethod', dto.paymentMethod);
    this.addIfDefined(updateData, 'totalPrice', dto.totalPrice);
    this.addIfNotUndefined(
      updateData,
      'transportationFee',
      dto.transportationFee,
    );
    this.addIfNotUndefined(updateData, 'handlingFee', dto.handlingFee);
    this.addIfNotUndefined(updateData, 'observation', dto.observation);

    if (dto.fees !== undefined) {
      updateData.fees = dto.fees
        ? (dto.fees as unknown as InputJsonValue)
        : Prisma.JsonNull;
    }

    return updateData;
  }

  private async updateAcquisitionItems(
    acquisitionId: string,
    dto: UpdateAcquisitionDto,
    existing: {
      totalPrice: { toNumber(): number };
      pricingMode: string;
      propertyId: string;
      transportationFee: DecimalValue;
      handlingFee: DecimalValue;
      fees: unknown;
    },
    companyId: string,
  ): Promise<void> {
    await this.prisma.acquisitionItem.deleteMany({
      where: { acquisitionId },
    });

    const existingFees = existing.fees as Array<{ amount: number }> | null;
    const totalFees = this.calculateTotalFees(
      dto.fees ?? existingFees ?? undefined,
      dto.transportationFee ??
        this.extractDecimalValue(existing.transportationFee),
      dto.handlingFee ?? this.extractDecimalValue(existing.handlingFee),
    );

    const totalCost =
      (dto.totalPrice ?? existing.totalPrice.toNumber()) + (totalFees ?? 0);

    const processedItems = await this.processAcquisitionItems(
      dto.acquisitionItems!,
      (dto.pricingMode ?? existing.pricingMode) as PricingMode,
      totalCost,
      companyId,
      dto.propertyId ?? existing.propertyId,
    );

    await this.prisma.acquisitionItem.createMany({
      data: this.mapItemsToCreateData(processedItems, acquisitionId),
    });
  }

  async remove(userId: string, id: string) {
    const companyId = await this.getUserCompanyId(userId);
    await this.findAcquisitionByIdAndCompany(id, companyId);

    // Soft delete
    await this.prisma.acquisition.update({
      where: { id },
      data: {
        deletedAt: new Date(),
      },
    });

    return { message: 'Acquisition record deleted successfully' };
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

  private async findAcquisitionByIdAndCompany(id: string, companyId: string) {
    const acquisition = await this.prisma.acquisition.findFirst({
      where: {
        id,
        companyId,
        deletedAt: null,
      },
      include: {
        acquisitionItems: true,
      },
    });

    if (!acquisition) {
      throw new NotFoundException('Acquisition record not found');
    }

    return acquisition;
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

  private async validateSupplierBelongsToCompany(
    supplierId: string,
    companyId: string,
  ): Promise<void> {
    const supplier = await this.prisma.supplier.findFirst({
      where: {
        id: supplierId,
        companyId,
        deletedAt: null,
      },
      select: { id: true },
    });

    if (!supplier) {
      throw new NotFoundException(
        'Supplier not found or does not belong to your company',
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
      select: { id: true },
    });

    if (!animal) {
      throw new NotFoundException(
        'Animal not found or does not belong to your company',
      );
    }
  }

  private async processAcquisitionItems(
    items: CreateAcquisitionDto['acquisitionItems'],
    pricingMode: PricingMode,
    totalCost: number,
    companyId: string,
    propertyId: string,
  ): Promise<
    Array<{
      animalId: string;
      price: number;
      weight: number;
      costPerArroba: number;
      breed?: string;
      gender?: string;
      birthDate?: string;
      motherId?: string;
      fatherId?: string;
      motherRegistrationNumber?: string;
      fatherRegistrationNumber?: string;
      purity?: string;
      birthObservation?: string;
    }>
  > {
    const costPerAnimal = this.calculateCostPerAnimal(
      pricingMode,
      items.length,
      totalCost,
    );

    const processedItems = [];

    for (const item of items) {
      const animalId = await this.resolveAnimalId(item, companyId, propertyId);

      const price =
        pricingMode === PricingMode.TOTAL ? costPerAnimal : item.price;

      const costPerArroba = this.calculateCostPerArroba(item.weight, price);

      const processedItem = this.createProcessedItem(
        animalId,
        price,
        item.weight,
        costPerArroba,
        item,
      );

      processedItems.push(processedItem);
    }

    return processedItems;
  }

  private calculateCostPerAnimal(
    pricingMode: PricingMode,
    itemCount: number,
    totalCost: number,
  ): number {
    return pricingMode === PricingMode.TOTAL && itemCount > 0
      ? totalCost / itemCount
      : 0;
  }

  private createProcessedItem(
    animalId: string,
    price: number,
    weight: number,
    costPerArroba: number,
    item: CreateAcquisitionDto['acquisitionItems'][0],
  ): {
    animalId: string;
    price: number;
    weight: number;
    costPerArroba: number;
    breed?: string;
    gender?: string;
    birthDate?: string;
    motherId?: string;
    fatherId?: string;
    motherRegistrationNumber?: string;
    fatherRegistrationNumber?: string;
    purity?: string;
    birthObservation?: string;
  } {
    const processedItem: {
      animalId: string;
      price: number;
      weight: number;
      costPerArroba: number;
      breed?: string;
      gender?: string;
      birthDate?: string;
      motherId?: string;
      fatherId?: string;
      motherRegistrationNumber?: string;
      fatherRegistrationNumber?: string;
      purity?: string;
      birthObservation?: string;
    } = {
      animalId,
      price,
      weight,
      costPerArroba,
    };

    this.assignOptionalField(processedItem, 'breed', item.breed as string);
    this.assignOptionalField(processedItem, 'gender', item.gender as string);
    this.assignOptionalField(processedItem, 'birthDate', item.birthDate);
    this.assignOptionalField(processedItem, 'motherId', item.motherId);
    this.assignOptionalField(processedItem, 'fatherId', item.fatherId);
    this.assignOptionalField(
      processedItem,
      'motherRegistrationNumber',
      item.motherRegistrationNumber,
    );
    this.assignOptionalField(
      processedItem,
      'fatherRegistrationNumber',
      item.fatherRegistrationNumber,
    );
    this.assignOptionalField(processedItem, 'purity', item.purity as string);
    this.assignOptionalField(
      processedItem,
      'birthObservation',
      item.birthObservation,
    );

    return processedItem;
  }

  private assignOptionalField<T>(
    target: Record<string, unknown>,
    key: string,
    value: T | undefined,
  ): void {
    if (value !== undefined) {
      target[key] = value;
    }
  }

  private async resolveAnimalId(
    item: CreateAcquisitionDto['acquisitionItems'][0],
    companyId: string,
    propertyId: string,
  ): Promise<string> {
    if (item.animalId) {
      await this.validateAnimalBelongsToCompany(item.animalId, companyId);
      return item.animalId;
    }

    this.validateAnimalCreationInputs(item);

    await this.validateAnimalCodeUnique(item.code!, companyId);

    const animal = await this.createAnimalForAcquisition(
      item,
      companyId,
      propertyId,
    );

    return animal.id;
  }

  private validateAnimalCreationInputs(
    item: CreateAcquisitionDto['acquisitionItems'][0],
  ): void {
    if (!item.code || !item.registrationNumber) {
      throw new BadRequestException(
        'Code and registrationNumber are required when animalId is not provided',
      );
    }
  }

  private async validateAnimalCodeUnique(
    code: string,
    companyId: string,
  ): Promise<void> {
    const existingAnimal = await this.prisma.animal.findFirst({
      where: {
        companyId,
        code,
        deletedAt: null,
      },
    });

    if (existingAnimal) {
      throw new ConflictException(
        `Animal with code ${code} already exists for your company`,
      );
    }
  }

  private async createAnimalForAcquisition(
    item: CreateAcquisitionDto['acquisitionItems'][0],
    companyId: string,
    propertyId: string,
  ) {
    return this.prisma.animal.create({
      data: {
        code: item.code!,
        registrationNumber: item.registrationNumber!,
        acquisitionDate: item.birthDate ? new Date(item.birthDate) : null,
        status: 'active',
        companyId,
        propertyId,
      },
    });
  }

  private calculateCostPerArroba(
    weightInKg: number,
    costPerAnimal: number,
  ): number {
    if (weightInKg <= 0) return 0;
    const arrobas = weightInKg / ARROBA_KG;
    return arrobas > 0 ? costPerAnimal / arrobas : 0;
  }

  private calculateTotalFees(
    fees?: Array<{ amount: number }> | null,
    transportationFee?: number | null,
    handlingFee?: number | null,
  ): number {
    let total = 0;

    if (fees) {
      total += fees.reduce((sum, fee) => sum + fee.amount, 0);
    }

    if (transportationFee) {
      total += transportationFee;
    }

    if (handlingFee) {
      total += handlingFee;
    }

    return total;
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

  private transformAcquisition(acquisition: {
    id: string;
    companyId: string;
    propertyId: string;
    supplierId: string;
    acquisitionDate: Date;
    pricingMode: string;
    paymentMethod: string;
    totalPrice: { toNumber(): number } | number;
    transportationFee: DecimalValue;
    handlingFee: DecimalValue;
    fees: unknown;
    linkedCashFlowId: string | null;
    linkedAccountsPayableId: string | null;
    observation: string | null;
    createdAt: Date;
    updatedAt: Date;
    acquisitionItems: Array<{
      id: string;
      animalId: string;
      price: { toNumber(): number } | number;
      weight: { toNumber(): number } | number;
      costPerArroba: { toNumber(): number } | number;
      breed: string | null;
      gender: string | null;
      birthDate: Date | null;
      motherId: string | null;
      fatherId: string | null;
      motherRegistrationNumber: string | null;
      fatherRegistrationNumber: string | null;
      purity: string | null;
      birthObservation: string | null;
      createdAt: Date;
    }>;
  }) {
    const totalPriceValue =
      typeof acquisition.totalPrice === 'object'
        ? acquisition.totalPrice.toNumber()
        : acquisition.totalPrice;
    const transportationFeeValue = this.extractDecimalValue(
      acquisition.transportationFee,
    );
    const handlingFeeValue = this.extractDecimalValue(acquisition.handlingFee);

    return {
      id: acquisition.id,
      companyId: acquisition.companyId,
      propertyId: acquisition.propertyId,
      supplierId: acquisition.supplierId,
      acquisitionDate: acquisition.acquisitionDate,
      pricingMode: acquisition.pricingMode,
      paymentMethod: acquisition.paymentMethod,
      totalPrice: totalPriceValue,
      fees: acquisition.fees as
        | Array<{ id: string; name: string; amount: number }>
        | undefined,
      transportationFee: transportationFeeValue,
      handlingFee: handlingFeeValue,
      linkedCashFlowId: acquisition.linkedCashFlowId ?? undefined,
      linkedAccountsPayableId: acquisition.linkedAccountsPayableId ?? undefined,
      observation: acquisition.observation ?? undefined,
      acquisitionItems: acquisition.acquisitionItems.map((item) =>
        this.transformAcquisitionItem(item),
      ),
      createdAt: acquisition.createdAt,
      updatedAt: acquisition.updatedAt,
    };
  }

  private extractDecimalValue(
    value: { toNumber(): number } | number | null,
  ): number | undefined {
    if (value === null) return undefined;
    return typeof value === 'object' ? value.toNumber() : value;
  }

  private transformAcquisitionItem(item: {
    id: string;
    animalId: string;
    price: { toNumber(): number } | number;
    weight: { toNumber(): number } | number;
    costPerArroba: { toNumber(): number } | number;
    breed: string | null;
    gender: string | null;
    birthDate: Date | null;
    motherId: string | null;
    fatherId: string | null;
    motherRegistrationNumber: string | null;
    fatherRegistrationNumber: string | null;
    purity: string | null;
    birthObservation: string | null;
    createdAt: Date;
  }) {
    return {
      id: item.id,
      animalId: item.animalId,
      price:
        typeof item.price === 'object' ? item.price.toNumber() : item.price,
      weight:
        typeof item.weight === 'object' ? item.weight.toNumber() : item.weight,
      costPerArroba:
        typeof item.costPerArroba === 'object'
          ? item.costPerArroba.toNumber()
          : item.costPerArroba,
      breed: item.breed ?? undefined,
      gender: item.gender ?? undefined,
      birthDate: item.birthDate ?? undefined,
      motherId: item.motherId ?? undefined,
      fatherId: item.fatherId ?? undefined,
      motherRegistrationNumber: item.motherRegistrationNumber ?? undefined,
      fatherRegistrationNumber: item.fatherRegistrationNumber ?? undefined,
      purity: item.purity ?? undefined,
      birthObservation: item.birthObservation ?? undefined,
      createdAt: item.createdAt,
    };
  }
}
