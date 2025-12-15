import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../common/services/prisma.service';
import {
  CreateServiceProviderObservationDto,
  UpdateServiceProviderObservationDto,
  ServiceProviderObservationResponseDto,
} from './dto';
import { BaseObservationService } from '../common/observations/base-observation.service';

@Injectable()
export class ServiceProviderObservationsService extends BaseObservationService<
  CreateServiceProviderObservationDto,
  UpdateServiceProviderObservationDto,
  ServiceProviderObservationResponseDto
> {
  protected readonly observationModel = 'serviceProviderObservation' as const;
  protected readonly subjectIdField = 'serviceProviderId';

  constructor(protected override readonly prisma: PrismaService) {
    super(prisma);
  }

  async findAllByServiceProviderId(
    userId: string,
    serviceProviderId: string,
  ): Promise<ServiceProviderObservationResponseDto[]> {
    return this.findAllBySubjectId(userId, serviceProviderId);
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
    serviceProviderId: string,
    companyId: string,
  ): Promise<void> {
    const serviceProvider = await this.prisma.serviceProvider.findFirst({
      where: {
        id: serviceProviderId,
        companyId,
        deletedAt: null,
      },
      select: { id: true },
    });

    if (!serviceProvider) {
      throw new NotFoundException('Service provider not found');
    }
  }

  protected buildCreateData(
    userId: string,
    companyId: string,
    serviceProviderId: string,
    createDto: CreateServiceProviderObservationDto,
  ): any {
    return {
      serviceProviderId,
      observation: createDto.observation,
      fileIds: createDto.fileIds
        ? JSON.stringify(createDto.fileIds)
        : Prisma.JsonNull,
      companyId,
      createdBy: userId,
    };
  }

  protected buildUpdateData(
    updateDto: UpdateServiceProviderObservationDto,
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
    serviceProviderId: string;
    observation: string;
    fileIds: unknown;
    companyId: string;
    createdBy: string | null;
    createdAt: Date;
    updatedAt: Date;
  }): ServiceProviderObservationResponseDto {
    const result: ServiceProviderObservationResponseDto = {
      id: observation.id,
      serviceProviderId: observation.serviceProviderId,
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
