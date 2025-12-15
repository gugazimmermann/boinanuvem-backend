import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../common/services/prisma.service';
import { CompanyEntitiesValidationService } from '../common/services/company-entities-validation.service';
import {
  CreateLocationMovementDto,
  UpdateLocationMovementDto,
  LocationMovementResponseDto,
  LocationMovementType,
} from './dto';

@Injectable()
export class LocationMovementsService {
  constructor(
    private prisma: PrismaService,
    private companyEntitiesValidation: CompanyEntitiesValidationService,
  ) {}

  async create(
    userId: string,
    createDto: CreateLocationMovementDto,
  ): Promise<LocationMovementResponseDto> {
    const companyId =
      await this.companyEntitiesValidation.getUserCompanyId(userId);

    await this.companyEntitiesValidation.validatePropertyBelongsToCompany(
      createDto.propertyId,
      companyId,
    );

    if (createDto.locationIds && createDto.locationIds.length > 0) {
      await this.validateLocationsBelongToCompanyAndProperty(
        createDto.locationIds,
        createDto.propertyId,
        companyId,
      );
    }

    if (createDto.employeeIds && createDto.employeeIds.length > 0) {
      await this.companyEntitiesValidation.validateEmployeesBelongToCompany(
        createDto.employeeIds,
        companyId,
      );
    }

    if (
      createDto.serviceProviderIds &&
      createDto.serviceProviderIds.length > 0
    ) {
      await this.companyEntitiesValidation.validateServiceProvidersBelongToCompany(
        createDto.serviceProviderIds,
        companyId,
      );
    }

    const movement = await this.prisma.locationMovement.create({
      data: {
        companyId,
        propertyId: createDto.propertyId,
        // Store arrays as JSON arrays (not stringified)
        locationIds: createDto.locationIds,
        employeeIds: createDto.employeeIds ?? Prisma.JsonNull,
        serviceProviderIds: createDto.serviceProviderIds ?? Prisma.JsonNull,
        type: createDto.type,
        date: new Date(createDto.date),
        observation: createDto.observation ?? null,
        fileIds: createDto.fileIds ?? Prisma.JsonNull,
      },
    });

    return this.transformLocationMovement(movement);
  }

