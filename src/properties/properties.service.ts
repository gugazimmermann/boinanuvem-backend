import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../common/services/prisma.service';
import { CreatePropertyDto, UpdatePropertyDto } from './dto';
import type { InputJsonValue } from '@prisma/client/runtime/library';
import { Prisma } from '@prisma/client';

@Injectable()
export class PropertiesService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, createPropertyDto: CreatePropertyDto) {
    const companyId = await this.getUserCompanyId(userId);

    // Check if property code already exists for this company (excluding soft-deleted)
    const existingProperty = await this.prisma.property.findFirst({
      where: {
        companyId,
        code: createPropertyDto.code,
        deletedAt: null,
      },
    });

    if (existingProperty) {
      throw new ConflictException(
        'Property with this code already exists for your company',
      );
    }

    const property = await this.prisma.property.create({
      data: {
        code: createPropertyDto.code,
        name: createPropertyDto.name,
        area: createPropertyDto.area as unknown as InputJsonValue,
        status: createPropertyDto.status,
        companyId,
        street: createPropertyDto.street,
        number: createPropertyDto.number,
        complement: createPropertyDto.complement ?? null,
        neighborhood: createPropertyDto.neighborhood,
        city: createPropertyDto.city,
        state: createPropertyDto.state,
        zipCode: createPropertyDto.zipCode,
        latitude: createPropertyDto.latitude ?? null,
        longitude: createPropertyDto.longitude ?? null,
        pasturePlanning: createPropertyDto.pasturePlanning
          ? (createPropertyDto.pasturePlanning as unknown as InputJsonValue)
          : Prisma.JsonNull,
        breedingMonths: createPropertyDto.breedingMonths
          ? (createPropertyDto.breedingMonths as unknown as InputJsonValue)
          : Prisma.JsonNull,
        pasturePlanningModifiedByUser:
          createPropertyDto.pasturePlanningModifiedByUser ?? false,
        breedingSeasonModifiedByUser:
          createPropertyDto.breedingSeasonModifiedByUser ?? false,
      },
    });

