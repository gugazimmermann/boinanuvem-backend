import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../common/services/prisma.service';
import {
  CreateLocationObservationDto,
  UpdateLocationObservationDto,
  LocationObservationResponseDto,
} from './dto';
import { BaseObservationService } from '../common/observations/base-observation.service';

@Injectable()
export class LocationObservationsService extends BaseObservationService<
  CreateLocationObservationDto,
  UpdateLocationObservationDto,
  LocationObservationResponseDto
> {
  protected readonly observationModel = 'locationObservation' as const;
  protected readonly subjectIdField = 'locationId';

  constructor(protected override readonly prisma: PrismaService) {
    super(prisma);
  }

  async findAllByLocationId(
    userId: string,
    locationId: string,
  ): Promise<LocationObservationResponseDto[]> {
    return this.findAllBySubjectId(userId, locationId);
  }

  protected async getUserCompanyId(userId: string): Promise<string> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { companyId: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user.companyId;
  }

  protected async validateSubjectBelongsToCompany(
    locationId: string,
    companyId: string,
  ): Promise<void> {
    const location = await this.prisma.location.findFirst({
      where: {
        id: locationId,
        companyId,
        deletedAt: null,
      },
      select: { id: true },
    });

    if (!location) {
      throw new NotFoundException('Location not found');
    }
  }

  protected buildCreateData(
    userId: string,
    companyId: string,
    locationId: string,
    createDto: CreateLocationObservationDto,
  ): any {
    return {
      locationId,
      observation: createDto.observation,
      fileIds: createDto.fileIds
        ? JSON.stringify(createDto.fileIds)
        : Prisma.JsonNull,
      companyId,
      createdBy: userId,
    };
  }

  protected buildUpdateData(
    updateDto: UpdateLocationObservationDto,
  ): Record<string, unknown> {
    const updateData: Record<string, unknown> = {};

    if (updateDto.observation !== undefined) {
      updateData.observation = updateDto.observation;
    }

    if (updateDto.fileIds !== undefined) {
      updateData.fileIds =
        updateDto.fileIds && updateDto.fileIds.length > 0
          ? JSON.stringify(updateDto.fileIds)
          : Prisma.JsonNull;
    }

    return updateData;
  }

  protected transformObservation(observation: {
    id: string;
    locationId: string;
    observation: string;
    fileIds: unknown;
    companyId: string;
    createdBy: string | null;
    createdAt: Date;
    updatedAt: Date;
  }): LocationObservationResponseDto {
    const result: LocationObservationResponseDto = {
      id: observation.id,
      locationId: observation.locationId,
      observation: observation.observation,
      companyId: observation.companyId,
      createdAt: observation.createdAt,
      updatedAt: observation.updatedAt,
    };

    if (observation.fileIds) {
      if (typeof observation.fileIds === 'string') {
        result.fileIds = JSON.parse(observation.fileIds) as string[];
      } else if (typeof observation.fileIds === 'object') {
        result.fileIds = observation.fileIds as string[];
      }
    }

    if (observation.createdBy) {
      result.createdBy = observation.createdBy;
    }

    return result;
  }
}