  async findAllForCompany(
    userId: string,
  ): Promise<LocationMovementResponseDto[]> {
    const companyId =
      await this.companyEntitiesValidation.getUserCompanyId(userId);

    const movements = await this.prisma.locationMovement.findMany({
      where: {
        companyId,
        deletedAt: null,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return movements.map((m) => this.transformLocationMovement(m));
  }

  async findOne(
    userId: string,
    id: string,
  ): Promise<LocationMovementResponseDto> {
    const companyId =
      await this.companyEntitiesValidation.getUserCompanyId(userId);

    const movement = await this.prisma.locationMovement.findFirst({
      where: {
        id,
        companyId,
        deletedAt: null,
      },
    });

    if (!movement) {
      throw new NotFoundException('Location movement not found');
    }

    return this.transformLocationMovement(movement);
  }

  async findByLocationId(
    userId: string,
    locationId: string,
  ): Promise<LocationMovementResponseDto[]> {
    const companyId =
      await this.companyEntitiesValidation.getUserCompanyId(userId);
    await this.companyEntitiesValidation.validateLocationBelongsToCompany(
      locationId,
      companyId,
    );

    const movements = await this.prisma.locationMovement.findMany({
      where: {
        companyId,
        deletedAt: null,
        locationIds: {
          array_contains: [locationId],
        },
      },
      orderBy: {
        date: 'desc',
      },
    });

    return movements.map((m) => this.transformLocationMovement(m));
  }

  async findByPropertyId(
    userId: string,
    propertyId: string,
  ): Promise<LocationMovementResponseDto[]> {
    const companyId =
      await this.companyEntitiesValidation.getUserCompanyId(userId);
    await this.companyEntitiesValidation.validatePropertyBelongsToCompany(
      propertyId,
      companyId,
    );

    const movements = await this.prisma.locationMovement.findMany({
      where: {
        companyId,
        deletedAt: null,
        propertyId,
      },
      orderBy: {
        date: 'desc',
      },
    });

    return movements.map((m) => this.transformLocationMovement(m));
  }

  async findByEmployeeId(
    userId: string,
    employeeId: string,
  ): Promise<LocationMovementResponseDto[]> {
    const companyId =
      await this.companyEntitiesValidation.getUserCompanyId(userId);
    await this.companyEntitiesValidation.validateEmployeeBelongsToCompany(
      employeeId,
      companyId,
    );

    const movements = await this.prisma.locationMovement.findMany({
      where: {
        companyId,
        deletedAt: null,
        employeeIds: {
          array_contains: [employeeId],
        },
      },
      orderBy: {
        date: 'desc',
      },
    });

    return movements.map((m) => this.transformLocationMovement(m));
  }

  async findByServiceProviderId(
    userId: string,
    serviceProviderId: string,
  ): Promise<LocationMovementResponseDto[]> {
    const companyId =
      await this.companyEntitiesValidation.getUserCompanyId(userId);
    await this.companyEntitiesValidation.validateServiceProviderBelongsToCompany(
      serviceProviderId,
      companyId,
    );

    const movements = await this.prisma.locationMovement.findMany({
      where: {
        companyId,
        deletedAt: null,
        serviceProviderIds: {
          array_contains: [serviceProviderId],
        },
      },
      orderBy: {
        date: 'desc',
      },
    });

    return movements.map((m) => this.transformLocationMovement(m));
  }

  async findByType(
    userId: string,
    type: LocationMovementType,
  ): Promise<LocationMovementResponseDto[]> {
    const companyId =
      await this.companyEntitiesValidation.getUserCompanyId(userId);

    const movements = await this.prisma.locationMovement.findMany({
      where: {
        companyId,
        deletedAt: null,
        type,
      },
      orderBy: {
        date: 'desc',
      },
    });

    return movements.map((m) => this.transformLocationMovement(m));
  }

  async update(
    userId: string,
    id: string,
    updateDto: UpdateLocationMovementDto,
  ): Promise<LocationMovementResponseDto> {
    const companyId =
      await this.companyEntitiesValidation.getUserCompanyId(userId);
    await this.findLocationMovementByIdAndCompany(id, companyId);

    await this.validateUpdateDto(updateDto, id, companyId);

    const updateData = this.buildUpdateData(updateDto);
    const updated = await this.prisma.locationMovement.update({
      where: { id },
      data: updateData,
    });

    return this.transformLocationMovement(updated);
  }

  async remove(userId: string, id: string): Promise<void> {
    const companyId =
      await this.companyEntitiesValidation.getUserCompanyId(userId);
    await this.findLocationMovementByIdAndCompany(id, companyId);

    await this.prisma.locationMovement.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  private transformLocationMovement(movement: {
    id: string;
    companyId: string;
    propertyId: string;
    locationIds: Prisma.JsonValue;
    employeeIds: Prisma.JsonValue;
    serviceProviderIds: Prisma.JsonValue;
    type: string;
    date: Date;
    observation: string | null;
    fileIds: Prisma.JsonValue;
    createdAt: Date;
    updatedAt: Date;
  }): LocationMovementResponseDto {
    return {
      id: movement.id,
      companyId: movement.companyId,
      propertyId: movement.propertyId,
      locationIds: Array.isArray(movement.locationIds)
        ? (movement.locationIds as string[])
        : [],
      employeeIds: Array.isArray(movement.employeeIds)
        ? (movement.employeeIds as string[])
        : [],
      serviceProviderIds: Array.isArray(movement.serviceProviderIds)
        ? (movement.serviceProviderIds as string[])
        : [],
      type: movement.type as LocationMovementType,
      date: movement.date.toISOString(),
      observation: movement.observation,
      fileIds: Array.isArray(movement.fileIds)
        ? (movement.fileIds as string[])
        : [],
      createdAt: movement.createdAt.toISOString(),
      updatedAt: movement.updatedAt.toISOString(),
    };
  }

  private async findLocationMovementByIdAndCompany(
    id: string,
    companyId: string,
  ) {
    const movement = await this.prisma.locationMovement.findFirst({
      where: {
        id,
        companyId,
        deletedAt: null,
      },
    });

    if (!movement) {
      throw new NotFoundException('Location movement not found');
    }

    return movement;
  }

  private async validateLocationsBelongToCompanyAndProperty(
    locationIds: string[],
    propertyId: string,
    companyId: string,
  ): Promise<void> {
    const locations = await this.prisma.location.findMany({
      where: {
        id: { in: locationIds },
        propertyId,
        companyId,
        deletedAt: null,
      },
      select: { id: true },
    });

    if (locations.length !== locationIds.length) {
      throw new NotFoundException(
        'One or more locations not found, do not belong to your company, or do not belong to the specified property',
      );
    }
  }

  private async validateUpdateDto(
    updateDto: UpdateLocationMovementDto,
    movementId: string,
    companyId: string,
  ) {
    if (updateDto.propertyId) {
      await this.companyEntitiesValidation.validatePropertyBelongsToCompany(
        updateDto.propertyId,
        companyId,
      );
    }

    if (
      updateDto.locationIds !== undefined &&
      updateDto.locationIds.length > 0
    ) {
      const propertyId =
        updateDto.propertyId ?? (await this.getMovementPropertyId(movementId));
      if (!propertyId) {
        throw new NotFoundException(
          'Property ID is required when updating locations',
        );
      }
      await this.validateLocationsBelongToCompanyAndProperty(
        updateDto.locationIds,
        propertyId,
        companyId,
      );
    }

    if (
      updateDto.employeeIds !== undefined &&
      updateDto.employeeIds.length > 0
    ) {
      await this.companyEntitiesValidation.validateEmployeesBelongToCompany(
        updateDto.employeeIds,
        companyId,
      );
    }

    if (
      updateDto.serviceProviderIds !== undefined &&
      updateDto.serviceProviderIds.length > 0
    ) {
      await this.companyEntitiesValidation.validateServiceProvidersBelongToCompany(
        updateDto.serviceProviderIds,
        companyId,
      );
    }
  }

  private async getMovementPropertyId(
    movementId: string,
  ): Promise<string | null> {
    const movement = await this.prisma.locationMovement.findUnique({
      where: { id: movementId },
      select: { propertyId: true },
    });
    return movement?.propertyId ?? null;
  }

  private buildUpdateData(
    updateDto: UpdateLocationMovementDto,
  ): Record<string, unknown> {
    const data: Record<string, unknown> = {};

    this.setIfDefined(data, 'propertyId', updateDto.propertyId);
    this.setIfDefined(data, 'type', updateDto.type);
    this.setIfDefined(data, 'observation', updateDto.observation);

    if (updateDto.date !== undefined) {
      data.date = new Date(updateDto.date);
    }

    this.setJsonArrayField(data, 'locationIds', updateDto.locationIds);
    this.setJsonArrayField(data, 'employeeIds', updateDto.employeeIds);
    this.setJsonArrayField(
      data,
      'serviceProviderIds',
      updateDto.serviceProviderIds,
    );
    this.setJsonArrayField(data, 'fileIds', updateDto.fileIds);

    return data;
  }

  private setIfDefined(
    data: Record<string, unknown>,
    key: string,
    value: unknown,
  ): void {
    if (value !== undefined) {
      data[key] = value;
    }
  }

  private setJsonArrayField(
    data: Record<string, unknown>,
    key: string,
    values: string[] | undefined,
  ): void {
    if (values === undefined) {
      return;
    }

    data[key] = values.length > 0 ? JSON.stringify(values) : Prisma.JsonNull;
  }
}
