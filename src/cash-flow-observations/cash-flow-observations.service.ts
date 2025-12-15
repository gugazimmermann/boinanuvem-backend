/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call */
import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../common/services/prisma.service';
import {
  CreateCashFlowObservationDto,
  UpdateCashFlowObservationDto,
  CashFlowObservationResponseDto,
} from './dto';
import { BaseObservationService } from '../common/observations/base-observation.service';
import { buildObservationResponse } from '../common/observations/observation-transform.helper';

@Injectable()
export class CashFlowObservationsService extends BaseObservationService<
  CreateCashFlowObservationDto,
  UpdateCashFlowObservationDto,
  CashFlowObservationResponseDto
> {
  protected readonly observationModel = 'cashFlowObservation' as const;
  protected readonly subjectIdField = 'cashFlowId';

  constructor(protected override readonly prisma: PrismaService) {
    super(prisma);
  }

  async create(
    userId: string,
    cashFlowIdOrDto: string | CreateCashFlowObservationDto,
    maybeDto?: CreateCashFlowObservationDto,
  ): Promise<CashFlowObservationResponseDto> {
    let cashFlowId: string | undefined;
    let createDto: CreateCashFlowObservationDto | undefined;

    if (typeof cashFlowIdOrDto === 'string') {
      cashFlowId = cashFlowIdOrDto;
      createDto = maybeDto;
    } else {
      createDto = cashFlowIdOrDto;
      cashFlowId = cashFlowIdOrDto.cashFlowId;
    }

    if (!cashFlowId || !createDto) {
      throw new NotFoundException('Cash flow ID is required');
    }

    return super.create(userId, cashFlowId, createDto);
  }

  async findAll(userId: string): Promise<CashFlowObservationResponseDto[]> {
    const companyId = await this.getUserCompanyId(userId);

    const model = (this.prisma as any)[this.observationModel];

    const observations: {
      id: string;
      cashFlowId: string;
      observation: string;
      fileIds: unknown;
      companyId: string;
      createdBy: string | null;
      createdAt: Date;
      updatedAt: Date;
    }[] = await model.findMany({
      where: {
        companyId,
        deletedAt: null,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return observations.map((obs) => this.transformObservation(obs));
  }

  async findAllByCashFlowId(
    userId: string,
    cashFlowId: string,
  ): Promise<CashFlowObservationResponseDto[]> {
    return this.findAllBySubjectId(userId, cashFlowId);
  }

  protected async validateSubjectBelongsToCompany(
    cashFlowId: string,
    companyId: string,
  ): Promise<void> {
    await this.validateCashFlowBelongsToCompany(cashFlowId, companyId);
  }

  protected buildCreateData(
    userId: string,
    companyId: string,
    cashFlowId: string,
    createDto: CreateCashFlowObservationDto,
  ): any {
    return {
      cashFlowId,
      observation: createDto.observation,
      fileIds: createDto.fileIds
        ? JSON.stringify(createDto.fileIds)
        : Prisma.JsonNull,
      companyId,
      createdBy: userId,
    };
  }

  protected buildUpdateData(
    updateDto: UpdateCashFlowObservationDto,
  ): Record<string, unknown> {
    return super.buildUpdateData(updateDto);
  }

  protected transformObservation(observation: {
    id: string;
    cashFlowId: string;
    observation: string;
    fileIds: unknown;
    companyId: string;
    createdBy: string | null;
    createdAt: Date;
    updatedAt: Date;
  }): CashFlowObservationResponseDto {
    return buildObservationResponse<CashFlowObservationResponseDto>(
      observation,
      'cashFlowId',
    );
  }

  private async validateCashFlowBelongsToCompany(
    cashFlowId: string,
    companyId: string,
  ): Promise<void> {
    const cashFlow = await this.prisma.cashFlow.findFirst({
      where: {
        id: cashFlowId,
        companyId,
        deletedAt: null,
      },
      select: { id: true },
    });

    if (!cashFlow) {
      throw new NotFoundException('Cash flow not found');
    }
  }
}
