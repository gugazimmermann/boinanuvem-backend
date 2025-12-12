import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../common/services/prisma.service';
import {
  CreateInventoryItemDto,
  UpdateInventoryItemDto,
  InventoryItemCategory,
} from './dto';

@Injectable()
export class InventoryItemsService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, createDto: CreateInventoryItemDto) {
    const companyId = await this.getUserCompanyId(userId);

    // Validate all properties belong to company
    await this.validatePropertiesBelongToCompany(
      createDto.propertyIds,
      companyId,
    );

    // Check if code already exists for this company (excluding soft-deleted)
    const existing = await this.findByCode(companyId, createDto.code);

    if (existing) {
      throw new ConflictException(
        'Inventory item with this code already exists for your company',
      );
    }

    // Validate supplier if provided
    if (createDto.supplierId) {
      await this.validateSupplierBelongsToCompany(
        createDto.supplierId,
        companyId,
      );
    }

    // Create inventory item
    const inventoryItem = await this.prisma.inventoryItem.create({
      data: {
        code: createDto.code,
        name: createDto.name,
        description: createDto.description ?? null,
        category: createDto.category,
        customCategory:
          createDto.category === InventoryItemCategory.CUSTOM
            ? (createDto.customCategory ?? null)
            : null,
        unit: createDto.unit,
        minimumStock: createDto.minimumStock,
        unitPrice: createDto.unitPrice ?? null,
        supplierId: createDto.supplierId ?? null,
        hasExpiration: createDto.hasExpiration,
        expirationDate: createDto.expirationDate
          ? new Date(createDto.expirationDate)
          : null,
        usageAmount: createDto.usageAmount ?? null,
        usageUnit: createDto.usageUnit ?? null,
        usageBasis: createDto.usageBasis ?? null,
        companyId,
      },
    });

    // Create property relations
    if (createDto.propertyIds.length > 0) {
      await this.prisma.inventoryItemProperty.createMany({
        data: createDto.propertyIds.map((propertyId) => ({
          inventoryItemId: inventoryItem.id,
          propertyId,
        })),
      });
    }

    // Fetch created item with relations
    const createdItem = await this.prisma.inventoryItem.findUnique({
      where: { id: inventoryItem.id },
      include: {
        properties: {
          select: {
            propertyId: true,
          },
        },
      },
    });

