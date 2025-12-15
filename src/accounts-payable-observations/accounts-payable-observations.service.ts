/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call */
import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../common/services/prisma.service';
import {
  CreateAccountsPayableObservationDto,
  UpdateAccountsPayableObservationDto,
  AccountsPayableObservationResponseDto,
} from './dto';
import { BaseObservationService } from '../common/observations/base-observation.service';
import { buildObservationResponse } from '../common/observations/observation-transform.helper';

@Injectable()
export class AccountsPayableObservationsService extends BaseObservationService<
  CreateAccountsPayableObservationDto,
  UpdateAccountsPayableObservationDto,
  AccountsPayableObservationResponseDto
> {
  protected readonly observationModel = 'accountsPayableObservation' as const;
  protected readonly subjectIdField = 'accountsPayableId';

  constructor(protected override readonly prisma: PrismaService) {
    super(prisma);
  }

  async create(
    userId: string,
    accountsPayableIdOrDto: string | CreateAccountsPayableObservationDto,
    maybeDto?: CreateAccountsPayableObservationDto,
  ): Promise<AccountsPayableObservationResponseDto> {
    let accountsPayableId: string | undefined;
    let createDto: CreateAccountsPayableObservationDto | undefined;

    if (typeof accountsPayableIdOrDto === 'string') {
      accountsPayableId = accountsPayableIdOrDto;
      createDto = maybeDto;
    } else {
      createDto = accountsPayableIdOrDto;
      accountsPayableId = accountsPayableIdOrDto.accountsPayableId;
    }

    if (!accountsPayableId || !createDto) {
      throw new NotFoundException('Accounts payable ID is required');
    }

    return super.create(userId, accountsPayableId, createDto);
  }

  async findAll(
    userId: string,
  ): Promise<AccountsPayableObservationResponseDto[]> {
    const companyId = await this.getUserCompanyId(userId);

    const model = (this.prisma as any)[this.observationModel];

    const observations: {
      id: string;
      accountsPayableId: string;
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

  async findAllByAccountsPayableId(
    userId: string,
    accountsPayableId: string,
  ): Promise<AccountsPayableObservationResponseDto[]> {
    return this.findAllBySubjectId(userId, accountsPayableId);
  }

  protected async validateSubjectBelongsToCompany(
    accountsPayableId: string,
    companyId: string,
  ): Promise<void> {
    await this.validateAccountsPayableBelongsToCompany(
      accountsPayableId,
      companyId,
    );
  }

  protected buildCreateData(
    userId: string,
    companyId: string,
    accountsPayableId: string,
    createDto: CreateAccountsPayableObservationDto,
  ): any {
    return {
      accountsPayableId,
      observation: createDto.observation,
      fileIds: createDto.fileIds
        ? JSON.stringify(createDto.fileIds)
        : Prisma.JsonNull,
      companyId,
      createdBy: userId,
    };
  }

  protected buildUpdateData(
    updateDto: UpdateAccountsPayableObservationDto,
  ): Record<string, unknown> {
    return super.buildUpdateData(updateDto);
  }

  protected transformObservation(observation: {
    id: string;
    accountsPayableId: string;
    observation: string;
    fileIds: unknown;
    companyId: string;
    createdBy: string | null;
    createdAt: Date;
    updatedAt: Date;
  }): AccountsPayableObservationResponseDto {
    return buildObservationResponse<AccountsPayableObservationResponseDto>(
      observation,
      'accountsPayableId',
    );
  }

  private async validateAccountsPayableBelongsToCompany(
    accountsPayableId: string,
    companyId: string,
  ): Promise<void> {
    const accountsPayable = await this.prisma.accountsPayable.findFirst({
      where: {
        id: accountsPayableId,
        companyId,
        deletedAt: null,
      },
      select: { id: true },
    });

    if (!accountsPayable) {
      throw new NotFoundException('Accounts payable not found');
    }
  }
}
