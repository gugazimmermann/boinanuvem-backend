import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../common/services/prisma.service';
import type { InputJsonValue } from '@prisma/client/runtime/library';
import { Prisma } from '@prisma/client';
import { CreateWeighingDto, UpdateWeighingDto } from './dto';

@Injectable()
export class WeighingsService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, createWeighingDto: CreateWeighingDto) {
    const companyId = await this.getUserCompanyId(userId);

    // Validate animal belongs to company
    await this.validateAnimalBelongsToCompany(
      createWeighingDto.animalId,
      companyId,
    );

    // Validate employees belong to company
    if (createWeighingDto.employeeIds.length > 0) {
      await this.validateEmployeesBelongToCompany(
        createWeighingDto.employeeIds,
        companyId,
      );
    }

    // Validate service providers belong to company
    if (
      createWeighingDto.serviceProviderIds &&
      createWeighingDto.serviceProviderIds.length > 0
    ) {
      await this.validateServiceProvidersBelongToCompany(
        createWeighingDto.serviceProviderIds,
        companyId,
      );
    }

    const employeeIdsJson =
      createWeighingDto.employeeIds as unknown as InputJsonValue;
    const serviceProviderIdsJson = (createWeighingDto.serviceProviderIds ??
      []) as unknown as InputJsonValue;
    const appliedMedicinesJson = createWeighingDto.appliedMedicines
      ? (createWeighingDto.appliedMedicines as unknown as InputJsonValue)
      : Prisma.JsonNull;

    const weighing = await this.prisma.weighing.create({
      data: {
        animalId: createWeighingDto.animalId,
        weighingDate: new Date(createWeighingDto.date),
        weight: createWeighingDto.weight,
        employeeIds: employeeIdsJson,
        serviceProviderIds: serviceProviderIdsJson,
        appliedMedicines: appliedMedicinesJson,
        observation: createWeighingDto.observation ?? null,
        companyId,
      },
    });

    return this.transformWeighing(weighing);
  }

  async findAll(userId: string) {
    const companyId = await this.getUserCompanyId(userId);

    const weighings = await this.prisma.weighing.findMany({
      where: {
        companyId,
        deletedAt: null,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return weighings.map((weighing) => this.transformWeighing(weighing));
  }

  async findOne(userId: string, id: string) {
    const companyId = await this.getUserCompanyId(userId);
    const weighing = await this.findWeighingByIdAndCompany(id, companyId);
    return this.transformWeighing(weighing);
  }

  async findByAnimalId(userId: string, animalId: string) {
    const companyId = await this.getUserCompanyId(userId);

    // Validate animal belongs to company
    await this.validateAnimalBelongsToCompany(animalId, companyId);

    const weighings = await this.prisma.weighing.findMany({
      where: {
        animalId,
        companyId,
        deletedAt: null,
      },
      orderBy: {
        weighingDate: 'desc',
      },
    });

    return weighings.map((weighing) => this.transformWeighing(weighing));
  }

  async update(
    userId: string,
    id: string,
    updateWeighingDto: UpdateWeighingDto,
  ) {
    const companyId = await this.getUserCompanyId(userId);
    await this.findWeighingByIdAndCompany(id, companyId);

    // Validate employees if being updated
    if (updateWeighingDto.employeeIds) {
      await this.validateEmployeesBelongToCompany(
        updateWeighingDto.employeeIds,
        companyId,
      );
    }

    // Validate service providers if being updated
    if (
      updateWeighingDto.serviceProviderIds &&
      updateWeighingDto.serviceProviderIds.length > 0
    ) {
      await this.validateServiceProvidersBelongToCompany(
        updateWeighingDto.serviceProviderIds,
        companyId,
      );
    }

    const updateData: Record<string, unknown> = {};

    if (updateWeighingDto.date !== undefined) {
      updateData.weighingDate = new Date(updateWeighingDto.date);
    }

    this.addIfDefined(updateData, 'weight', updateWeighingDto.weight);
    this.addIfNotUndefined(
      updateData,
      'observation',
      updateWeighingDto.observation,
    );

    if (updateWeighingDto.employeeIds !== undefined) {
      updateData.employeeIds =
        updateWeighingDto.employeeIds as unknown as InputJsonValue;
    }

    if (updateWeighingDto.serviceProviderIds !== undefined) {
      updateData.serviceProviderIds = (updateWeighingDto.serviceProviderIds ||
        []) as unknown as InputJsonValue;
    }

    if (updateWeighingDto.appliedMedicines !== undefined) {
      updateData.appliedMedicines = updateWeighingDto.appliedMedicines
        ? (updateWeighingDto.appliedMedicines as unknown as InputJsonValue)
        : Prisma.JsonNull;
    }

    const updated = await this.prisma.weighing.update({
      where: { id },
      data: updateData,
    });

    return this.transformWeighing(updated);
  }

  async remove(userId: string, id: string) {
    const companyId = await this.getUserCompanyId(userId);
    await this.findWeighingByIdAndCompany(id, companyId);

    // Soft delete
    await this.prisma.weighing.update({
      where: { id },
      data: {
        deletedAt: new Date(),
      },
    });

    return { message: 'Weighing record deleted successfully' };
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

  private async findWeighingByIdAndCompany(id: string, companyId: string) {
    const weighing = await this.prisma.weighing.findFirst({
      where: {
        id,
        companyId,
        deletedAt: null,
      },
    });

    if (!weighing) {
      throw new NotFoundException('Weighing record not found');
    }

    return weighing;
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

  private async validateEmployeesBelongToCompany(
    employeeIds: string[],
    companyId: string,
  ): Promise<void> {
    if (employeeIds.length === 0) return;

    const employees = await this.prisma.employee.findMany({
      where: {
        id: {
          in: employeeIds,
        },
        companyId,
        deletedAt: null,
      },
      select: { id: true },
    });

    if (employees.length !== employeeIds.length) {
      throw new BadRequestException(
        'One or more employees not found or do not belong to your company',
      );
    }
  }

  private async validateServiceProvidersBelongToCompany(
    serviceProviderIds: string[],
    companyId: string,
  ): Promise<void> {
    if (serviceProviderIds.length === 0) return;

    const serviceProviders = await this.prisma.serviceProvider.findMany({
      where: {
        id: {
          in: serviceProviderIds,
        },
        companyId,
        deletedAt: null,
      },
      select: { id: true },
    });

    if (serviceProviders.length !== serviceProviderIds.length) {
      throw new BadRequestException(
        'One or more service providers not found or do not belong to your company',
      );
    }
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

  private transformWeighing(weighing: {
    id: string;
    animalId: string;
    weighingDate: Date;
    weight: { toNumber(): number } | number;
    employeeIds: unknown;
    serviceProviderIds: unknown;
    appliedMedicines: unknown;
    observation: string | null;
    companyId: string;
    createdAt: Date;
    updatedAt: Date;
  }) {
    const weightValue =
      typeof weighing.weight === 'object'
        ? weighing.weight.toNumber()
        : weighing.weight;

    return {
      id: weighing.id,
      animalId: weighing.animalId,
      weighingDate: weighing.weighingDate,
      weight: weightValue,
      employeeIds: weighing.employeeIds as string[],
      serviceProviderIds: (weighing.serviceProviderIds as string[]) || [],
      appliedMedicines: weighing.appliedMedicines as
        | Array<{
            itemId: string;
            quantity: number;
            calculatedDosage: number;
          }>
        | undefined,
      observation: weighing.observation ?? undefined,
      companyId: weighing.companyId,
      createdAt: weighing.createdAt,
      updatedAt: weighing.updatedAt,
    };
  }
}