    return this.transformInventoryItem(createdItem!);
  }

  async findAll(userId: string) {
    const companyId = await this.getUserCompanyId(userId);

    const inventoryItems = await this.prisma.inventoryItem.findMany({
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
    });

    return inventoryItems.map((item) => this.transformInventoryItem(item));
  }

  async findOne(userId: string, id: string) {
    const companyId = await this.getUserCompanyId(userId);
    const item = await this.findInventoryItemByIdAndCompany(id, companyId);
    return this.transformInventoryItem(item);
  }

  async update(userId: string, id: string, updateDto: UpdateInventoryItemDto) {
    const companyId = await this.getUserCompanyId(userId);
    const existing = await this.findInventoryItemByIdAndCompany(id, companyId);

    // If code is being updated, check for conflicts
    if (
      updateDto.code !== undefined &&
      updateDto.code !== null &&
      updateDto.code !== '' &&
      updateDto.code !== existing.code
    ) {
      await this.validateCodeConflict(
        companyId,
        id,
        updateDto.code,
        existing.code,
      );
    }

    // If propertyIds are being updated, validate they belong to company
    if (updateDto.propertyIds) {
      await this.validatePropertiesBelongToCompany(
        updateDto.propertyIds,
        companyId,
      );
    }

    // If supplierId is being updated, validate it belongs to company
    if (updateDto.supplierId !== undefined) {
      if (updateDto.supplierId) {
        await this.validateSupplierBelongsToCompany(
          updateDto.supplierId,
          companyId,
        );
      }
    }

    const updateData = this.buildUpdateData(updateDto);
    await this.prisma.inventoryItem.update({
      where: { id },
      data: updateData,
    });

    // Update property relations if provided
    if (updateDto.propertyIds !== undefined) {
      // Delete existing relations
      await this.prisma.inventoryItemProperty.deleteMany({
        where: { inventoryItemId: id },
      });

      // Create new relations
      if (updateDto.propertyIds.length > 0) {
        await this.prisma.inventoryItemProperty.createMany({
          data: updateDto.propertyIds.map((propertyId) => ({
            inventoryItemId: id,
            propertyId,
          })),
        });
      }
    }

    // Fetch updated item with relations
    const updatedItem = await this.prisma.inventoryItem.findUnique({
      where: { id },
      include: {
        properties: {
          select: {
            propertyId: true,
          },
        },
      },
    });

    return this.transformInventoryItem(updatedItem!);
  }

  async remove(userId: string, id: string) {
    const companyId = await this.getUserCompanyId(userId);
    await this.findInventoryItemByIdAndCompany(id, companyId);

    // Soft delete
    await this.prisma.inventoryItem.update({
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

  private async findInventoryItemByIdAndCompany(id: string, companyId: string) {
    const item = await this.prisma.inventoryItem.findFirst({
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

    if (!item) {
      throw new NotFoundException('Inventory item not found');
    }

    return item;
  }

  private async findByCode(companyId: string, code: string) {
    return this.prisma.inventoryItem.findFirst({
      where: {
        companyId,
        code,
        deletedAt: null,
      },
    });
  }

  private async validateCodeConflict(
    companyId: string,
    excludeId: string,
    newCode: string,
    currentCode: string,
  ) {
    if (newCode === currentCode) {
      return; // No change
    }

    const existing = await this.findByCode(companyId, newCode);
    if (existing && existing.id !== excludeId) {
      throw new ConflictException(
        'Inventory item with this code already exists for your company',
      );
    }
  }

  private async validatePropertiesBelongToCompany(
    propertyIds: string[],
    companyId: string,
  ) {
    if (propertyIds.length === 0) {
      return;
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

  private buildUpdateData(
    updateDto: UpdateInventoryItemDto,
  ): Record<string, unknown> {
    const data: Record<string, unknown> = {};

    const fieldMappings: Array<
      [keyof UpdateInventoryItemDto, string, ((val: any) => any) | undefined]
    > = [
      ['code', 'code', undefined],
      ['name', 'name', undefined],
      ['description', 'description', undefined],
      ['unit', 'unit', undefined],
      ['minimumStock', 'minimumStock', undefined],
      ['unitPrice', 'unitPrice', undefined],
      ['supplierId', 'supplierId', undefined],
      ['hasExpiration', 'hasExpiration', undefined],
      [
        'expirationDate',
        'expirationDate',
        (val: string | undefined) => (val ? new Date(val) : null),
      ],
      ['usageAmount', 'usageAmount', undefined],
      ['usageUnit', 'usageUnit', undefined],
      ['usageBasis', 'usageBasis', undefined],
    ];

    for (const [dtoKey, dataKey, transform] of fieldMappings) {
      if (updateDto[dtoKey] !== undefined) {
        data[dataKey] = transform
          ? transform(updateDto[dtoKey])
          : updateDto[dtoKey];
      }
    }

    // Handle category and customCategory together
    if (updateDto.category !== undefined) {
      data.category = updateDto.category;
      data.customCategory =
        updateDto.category === InventoryItemCategory.CUSTOM
          ? updateDto.customCategory
          : null;
    }

    return data;
  }

  private transformInventoryItem(item: {
    id: string;
    code: string;
    name: string;
    description: string | null;
    category: string;
    customCategory: string | null;
    unit: string;
    minimumStock: { toNumber(): number } | number;
    unitPrice: { toNumber(): number } | number | null;
    supplierId: string | null;
    hasExpiration: boolean;
    expirationDate: Date | null;
    usageAmount: { toNumber(): number } | number | null;
    usageUnit: string | null;
    usageBasis: string | null;
    companyId: string;
    properties?: Array<{ propertyId: string }>;
    createdAt: Date;
    updatedAt: Date;
  }) {
    const minimumStockValue =
      typeof item.minimumStock === 'object'
        ? item.minimumStock.toNumber()
        : item.minimumStock;
    let unitPriceValue: number | undefined;
    if (item.unitPrice) {
      unitPriceValue =
        typeof item.unitPrice === 'object'
          ? item.unitPrice.toNumber()
          : item.unitPrice;
    }

    let usageAmountValue: number | undefined;
    if (item.usageAmount) {
      usageAmountValue =
        typeof item.usageAmount === 'object'
          ? item.usageAmount.toNumber()
          : item.usageAmount;
    }

    return {
      id: item.id,
      code: item.code,
      name: item.name,
      description: item.description,
      category: item.category,
      customCategory: item.customCategory,
      unit: item.unit,
      minimumStock: minimumStockValue,
      unitPrice: unitPriceValue,
      supplierId: item.supplierId,
      hasExpiration: item.hasExpiration,
      expirationDate: item.expirationDate,
      usageAmount: usageAmountValue,
      usageUnit: item.usageUnit,
      usageBasis: item.usageBasis,
      companyId: item.companyId,
      propertyIds: item.properties
        ? item.properties.map((p) => p.propertyId)
        : [],
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    };
  }
}
