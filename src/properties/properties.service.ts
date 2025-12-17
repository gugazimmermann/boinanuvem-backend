import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../common/services/prisma.service';
import { CreatePropertyDto, UpdatePropertyDto } from './dto';
import type { InputJsonValue } from '@prisma/client/runtime/library';
import { Prisma } from '@prisma/client';
import { GeocodingService } from '../common/services/geocoding.service';
import { PasturePlanningService } from './services/pasture-planning.service';

@Injectable()
export class PropertiesService {
  constructor(
    private prisma: PrismaService,
    private geocoding: GeocodingService,
    private pasturePlanning: PasturePlanningService,
  ) {}

  async create(userId: string, createPropertyDto: CreatePropertyDto) {
    const companyId = await this.getUserCompanyId(userId);

    await this.assertPropertyCodeAvailable(companyId, createPropertyDto.code);

    const finalLatLng = await this.resolveLatLng(createPropertyDto);
    const computed = await this.getComputedPlanningIfNeeded(
      createPropertyDto,
      finalLatLng,
    );

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
        latitude: finalLatLng?.latitude ?? null,
        longitude: finalLatLng?.longitude ?? null,
        pasturePlanning: computed.pasturePlanning
          ? (computed.pasturePlanning as unknown as InputJsonValue)
          : Prisma.JsonNull,
        breedingMonths: computed.breedingMonths
          ? (computed.breedingMonths as unknown as InputJsonValue)
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
      updatePropertyDto.code !== undefined &&
      updatePropertyDto.code !== null &&
      updatePropertyDto.code !== '' &&
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

    // Code must not be empty string (MinLength(1) validation)
    if (
      updatePropertyDto.code !== undefined &&
      updatePropertyDto.code !== null &&
      updatePropertyDto.code !== ''
    ) {
      data.code = updatePropertyDto.code;
    }
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

  private async resolveLatLng(
    dto: CreatePropertyDto,
  ): Promise<{ latitude: number; longitude: number } | null> {
    if (dto.latitude != null && dto.longitude != null) {
      return { latitude: dto.latitude, longitude: dto.longitude };
    }

    try {
      return await this.geocoding.geocodeNominatim({
        street: dto.street,
        number: dto.number,
        neighborhood: dto.neighborhood,
        city: dto.city,
        state: dto.state,
        zipCode: dto.zipCode,
      });
    } catch {
      return null;
    }
  }

  private async assertPropertyCodeAvailable(companyId: string, code: string) {
    const existingProperty = await this.prisma.property.findFirst({
      where: {
        companyId,
        code,
        deletedAt: null,
      },
    });

    if (existingProperty) {
      throw new ConflictException(
        'Property with this code already exists for your company',
      );
    }
  }

  private shouldComputePasturePlanning(dto: CreatePropertyDto): boolean {
    return !dto.pasturePlanning && !dto.pasturePlanningModifiedByUser;
  }

  private shouldComputeBreedingMonths(dto: CreatePropertyDto): boolean {
    return !dto.breedingMonths && !dto.breedingSeasonModifiedByUser;
  }

  private async getComputedPlanningIfNeeded(
    dto: CreatePropertyDto,
    latLng: { latitude: number; longitude: number } | null,
  ): Promise<{
    pasturePlanning: CreatePropertyDto['pasturePlanning'];
    breedingMonths: CreatePropertyDto['breedingMonths'];
  }> {
    const shouldPasture = this.shouldComputePasturePlanning(dto);
    const shouldBreeding = this.shouldComputeBreedingMonths(dto);

    const pasturePlanning = dto.pasturePlanning;
    const breedingMonths = dto.breedingMonths;

    if (!shouldPasture && !shouldBreeding) {
      return { pasturePlanning, breedingMonths };
    }

    const defaults = {
      pasturePlanning: shouldPasture ? [] : pasturePlanning,
      breedingMonths: shouldBreeding ? [] : breedingMonths,
    };

    if (!latLng) {
      return defaults;
    }

    try {
      const computed = await this.pasturePlanning.computeFromLatLng({
        latitude: latLng.latitude,
        longitude: latLng.longitude,
      });

      return {
        pasturePlanning: shouldPasture
          ? computed.pasturePlanning
          : pasturePlanning,
        breedingMonths: shouldBreeding
          ? computed.breedingMonths
          : breedingMonths,
      };
    } catch {
      // If external calls fail, we still create the property and store empty defaults.
      return defaults;
    }
  }
}
