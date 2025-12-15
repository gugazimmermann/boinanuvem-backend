import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../common/services/prisma.service';
import {
  CreateSupplierObservationDto,
  UpdateSupplierObservationDto,
  SupplierObservationResponseDto,
} from './dto';
import { BaseObservationService } from '../common/observations/base-observation.service';

@Injectable()
export class SupplierObservationsService extends BaseObservationService<
  CreateSupplierObservationDto,
  UpdateSupplierObservationDto,
  SupplierObservationResponseDto
> {
  protected readonly observationModel = 'supplierObservation' as const;
  protected readonly subjectIdField = 'supplierId';

  constructor(protected override readonly prisma: PrismaService) {
    super(prisma);
  }

  async findAllBySupplierId(
    userId: string,
    supplierId: string,
  ): Promise<SupplierObservationResponseDto[]> {
    return this.findAllBySubjectId(userId, supplierId);
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
    supplierId: string,
    companyId: string,
  ): Promise<void> {
    const supplier = await this.prisma.supplier.findFirst({
      where: {
        id: supplierId,
        companyId,
        deletedAt: null,
      },
      select: { id: true },
    });

    if (!supplier) {
      throw new NotFoundException('Supplier not found');
    }
  }

  protected buildCreateData(
    userId: string,
    companyId: string,
    supplierId: string,
    createDto: CreateSupplierObservationDto,
  ): any {
    return {
      supplierId,
      observation: createDto.observation,
      fileIds: createDto.fileIds
        ? JSON.stringify(createDto.fileIds)
        : Prisma.JsonNull,
      companyId,
      createdBy: userId,
    };
  }

  protected buildUpdateData(
    updateDto: UpdateSupplierObservationDto,
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
    supplierId: string;
    observation: string;
    fileIds: unknown;
    companyId: string;
    createdBy: string | null;
    createdAt: Date;
    updatedAt: Date;
  }): SupplierObservationResponseDto {
    const result: SupplierObservationResponseDto = {
      id: observation.id,
      supplierId: observation.supplierId,
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
