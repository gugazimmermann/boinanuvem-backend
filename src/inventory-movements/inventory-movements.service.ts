import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/services/prisma.service';
import { Prisma } from '@prisma/client';
import { CreateInventoryMovementDto, UpdateInventoryMovementDto } from './dto';

@Injectable()
export class InventoryMovementsService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, createDto: CreateInventoryMovementDto) {
    const companyId = await this.getUserCompanyId(userId);

    // Validate inventory item belongs to company
    await this.validateInventoryItemBelongsToCompany(
      createDto.itemId,
      companyId,
    );

    // Validate property belongs to company
    await this.validatePropertyBelongsToCompany(
      createDto.propertyId,
      companyId,
    );

    // Validate location if provided
    if (createDto.locationId) {
      await this.validateLocationBelongsToCompanyAndProperty(
        createDto.locationId,
        createDto.propertyId,
        companyId,
      );
    }

    // Validate supplier if provided (required for purchase type)
    if (createDto.supplierId) {
      await this.validateSupplierBelongsToCompany(
        createDto.supplierId,
        companyId,
      );
    }

    // Validate employees if provided
    if (createDto.employeeIds && createDto.employeeIds.length > 0) {
      await this.validateEmployeesBelongToCompany(
        createDto.employeeIds,
        companyId,
      );
    }

    // Validate service providers if provided
    if (
      createDto.serviceProviderIds &&
      createDto.serviceProviderIds.length > 0
    ) {
      await this.validateServiceProvidersBelongToCompany(
        createDto.serviceProviderIds,
        companyId,
      );
    }

    const inventoryMovement = await this.prisma.inventoryMovement.create({
      data: {
        itemId: createDto.itemId,
        type: createDto.type,
        quantity: createDto.quantity,
        unitPrice: createDto.unitPrice ?? null,
        date: new Date(createDto.date),
        description: createDto.description ?? null,
        supplierId: createDto.supplierId ?? null,
        propertyId: createDto.propertyId,
        companyId,
        locationId: createDto.locationId ?? null,
        expirationDate: createDto.expirationDate
          ? new Date(createDto.expirationDate)
          : null,
        employeeIds: createDto.employeeIds
          ? JSON.stringify(createDto.employeeIds)
          : Prisma.JsonNull,
        serviceProviderIds: createDto.serviceProviderIds
          ? JSON.stringify(createDto.serviceProviderIds)
          : Prisma.JsonNull,
        observation: createDto.observation ?? null,
        fileIds: createDto.fileIds
          ? JSON.stringify(createDto.fileIds)
          : Prisma.JsonNull,
      },
    });

