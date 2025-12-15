/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call */
import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../common/services/prisma.service';
import {
  CreateAccountsReceivableObservationDto,
  UpdateAccountsReceivableObservationDto,
  AccountsReceivableObservationResponseDto,
} from './dto';
import { BaseObservationService } from '../common/observations/base-observation.service';
import { buildObservationResponse } from '../common/observations/observation-transform.helper';

@Injectable()
export class AccountsReceivableObservationsService extends BaseObservationService<
  CreateAccountsReceivableObservationDto,
  UpdateAccountsReceivableObservationDto,
  AccountsReceivableObservationResponseDto
> {
  protected readonly observationModel =
    'accountsReceivableObservation' as const;
  protected readonly subjectIdField = 'accountsReceivableId';

  constructor(protected override readonly prisma: PrismaService) {
    super(prisma);
  }

  async create(
    userId: string,
    accountsReceivableIdOrDto: string | CreateAccountsReceivableObservationDto,
    maybeDto?: CreateAccountsReceivableObservationDto,
  ): Promise<AccountsReceivableObservationResponseDto> {
    let accountsReceivableId: string | undefined;
    let createDto: CreateAccountsReceivableObservationDto | undefined;

    if (typeof accountsReceivableIdOrDto === 'string') {
      accountsReceivableId = accountsReceivableIdOrDto;
      createDto = maybeDto;
    } else {
      createDto = accountsReceivableIdOrDto;
      accountsReceivableId = accountsReceivableIdOrDto.accountsReceivableId;
    }

    if (!accountsReceivableId || !createDto) {
      throw new NotFoundException('Accounts receivable ID is required');
    }

    return super.create(userId, accountsReceivableId, createDto);
  }

  async findAll(
    userId: string,
  ): Promise<AccountsReceivableObservationResponseDto[]> {
    const companyId = await this.getUserCompanyId(userId);

    const model = (this.prisma as any)[this.observationModel];

    const observations: {
      id: string;
      accountsReceivableId: string;
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

  async findAllByAccountsReceivableId(
    userId: string,
    accountsReceivableId: string,
  ): Promise<AccountsReceivableObservationResponseDto[]> {
    return this.findAllBySubjectId(userId, accountsReceivableId);
  }

  protected async validateSubjectBelongsToCompany(
    accountsReceivableId: string,
    companyId: string,
  ): Promise<void> {
    await this.validateAccountsReceivableBelongsToCompany(
      accountsReceivableId,
      companyId,
    );
  }

  protected buildCreateData(
    userId: string,
    companyId: string,
    accountsReceivableId: string,
    createDto: CreateAccountsReceivableObservationDto,
  ): any {
    return {
      accountsReceivableId,
      observation: createDto.observation,
      fileIds: createDto.fileIds
        ? JSON.stringify(createDto.fileIds)
        : Prisma.JsonNull,
      companyId,
      createdBy: userId,
    };
  }

  protected buildUpdateData(
    updateDto: UpdateAccountsReceivableObservationDto,
  ): Record<string, unknown> {
    return super.buildUpdateData(updateDto);
  }

  protected transformObservation(observation: {
    id: string;
    accountsReceivableId: string;
    observation: string;
    fileIds: unknown;
    companyId: string;
    createdBy: string | null;
    createdAt: Date;
    updatedAt: Date;
  }): AccountsReceivableObservationResponseDto {
    return buildObservationResponse<AccountsReceivableObservationResponseDto>(
      observation,
      'accountsReceivableId',
    );
  }

  private async validateAccountsReceivableBelongsToCompany(
    accountsReceivableId: string,
    companyId: string,
  ): Promise<void> {
    const accountsReceivable = await this.prisma.accountsReceivable.findFirst({
      where: {
        id: accountsReceivableId,
        companyId,
        deletedAt: null,
      },
      select: { id: true },
    });

    if (!accountsReceivable) {
      throw new NotFoundException('Accounts receivable not found');
    }
  }
}
