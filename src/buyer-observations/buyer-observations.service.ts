import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../common/services/prisma.service';
import {
  CreateBuyerObservationDto,
  UpdateBuyerObservationDto,
  BuyerObservationResponseDto,
} from './dto';
import { BaseObservationService } from '../common/observations/base-observation.service';

@Injectable()
export class BuyerObservationsService extends BaseObservationService<
  CreateBuyerObservationDto,
  UpdateBuyerObservationDto,
  BuyerObservationResponseDto
> {
  protected readonly observationModel = 'buyerObservation' as const;
  protected readonly subjectIdField = 'buyerId';

  constructor(protected override readonly prisma: PrismaService) {
    super(prisma);
  }

  async findAllByBuyerId(
    userId: string,
    buyerId: string,
  ): Promise<BuyerObservationResponseDto[]> {
    return this.findAllBySubjectId(userId, buyerId);
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
    buyerId: string,
    companyId: string,
  ): Promise<void> {
    const buyer = await this.prisma.buyer.findFirst({
      where: {
        id: buyerId,
        companyId,
        deletedAt: null,
      },
      select: { id: true },
    });

    if (!buyer) {
      throw new NotFoundException('Buyer not found');
    }
  }

  protected buildCreateData(
    userId: string,
    companyId: string,
    buyerId: string,
    createDto: CreateBuyerObservationDto,
  ): any {
    return {
      buyerId,
      observation: createDto.observation,
      fileIds: createDto.fileIds
        ? JSON.stringify(createDto.fileIds)
        : Prisma.JsonNull,
      companyId,
      createdBy: userId,
    };
  }

  protected buildUpdateData(
    updateDto: UpdateBuyerObservationDto,
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
    buyerId: string;
    observation: string;
    fileIds: unknown;
    companyId: string;
    createdBy: string | null;
    createdAt: Date;
    updatedAt: Date;
  }): BuyerObservationResponseDto {
    const result: BuyerObservationResponseDto = {
      id: observation.id,
      buyerId: observation.buyerId,
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