    return this.transformInventoryMovement(inventoryMovement);
  }

  async findAll(userId: string) {
    const companyId = await this.getUserCompanyId(userId);

    const inventoryMovements = await this.prisma.inventoryMovement.findMany({
      where: {
        companyId,
        deletedAt: null,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return inventoryMovements.map((movement) =>
      this.transformInventoryMovement(movement),
    );
  }

  async findOne(userId: string, id: string) {
    const companyId = await this.getUserCompanyId(userId);
    const movement = await this.findInventoryMovementByIdAndCompany(
      id,
      companyId,
    );
    return this.transformInventoryMovement(movement);
  }

  async findByItemId(userId: string, itemId: string) {
    return this.findMovementsByFilter(userId, { itemId }, (id, companyId) =>
      this.validateInventoryItemBelongsToCompany(id, companyId),
    );
  }

  async findByPropertyId(userId: string, propertyId: string) {
    return this.findMovementsByFilter(userId, { propertyId }, (id, companyId) =>
      this.validatePropertyBelongsToCompany(id, companyId),
    );
  }

  async findByLocationId(userId: string, locationId: string) {
    return this.findMovementsByFilter(userId, { locationId }, (id, companyId) =>
      this.validateLocationBelongsToCompany(id, companyId),
    );
  }

  private async findMovementsByFilter(
    userId: string,
    filter: { itemId?: string; propertyId?: string; locationId?: string },
    validator: (id: string, companyId: string) => Promise<void>,
  ) {
    const companyId = await this.getUserCompanyId(userId);

    // Get the ID to validate (one of itemId, propertyId, or locationId)
    const idToValidate =
      filter.itemId ?? filter.propertyId ?? filter.locationId;
    if (!idToValidate) {
      throw new Error('At least one filter must be provided');
    }

    // Validate the entity belongs to company
    await validator(idToValidate, companyId);

    // Build the where clause
    const where: {
      itemId?: string;
      propertyId?: string;
      locationId?: string;
      companyId: string;
      deletedAt: null;
    } = {
      ...filter,
      companyId,
      deletedAt: null,
    };

    const inventoryMovements = await this.prisma.inventoryMovement.findMany({
      where,
      orderBy: {
        date: 'desc',
      },
    });

    return inventoryMovements.map((movement) =>
      this.transformInventoryMovement(movement),
    );
  }

  async update(
    userId: string,
    id: string,
    updateDto: UpdateInventoryMovementDto,
  ) {
    const companyId = await this.getUserCompanyId(userId);
    await this.findInventoryMovementByIdAndCompany(id, companyId);

    await this.validateUpdateDto(updateDto, id, companyId);

    const updateData = this.buildUpdateData(updateDto);
    const updated = await this.prisma.inventoryMovement.update({
      where: { id },
      data: updateData,
    });

    return this.transformInventoryMovement(updated);
  }

  private async validateUpdateDto(
    updateDto: UpdateInventoryMovementDto,
    movementId: string,
    companyId: string,
  ) {
    if (updateDto.itemId) {
      await this.validateInventoryItemBelongsToCompany(
        updateDto.itemId,
        companyId,
      );
    }

    if (updateDto.propertyId) {
      await this.validatePropertyBelongsToCompany(
        updateDto.propertyId,
        companyId,
      );
    }

    if (updateDto.locationId !== undefined && updateDto.locationId) {
      const propertyId =
        updateDto.propertyId ?? (await this.getMovementPropertyId(movementId));
      if (!propertyId) {
        throw new NotFoundException(
          'Property ID is required when updating location',
        );
      }
      await this.validateLocationBelongsToCompanyAndProperty(
        updateDto.locationId,
        propertyId,
        companyId,
      );
    }

    if (updateDto.supplierId !== undefined && updateDto.supplierId) {
      await this.validateSupplierBelongsToCompany(
        updateDto.supplierId,
        companyId,
      );
    }

    if (
      updateDto.employeeIds !== undefined &&
      updateDto.employeeIds.length > 0
    ) {
      await this.validateEmployeesBelongToCompany(
        updateDto.employeeIds,
        companyId,
      );
    }

    if (
      updateDto.serviceProviderIds !== undefined &&
      updateDto.serviceProviderIds.length > 0
    ) {
      await this.validateServiceProvidersBelongToCompany(
        updateDto.serviceProviderIds,
        companyId,
      );
    }
  }

  async remove(userId: string, id: string) {
    const companyId = await this.getUserCompanyId(userId);
    await this.findInventoryMovementByIdAndCompany(id, companyId);

    // Soft delete
    await this.prisma.inventoryMovement.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
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

  private async findInventoryMovementByIdAndCompany(
    id: string,
    companyId: string,
  ) {
    const movement = await this.prisma.inventoryMovement.findFirst({
      where: {
        id,
        companyId,
        deletedAt: null,
      },
    });

    if (!movement) {
      throw new NotFoundException('Inventory movement not found');
    }

    return movement;
  }

  private async getMovementPropertyId(
    movementId: string,
  ): Promise<string | null> {
    const movement = await this.prisma.inventoryMovement.findUnique({
      where: { id: movementId },
      select: { propertyId: true },
    });
    return movement?.propertyId ?? null;
  }

  private async validateInventoryItemBelongsToCompany(
    itemId: string,
    companyId: string,
  ) {
    const item = await this.prisma.inventoryItem.findFirst({
      where: {
        id: itemId,
        companyId,
        deletedAt: null,
      },
    });

    if (!item) {
      throw new NotFoundException(
        'Inventory item not found or does not belong to your company',
      );
    }
  }

  private async validatePropertyBelongsToCompany(
    propertyId: string,
    companyId: string,
  ) {
    const property = await this.prisma.property.findFirst({
      where: {
        id: propertyId,
        companyId,
        deletedAt: null,
      },
    });

    if (!property) {
      throw new NotFoundException(
        'Property not found or does not belong to your company',
      );
    }
  }

  private async validateLocationBelongsToCompany(
    locationId: string,
    companyId: string,
  ) {
    const location = await this.prisma.location.findFirst({
      where: {
        id: locationId,
        companyId,
        deletedAt: null,
      },
    });

    if (!location) {
      throw new NotFoundException(
        'Location not found or does not belong to your company',
      );
    }
  }

  private async validateLocationBelongsToCompanyAndProperty(
    locationId: string,
    propertyId: string,
    companyId: string,
  ) {
    const location = await this.prisma.location.findFirst({
      where: {
        id: locationId,
        propertyId,
        companyId,
        deletedAt: null,
      },
    });

    if (!location) {
      throw new NotFoundException(
        'Location not found, does not belong to your company, or does not belong to the specified property',
      );
    }
  }

  private async validateSupplierBelongsToCompany(
    supplierId: string,
    companyId: string,
  ) {
    const supplier = await this.prisma.supplier.findFirst({
      where: {
        id: supplierId,
        companyId,
        deletedAt: null,
      },
    });

    if (!supplier) {
      throw new NotFoundException(
        'Supplier not found or does not belong to your company',
      );
    }
  }

  private async validateEmployeesBelongToCompany(
    employeeIds: string[],
    companyId: string,
  ) {
    const employees = await this.prisma.employee.findMany({
      where: {
        id: { in: employeeIds },
        companyId,
        deletedAt: null,
      },
      select: { id: true },
    });

    if (employees.length !== employeeIds.length) {
      throw new NotFoundException(
        'One or more employees not found or do not belong to your company',
      );
    }
  }

  private async validateServiceProvidersBelongToCompany(
    serviceProviderIds: string[],
    companyId: string,
  ) {
    const serviceProviders = await this.prisma.serviceProvider.findMany({
      where: {
        id: { in: serviceProviderIds },
        companyId,
        deletedAt: null,
      },
      select: { id: true },
    });

    if (serviceProviders.length !== serviceProviderIds.length) {
      throw new NotFoundException(
        'One or more service providers not found or do not belong to your company',
      );
    }
  }

  private buildUpdateData(
    updateDto: UpdateInventoryMovementDto,
  ): Record<string, unknown> {
    const data: Record<string, unknown> = {};

    this.setIfDefined(data, 'itemId', updateDto.itemId);
    this.setIfDefined(data, 'type', updateDto.type);
    this.setIfDefined(data, 'quantity', updateDto.quantity);
    this.setIfDefined(data, 'unitPrice', updateDto.unitPrice);
    this.setIfDefined(data, 'description', updateDto.description);
    this.setIfDefined(data, 'supplierId', updateDto.supplierId);
    this.setIfDefined(data, 'propertyId', updateDto.propertyId);
    this.setIfDefined(data, 'locationId', updateDto.locationId);
    this.setIfDefined(data, 'observation', updateDto.observation);

    if (updateDto.date !== undefined) {
      data.date = new Date(updateDto.date);
    }
    if (updateDto.expirationDate !== undefined) {
      data.expirationDate = updateDto.expirationDate
        ? new Date(updateDto.expirationDate)
        : null;
    }
    if (updateDto.employeeIds !== undefined) {
      data.employeeIds = this.stringifyArrayIfNotEmpty(updateDto.employeeIds);
    }
    if (updateDto.serviceProviderIds !== undefined) {
      data.serviceProviderIds = this.stringifyArrayIfNotEmpty(
        updateDto.serviceProviderIds,
      );
    }
    if (updateDto.fileIds !== undefined) {
      data.fileIds = this.stringifyArrayIfNotEmpty(updateDto.fileIds);
    }

    return data;
  }

  private setIfDefined(
    data: Record<string, unknown>,
    key: string,
    value: unknown,
  ) {
    if (value !== undefined) {
      data[key] = value;
    }
  }

  private stringifyArrayIfNotEmpty(arr: string[]): string | null {
    return arr.length > 0 ? JSON.stringify(arr) : null;
  }

  private transformInventoryMovement(movement: {
    id: string;
    itemId: string;
    type: string;
    quantity: { toNumber(): number } | number;
    unitPrice: { toNumber(): number } | number | null;
    date: Date;
    description: string | null;
    supplierId: string | null;
    cashFlowId: string | null;
    propertyId: string;
    companyId: string;
    locationId: string | null;
    expirationDate: Date | null;
    employeeIds: Prisma.JsonValue;
    serviceProviderIds: Prisma.JsonValue;
    observation: string | null;
    fileIds: Prisma.JsonValue;
    createdAt: Date;
    updatedAt: Date;
  }) {
    const quantityValue: number =
      typeof movement.quantity === 'object'
        ? movement.quantity.toNumber()
        : movement.quantity;

    let unitPriceValue: number | undefined;
    if (movement.unitPrice) {
      unitPriceValue =
        typeof movement.unitPrice === 'object'
          ? movement.unitPrice.toNumber()
          : movement.unitPrice;
    }

    return {
      id: movement.id,
      itemId: movement.itemId,
      type: movement.type,
      quantity: quantityValue,
      unitPrice: unitPriceValue,
      date: movement.date,
      description: movement.description,
      supplierId: movement.supplierId,
      cashFlowId: movement.cashFlowId,
      propertyId: movement.propertyId,
      companyId: movement.companyId,
      locationId: movement.locationId,
      expirationDate: movement.expirationDate,
      employeeIds: movement.employeeIds
        ? (JSON.parse(movement.employeeIds as string) as string[])
        : [],
      serviceProviderIds: movement.serviceProviderIds
        ? (JSON.parse(movement.serviceProviderIds as string) as string[])
        : [],
      observation: movement.observation,
      fileIds: movement.fileIds
        ? (JSON.parse(movement.fileIds as string) as string[])
        : [],
      createdAt: movement.createdAt,
      updatedAt: movement.updatedAt,
    };
  }
}
