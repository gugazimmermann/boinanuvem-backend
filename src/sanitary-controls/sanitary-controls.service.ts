import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/services/prisma.service';
import { Prisma } from '@prisma/client';
import { CreateSanitaryControlDto, UpdateSanitaryControlDto } from './dto';

@Injectable()
export class SanitaryControlsService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, createDto: CreateSanitaryControlDto) {
    const companyId = await this.getUserCompanyId(userId);

    // Validate animal belongs to company
    await this.validateAnimalBelongsToCompany(createDto.animalId, companyId);

    // Validate inventory item if provided
    if (createDto.itemId) {
      await this.validateInventoryItemBelongsToCompany(
        createDto.itemId,
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

    const sanitaryControl = await this.prisma.sanitaryControl.create({
      data: {
        animalId: createDto.animalId,
        date: new Date(createDto.date),
        itemId: createDto.itemId ?? null,
        quantity: createDto.quantity ?? null,
        calculatedDosage: createDto.calculatedDosage ?? null,
        observation: createDto.observation ?? null,
        companyId,
        employeeIds: createDto.employeeIds
          ? JSON.stringify(createDto.employeeIds)
          : Prisma.JsonNull,
        serviceProviderIds: createDto.serviceProviderIds
          ? JSON.stringify(createDto.serviceProviderIds)
          : Prisma.JsonNull,
      },
    });

    return this.transformSanitaryControl(sanitaryControl);
  }

  async findAll(userId: string) {
    const companyId = await this.getUserCompanyId(userId);

    const sanitaryControls = await this.prisma.sanitaryControl.findMany({
      where: {
        companyId,
        deletedAt: null,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return sanitaryControls.map((control) =>
      this.transformSanitaryControl(control),
    );
  }

  async findOne(userId: string, id: string) {
    const companyId = await this.getUserCompanyId(userId);
    const control = await this.findSanitaryControlByIdAndCompany(id, companyId);
    return this.transformSanitaryControl(control);
  }

  async findByAnimalId(userId: string, animalId: string) {
    const companyId = await this.getUserCompanyId(userId);

    // Validate animal belongs to company
    await this.validateAnimalBelongsToCompany(animalId, companyId);

    const sanitaryControls = await this.prisma.sanitaryControl.findMany({
      where: {
        animalId,
        companyId,
        deletedAt: null,
      },
      orderBy: {
        date: 'desc',
      },
    });

    return sanitaryControls.map((control) =>
      this.transformSanitaryControl(control),
    );
  }

  async update(
    userId: string,
    id: string,
    updateDto: UpdateSanitaryControlDto,
  ) {
    const companyId = await this.getUserCompanyId(userId);
    await this.findSanitaryControlByIdAndCompany(id, companyId);

    // Validate animal if being updated
    if (updateDto.animalId) {
      await this.validateAnimalBelongsToCompany(updateDto.animalId, companyId);
    }

    // Validate inventory item if being updated
    if (updateDto.itemId !== undefined) {
      if (updateDto.itemId) {
        await this.validateInventoryItemBelongsToCompany(
          updateDto.itemId,
          companyId,
        );
      }
    }

    // Validate employees if being updated
    if (updateDto.employeeIds !== undefined) {
      if (updateDto.employeeIds.length > 0) {
        await this.validateEmployeesBelongToCompany(
          updateDto.employeeIds,
          companyId,
        );
      }
    }

    // Validate service providers if being updated
    if (updateDto.serviceProviderIds !== undefined) {
      if (updateDto.serviceProviderIds.length > 0) {
        await this.validateServiceProvidersBelongToCompany(
          updateDto.serviceProviderIds,
          companyId,
        );
      }
    }

    const updateData = this.buildUpdateData(updateDto);
    const updated = await this.prisma.sanitaryControl.update({
      where: { id },
      data: updateData,
    });

    return this.transformSanitaryControl(updated);
  }

  async remove(userId: string, id: string) {
    const companyId = await this.getUserCompanyId(userId);
    await this.findSanitaryControlByIdAndCompany(id, companyId);

    // Soft delete
    await this.prisma.sanitaryControl.update({
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

  private async findSanitaryControlByIdAndCompany(
    id: string,
    companyId: string,
  ) {
    const control = await this.prisma.sanitaryControl.findFirst({
      where: {
        id,
        companyId,
        deletedAt: null,
      },
    });

    if (!control) {
      throw new NotFoundException('Sanitary control not found');
    }

    return control;
  }

  private async validateAnimalBelongsToCompany(
    animalId: string,
    companyId: string,
  ) {
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
    updateDto: UpdateSanitaryControlDto,
  ): Record<string, unknown> {
    const data: Record<string, unknown> = {};

    if (updateDto.animalId !== undefined) data.animalId = updateDto.animalId;
    if (updateDto.date !== undefined) data.date = new Date(updateDto.date);
    if (updateDto.itemId !== undefined) data.itemId = updateDto.itemId;
    if (updateDto.quantity !== undefined) data.quantity = updateDto.quantity;
    if (updateDto.calculatedDosage !== undefined)
      data.calculatedDosage = updateDto.calculatedDosage;
    if (updateDto.observation !== undefined)
      data.observation = updateDto.observation;
    if (updateDto.employeeIds !== undefined)
      data.employeeIds =
        updateDto.employeeIds.length > 0
          ? JSON.stringify(updateDto.employeeIds)
          : null;
    if (updateDto.serviceProviderIds !== undefined)
      data.serviceProviderIds =
        updateDto.serviceProviderIds.length > 0
          ? JSON.stringify(updateDto.serviceProviderIds)
          : null;

    return data;
  }

  private transformSanitaryControl(control: {
    id: string;
    animalId: string;
    date: Date;
    itemId: string | null;
    quantity: { toNumber(): number } | number | null;
    calculatedDosage: { toNumber(): number } | number | null;
    observation: string | null;
    companyId: string;
    employeeIds: Prisma.JsonValue;
    serviceProviderIds: Prisma.JsonValue;
    createdAt: Date;
    updatedAt: Date;
  }) {
    let quantityValue: number | undefined;
    if (control.quantity) {
      quantityValue =
        typeof control.quantity === 'object'
          ? control.quantity.toNumber()
          : control.quantity;
    }

    let calculatedDosageValue: number | undefined;
    if (control.calculatedDosage) {
      calculatedDosageValue =
        typeof control.calculatedDosage === 'object'
          ? control.calculatedDosage.toNumber()
          : control.calculatedDosage;
    }

    return {
      id: control.id,
      animalId: control.animalId,
      date: control.date,
      itemId: control.itemId,
      quantity: quantityValue,
      calculatedDosage: calculatedDosageValue,
      observation: control.observation,
      companyId: control.companyId,
      employeeIds: control.employeeIds
        ? (JSON.parse(control.employeeIds as string) as string[])
        : [],
      serviceProviderIds: control.serviceProviderIds
        ? (JSON.parse(control.serviceProviderIds as string) as string[])
        : [],
      createdAt: control.createdAt,
      updatedAt: control.updatedAt,
    };
  }
}