    return this.transformProperty(property);
  }

  async findAll(userId: string) {
    const companyId = await this.getUserCompanyId(userId);

    const properties = await this.prisma.property.findMany({
      where: {
        companyId,
        deletedAt: null,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return properties.map(
      (property: {
        id: string;
        code: string;
        name: string;
        area: unknown;
        status: string;
        companyId: string;
        street: string;
        number: string;
        complement: string | null;
        neighborhood: string;
        city: string;
        state: string;
        zipCode: string;
        latitude: number | null;
        longitude: number | null;
        pasturePlanning: unknown;
        breedingMonths: unknown;
        pasturePlanningModifiedByUser: boolean;
        breedingSeasonModifiedByUser: boolean;
        createdAt: Date;
        updatedAt: Date;
      }) => this.transformProperty(property),
    );
  }

  async findOne(userId: string, id: string) {
    const companyId = await this.getUserCompanyId(userId);
    const property = await this.findPropertyByIdAndCompany(id, companyId);
    return this.transformProperty(property);
  }

  async update(
    userId: string,
    id: string,
    updatePropertyDto: UpdatePropertyDto,
  ) {
    const companyId = await this.getUserCompanyId(userId);
    const existingProperty = await this.findPropertyByIdAndCompany(
      id,
      companyId,
    );

    // If code is being updated, check for conflicts
    if (
      updatePropertyDto.code &&
      updatePropertyDto.code !== existingProperty.code
    ) {
      await this.validateCodeConflict(
        companyId,
        id,
        updatePropertyDto.code,
        existingProperty.code,
      );
    }

    const updateData = this.buildUpdateData(updatePropertyDto);
    const updatedProperty = await this.prisma.property.update({
      where: { id },
      data: updateData,
    });

    return this.transformProperty(updatedProperty);
  }

  async remove(userId: string, id: string) {
    const companyId = await this.getUserCompanyId(userId);
    await this.findPropertyByIdAndCompany(id, companyId);

    // Soft delete by setting deletedAt timestamp
    // Junction table records will be cascade deleted
    await this.prisma.property.update({
      where: { id },
      data: {
        deletedAt: new Date(),
      },
    });

    return { message: 'Property deleted successfully' };
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

  private async findPropertyByIdAndCompany(id: string, companyId: string) {
    const property = await this.prisma.property.findFirst({
      where: {
        id,
        companyId,
        deletedAt: null,
      },
    });

    if (!property) {
      throw new NotFoundException('Property not found');
    }

    return property;
  }

  private async validateCodeConflict(
    companyId: string,
    propertyId: string,
    newCode: string | undefined,
    currentCode: string,
  ): Promise<void> {
    if (!newCode || newCode === currentCode) {
      return;
    }

    const codeConflict = await this.prisma.property.findFirst({
      where: {
        companyId,
        code: newCode,
        deletedAt: null,
        NOT: { id: propertyId },
      },
    });

    if (codeConflict) {
      throw new ConflictException(
        'Property with this code already exists for your company',
      );
    }
  }

  private buildUpdateData(updatePropertyDto: UpdatePropertyDto) {
    const data: Record<string, unknown> = {};

    this.addIfDefined(data, 'code', updatePropertyDto.code);
    this.addIfDefined(data, 'name', updatePropertyDto.name);
    this.addIfDefined(data, 'status', updatePropertyDto.status);
    this.addIfDefined(data, 'street', updatePropertyDto.street);
    this.addIfDefined(data, 'number', updatePropertyDto.number);
    this.addIfDefined(data, 'neighborhood', updatePropertyDto.neighborhood);
    this.addIfDefined(data, 'city', updatePropertyDto.city);
    this.addIfDefined(data, 'state', updatePropertyDto.state);
    this.addIfDefined(data, 'zipCode', updatePropertyDto.zipCode);

    if (updatePropertyDto.area) {
      data.area = updatePropertyDto.area as unknown as InputJsonValue;
    }

    this.addIfNotUndefined(data, 'complement', updatePropertyDto.complement);
    this.addIfNotUndefined(data, 'latitude', updatePropertyDto.latitude);
    this.addIfNotUndefined(data, 'longitude', updatePropertyDto.longitude);
    this.addIfNotUndefined(
      data,
      'pasturePlanningModifiedByUser',
      updatePropertyDto.pasturePlanningModifiedByUser,
    );
    this.addIfNotUndefined(
      data,
      'breedingSeasonModifiedByUser',
      updatePropertyDto.breedingSeasonModifiedByUser,
    );

    this.addJsonField(
      data,
      'pasturePlanning',
      updatePropertyDto.pasturePlanning,
    );
    this.addJsonField(data, 'breedingMonths', updatePropertyDto.breedingMonths);

    return data;
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
      data[key] = value;
    }
  }

  private addJsonField(
    data: Record<string, unknown>,
    key: string,
    value: unknown,
  ): void {
    if (value !== undefined) {
      data[key] = value
        ? (value as unknown as InputJsonValue)
        : Prisma.JsonNull;
    }
  }

  private transformProperty(property: {
    id: string;
    code: string;
    name: string;
    area: unknown;
    status: string;
    companyId: string;
    street: string;
    number: string;
    complement: string | null;
    neighborhood: string;
    city: string;
    state: string;
    zipCode: string;
    latitude: number | null;
    longitude: number | null;
    pasturePlanning: unknown;
    breedingMonths: unknown;
    pasturePlanningModifiedByUser: boolean;
    breedingSeasonModifiedByUser: boolean;
    createdAt: Date;
    updatedAt: Date;
  }) {
    return {
      id: property.id,
      code: property.code,
      name: property.name,
      area: property.area,
      status: property.status,
      companyId: property.companyId,
      street: property.street,
      number: property.number,
      complement: property.complement,
      neighborhood: property.neighborhood,
      city: property.city,
      state: property.state,
      zipCode: property.zipCode,
      latitude: property.latitude,
      longitude: property.longitude,
      pasturePlanning: property.pasturePlanning,
      breedingMonths: property.breedingMonths,
      pasturePlanningModifiedByUser: property.pasturePlanningModifiedByUser,
      breedingSeasonModifiedByUser: property.breedingSeasonModifiedByUser,
      createdAt: property.createdAt,
      updatedAt: property.updatedAt,
    };
  }
}
