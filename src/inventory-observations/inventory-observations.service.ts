import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../common/services/prisma.service';
import {
  CreateInventoryObservationDto,
  UpdateInventoryObservationDto,
  InventoryObservationResponseDto,
} from './dto';
import { BaseObservationService } from '../common/observations/base-observation.service';

@Injectable()
export class InventoryObservationsService extends BaseObservationService<
  CreateInventoryObservationDto,
  UpdateInventoryObservationDto,
  InventoryObservationResponseDto
> {
  protected readonly observationModel = 'inventoryObservation' as const;
  protected readonly subjectIdField = 'itemId';

  constructor(protected override readonly prisma: PrismaService) {
    super(prisma);
  }

  async findAllByItemId(
    userId: string,
    itemId: string,
  ): Promise<InventoryObservationResponseDto[]> {
    return this.findAllBySubjectId(userId, itemId);
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
    itemId: string,
    companyId: string,
  ): Promise<void> {
    const item = await this.prisma.inventoryItem.findFirst({
      where: {
        id: itemId,
        companyId,
        deletedAt: null,
      },
      select: { id: true },
    });

    if (!item) {
      throw new NotFoundException('Inventory item not found');
    }
  }

  protected buildCreateData(
    userId: string,
    companyId: string,
    itemId: string,
    createDto: CreateInventoryObservationDto,
  ): any {
    return {
      itemId,
      observation: createDto.observation,
      fileIds: createDto.fileIds
        ? JSON.stringify(createDto.fileIds)
        : Prisma.JsonNull,
      companyId,
      createdBy: userId,
    };
  }

  protected buildUpdateData(
    updateDto: UpdateInventoryObservationDto,
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
    itemId: string;
    observation: string;
    fileIds: unknown;
    companyId: string;
    createdBy: string | null;
    createdAt: Date;
    updatedAt: Date;
  }): InventoryObservationResponseDto {
    const result: InventoryObservationResponseDto = {
      id: observation.id,
      itemId: observation.itemId,
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
