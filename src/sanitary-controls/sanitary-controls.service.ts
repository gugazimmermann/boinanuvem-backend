import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/services/prisma.service';
import { Prisma } from '@prisma/client';
import { CreateSanitaryControlDto, UpdateSanitaryControlDto } from './dto';

type DecimalValue = { toNumber(): number } | number | null;

@Injectable()
export class SanitaryControlsService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, createDto: CreateSanitaryControlDto) {
    const companyId = await this.getUserCompanyId(userId);

    await this.validateAnimalBelongsToCompany(createDto.animalId, companyId);

    const medicinesToProcess = this.extractMedicinesFromCreateDto(createDto);
    await this.validateMedicines(medicinesToProcess, companyId);
    await this.validateCreateDtoRelations(createDto, companyId);

    const sanitaryControl = await this.createSanitaryControl(
      createDto,
      medicinesToProcess,
      companyId,
    );

    await this.createSanitaryControlItems(
      sanitaryControl.id,
      medicinesToProcess,
    );

    const controlWithItems = await this.prisma.sanitaryControl.findUnique({
      where: { id: sanitaryControl.id },
      include: {
        items: true,
      },
    });

    return this.transformSanitaryControl(controlWithItems!);
  }

  private extractMedicinesFromCreateDto(
    createDto: CreateSanitaryControlDto,
  ): Array<{ itemId: string; quantity: number; calculatedDosage?: number }> {
    if (createDto.appliedMedicines && createDto.appliedMedicines.length > 0) {
      return createDto.appliedMedicines;
    }
    if (createDto.itemId) {
      return [
        {
          itemId: createDto.itemId,
          quantity: createDto.quantity ?? 0,
          ...(createDto.calculatedDosage !== undefined && {
            calculatedDosage: createDto.calculatedDosage,
          }),
        },
      ];
    }
    return [];
  }

  private async validateMedicines(
    medicines: Array<{
      itemId: string;
      quantity: number;
      calculatedDosage?: number;
    }>,
    companyId: string,
  ) {
    for (const medicine of medicines) {
      await this.validateInventoryItemBelongsToCompany(
        medicine.itemId,
        companyId,
      );
    }
  }

  private async validateCreateDtoRelations(
    createDto: CreateSanitaryControlDto,
    companyId: string,
  ) {
    if (createDto.employeeIds && createDto.employeeIds.length > 0) {
      await this.validateEmployeesBelongToCompany(
        createDto.employeeIds,
        companyId,
      );
    }

    if (
      createDto.serviceProviderIds &&
      createDto.serviceProviderIds.length > 0
    ) {
      await this.validateServiceProvidersBelongToCompany(
        createDto.serviceProviderIds,
        companyId,
      );
    }
  }

  private async createSanitaryControl(
    createDto: CreateSanitaryControlDto,
    medicinesToProcess: Array<{
      itemId: string;
      quantity: number;
      calculatedDosage?: number;
    }>,
    companyId: string,
  ) {
    const firstMedicine =
      medicinesToProcess.length > 0 ? medicinesToProcess[0] : null;
    return await this.prisma.sanitaryControl.create({
      data: {
        animalId: createDto.animalId,
        date: new Date(createDto.date),
        itemId: firstMedicine?.itemId ?? null,
        quantity: firstMedicine?.quantity ?? null,
        calculatedDosage: firstMedicine?.calculatedDosage ?? null,
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
  }

  private async createSanitaryControlItems(
    sanitaryControlId: string,
    medicinesToProcess: Array<{
      itemId: string;
      quantity: number;
      calculatedDosage?: number;
    }>,
  ) {
    if (medicinesToProcess.length > 0) {
      await this.prisma.sanitaryControlItem.createMany({
        data: medicinesToProcess.map((medicine) => ({
          sanitaryControlId,
          itemId: medicine.itemId,
          quantity: medicine.quantity,
          calculatedDosage: medicine.calculatedDosage ?? null,
        })),
      });
    }
  }

  async findAll(userId: string) {
    const companyId = await this.getUserCompanyId(userId);

    const sanitaryControls = await this.prisma.sanitaryControl.findMany({
      where: {
        companyId,
        deletedAt: null,
      },
      include: {
        items: true,
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
    await this.findSanitaryControlByIdAndCompany(id, companyId);

    // Fetch with items relation
    const controlWithItems = await this.prisma.sanitaryControl.findUnique({
      where: { id },
      include: {
        items: true,
      },
    });

    return this.transformSanitaryControl(controlWithItems!);
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
      include: {
        items: true,
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

    if (updateDto.animalId) {
      await this.validateAnimalBelongsToCompany(updateDto.animalId, companyId);
    }

    const medicinesToProcess = this.extractMedicinesFromUpdateDto(updateDto);
    if (medicinesToProcess !== null) {
      await this.validateMedicines(medicinesToProcess, companyId);
    }

    await this.validateUpdateDtoRelations(updateDto, companyId);

    const updateData = this.buildUpdateData(updateDto);
    await this.prisma.sanitaryControl.update({
      where: { id },
      data: updateData,
    });

    if (medicinesToProcess !== null) {
      await this.updateSanitaryControlItems(id, medicinesToProcess);
    }

    const controlWithItems = await this.prisma.sanitaryControl.findUnique({
      where: { id },
      include: {
        items: true,
      },
    });

    return this.transformSanitaryControl(controlWithItems!);
  }

  private extractMedicinesFromUpdateDto(
    updateDto: UpdateSanitaryControlDto,
  ): Array<{
    itemId: string;
    quantity: number;
    calculatedDosage?: number;
  }> | null {
    if (updateDto.appliedMedicines !== undefined) {
      return updateDto.appliedMedicines.length > 0
        ? updateDto.appliedMedicines
        : [];
    }
    if (updateDto.itemId !== undefined) {
      return updateDto.itemId
        ? [
            {
              itemId: updateDto.itemId,
              quantity: updateDto.quantity ?? 0,
              ...(updateDto.calculatedDosage !== undefined && {
                calculatedDosage: updateDto.calculatedDosage,
              }),
            },
          ]
        : [];
    }
    return null;
  }

  private async validateUpdateDtoRelations(
    updateDto: UpdateSanitaryControlDto,
    companyId: string,
  ) {
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

  private async updateSanitaryControlItems(
    sanitaryControlId: string,
    medicinesToProcess: Array<{
      itemId: string;
      quantity: number;
      calculatedDosage?: number;
    }>,
  ) {
    await this.prisma.sanitaryControlItem.deleteMany({
      where: { sanitaryControlId },
    });

    if (medicinesToProcess.length > 0) {
      await this.prisma.sanitaryControlItem.createMany({
        data: medicinesToProcess.map((medicine) => ({
          sanitaryControlId,
          itemId: medicine.itemId,
          quantity: medicine.quantity,
          calculatedDosage: medicine.calculatedDosage ?? null,
        })),
      });
    }
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
      include: {
        items: true,
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

    this.setIfDefined(data, 'animalId', updateDto.animalId);
    this.setIfDefined(data, 'observation', updateDto.observation);

    if (updateDto.date !== undefined) {
      data.date = new Date(updateDto.date);
    }

    this.setLegacyMedicineFields(data, updateDto);

    if (updateDto.employeeIds !== undefined) {
      data.employeeIds = this.stringifyArrayIfNotEmpty(updateDto.employeeIds);
    }
    if (updateDto.serviceProviderIds !== undefined) {
      data.serviceProviderIds = this.stringifyArrayIfNotEmpty(
        updateDto.serviceProviderIds,
      );
    }

    return data;
  }

  private setLegacyMedicineFields(
    data: Record<string, unknown>,
    updateDto: UpdateSanitaryControlDto,
  ) {
    if (updateDto.appliedMedicines === undefined) {
      this.setIfDefined(data, 'itemId', updateDto.itemId);
      this.setIfDefined(data, 'quantity', updateDto.quantity);
      this.setIfDefined(data, 'calculatedDosage', updateDto.calculatedDosage);
    } else if (updateDto.appliedMedicines.length > 0) {
      const firstMedicine = updateDto.appliedMedicines[0];
      data.itemId = firstMedicine.itemId;
      data.quantity = firstMedicine.quantity;
      data.calculatedDosage = firstMedicine.calculatedDosage ?? null;
    } else {
      data.itemId = null;
      data.quantity = null;
      data.calculatedDosage = null;
    }
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

  private transformSanitaryControl(control: {
    id: string;
    animalId: string;
    date: Date;
    itemId: string | null;
    quantity: DecimalValue;
    calculatedDosage: DecimalValue;
    observation: string | null;
    companyId: string;
    employeeIds: Prisma.JsonValue;
    serviceProviderIds: Prisma.JsonValue;
    createdAt: Date;
    updatedAt: Date;
    items?: Array<{
      id: string;
      itemId: string;
      quantity: { toNumber(): number } | number;
      calculatedDosage: { toNumber(): number } | number | null;
    }>;
  }) {
    const appliedMedicines = this.buildAppliedMedicines(control);
    const legacyFields = this.extractLegacyFields(control);

    return {
      id: control.id,
      animalId: control.animalId,
      date: control.date,
      appliedMedicines,
      itemId: control.itemId,
      quantity: legacyFields.quantity,
      calculatedDosage: legacyFields.calculatedDosage,
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

  private buildAppliedMedicines(control: {
    items?: Array<{
      id: string;
      itemId: string;
      quantity: { toNumber(): number } | number;
      calculatedDosage: { toNumber(): number } | number | null;
    }>;
    itemId: string | null;
    quantity: DecimalValue;
    calculatedDosage: DecimalValue;
  }): Array<{ itemId: string; quantity: number; calculatedDosage?: number }> {
    if (control.items && control.items.length > 0) {
      return control.items.map((item) => ({
        itemId: item.itemId,
        quantity: this.toNumber(item.quantity),
        ...(item.calculatedDosage && {
          calculatedDosage: this.toNumber(item.calculatedDosage),
        }),
      }));
    }
    if (control.itemId && control.quantity != null) {
      const quantityValue = this.toNumber(control.quantity);
      return [
        {
          itemId: control.itemId,
          quantity: quantityValue,
          ...(control.calculatedDosage && {
            calculatedDosage: this.toNumber(control.calculatedDosage),
          }),
        },
      ];
    }
    return [];
  }

  private extractLegacyFields(control: {
    quantity: DecimalValue;
    calculatedDosage: DecimalValue;
  }): { quantity: number | undefined; calculatedDosage: number | undefined } {
    return {
      quantity: control.quantity ? this.toNumber(control.quantity) : undefined,
      calculatedDosage: control.calculatedDosage
        ? this.toNumber(control.calculatedDosage)
        : undefined,
    };
  }

  private toNumber(value: { toNumber(): number } | number): number {
    return typeof value === 'object' ? value.toNumber() : value;
  }
}
