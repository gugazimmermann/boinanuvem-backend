import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../common/services/prisma.service';
import { CreateLocationDto, UpdateLocationDto } from './dto';
import type { InputJsonValue } from '@prisma/client/runtime/library';

@Injectable()
export class LocationsService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, createLocationDto: CreateLocationDto) {
    const companyId = await this.getUserCompanyId(userId);

    // Validate property exists and belongs to user's company
    await this.validatePropertyBelongsToCompany(
      createLocationDto.propertyId,
      companyId,
    );

    // Check if location code already exists for this company and property (excluding soft-deleted)
    const existingLocation = await this.prisma.location.findFirst({
      where: {
        companyId,
        propertyId: createLocationDto.propertyId,
        code: createLocationDto.code,
        deletedAt: null,
      },
    });

    if (existingLocation) {
      throw new ConflictException(
        'Location with this code already exists for this property',
      );
    }

    const location = await this.prisma.location.create({
      data: {
        code: createLocationDto.code,
        name: createLocationDto.name,
        locationType: createLocationDto.locationType,
        area: createLocationDto.area as unknown as InputJsonValue,
        status: createLocationDto.status,
        companyId,
        propertyId: createLocationDto.propertyId,
      },
    });

    return this.transformLocation(location);
  }

  async findAll(userId: string, propertyId?: string) {
    const companyId = await this.getUserCompanyId(userId);

    const where: {
      companyId: string;
      deletedAt: null;
      propertyId?: string;
    } = {
      companyId,
      deletedAt: null,
    };

    if (propertyId) {
      // Validate property belongs to company
      await this.validatePropertyBelongsToCompany(propertyId, companyId);
      where.propertyId = propertyId;
    }

    const locations = await this.prisma.location.findMany({
      where,
      orderBy: {
        createdAt: 'desc',
      },
    });

    return locations.map((location) => this.transformLocation(location));
  }

  async findOne(userId: string, id: string) {
    const companyId = await this.getUserCompanyId(userId);
    const location = await this.findLocationByIdAndCompany(id, companyId);
    return this.transformLocation(location);
  }

  async update(
    userId: string,
    id: string,
    updateLocationDto: UpdateLocationDto,
  ) {
    const companyId = await this.getUserCompanyId(userId);
    const existingLocation = await this.findLocationByIdAndCompany(
      id,
      companyId,
    );

    // If propertyId is being updated, validate it belongs to company
    if (updateLocationDto.propertyId) {
      await this.validatePropertyBelongsToCompany(
        updateLocationDto.propertyId,
        companyId,
      );
    }

    // If code is being updated, check for conflicts
    if (
      updateLocationDto.code &&
      updateLocationDto.code !== existingLocation.code
    ) {
      await this.validateCodeConflict(
        companyId,
        updateLocationDto.propertyId ?? existingLocation.propertyId,
        id,
        updateLocationDto.code,
        existingLocation.code,
      );
    }

    const updateData = this.buildUpdateData(updateLocationDto);
    const updatedLocation = await this.prisma.location.update({
      where: { id },
      data: updateData,
    });

    return this.transformLocation(updatedLocation);
  }

  async remove(userId: string, id: string) {
    const companyId = await this.getUserCompanyId(userId);
    await this.findLocationByIdAndCompany(id, companyId);

    // Soft delete by setting deletedAt timestamp
    await this.prisma.location.update({
      where: { id },
      data: {
        deletedAt: new Date(),
      },
    });

    return { message: 'Location deleted successfully' };
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

  private async findLocationByIdAndCompany(id: string, companyId: string) {
    const location = await this.prisma.location.findFirst({
      where: {
        id,
        companyId,
        deletedAt: null,
      },
    });

    if (!location) {
      throw new NotFoundException('Location not found');
    }

    return location;
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
    });

    if (!property) {
      throw new NotFoundException(
        'Property not found or does not belong to your company',
      );
    }
  }

  private async validateCodeConflict(
    companyId: string,
    propertyId: string,
    locationId: string,
    newCode: string,
    currentCode: string,
  ): Promise<void> {
    if (!newCode || newCode === currentCode) {
      return;
    }

    const codeConflict = await this.prisma.location.findFirst({
      where: {
        companyId,
        propertyId,
        code: newCode,
        deletedAt: null,
        NOT: { id: locationId },
      },
    });

    if (codeConflict) {
      throw new ConflictException(
        'Location with this code already exists for this property',
      );
    }
  }

  private buildUpdateData(updateLocationDto: UpdateLocationDto) {
    const data: Record<string, unknown> = {};

    this.addIfDefined(data, 'code', updateLocationDto.code);
    this.addIfDefined(data, 'name', updateLocationDto.name);
    this.addIfDefined(data, 'locationType', updateLocationDto.locationType);
    this.addIfDefined(data, 'status', updateLocationDto.status);
    this.addIfDefined(data, 'propertyId', updateLocationDto.propertyId);

    if (updateLocationDto.area) {
      data.area = updateLocationDto.area as unknown as InputJsonValue;
    }

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

  private transformLocation(location: {
    id: string;
    code: string;
    name: string;
    locationType: string;
    area: unknown;
    status: string;
    companyId: string;
    propertyId: string;
    createdAt: Date;
    updatedAt: Date;
  }) {
    return {
      id: location.id,
      code: location.code,
      name: location.name,
      locationType: location.locationType,
      area: location.area,
      status: location.status,
      companyId: location.companyId,
      propertyId: location.propertyId,
      createdAt: location.createdAt,
      updatedAt: location.updatedAt,
    };
  }
}
