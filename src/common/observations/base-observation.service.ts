/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return */
import { NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../services/prisma.service';
import { getUserCompanyIdOrThrow } from './observation-company.helper';
import { buildObservationUpdateData } from './observation-update-data.helper';

export interface ObservationEntityBase {
  id: string;
  companyId: string;
  createdBy: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

export interface ObservationCreateDtoBase {
  observation: string;
  fileIds?: string[] | null;
}

export interface ObservationUpdateDtoBase {
  observation?: string;
  fileIds?: string[] | null;
}

export interface ObservationResponseBase {
  id: string;
  observation: string;
  companyId: string;
  createdBy?: string;
  createdAt: Date;
  updatedAt: Date;
  fileIds?: string[];
}

export abstract class BaseObservationService<
  TCreateDto extends ObservationCreateDtoBase,
  TUpdateDto extends ObservationUpdateDtoBase,
  TResponse extends ObservationResponseBase,
> {
  protected constructor(protected readonly prisma: PrismaService) {}

  /**
   * Name of the Prisma model used for this observation type,
   * e.g. "animalObservation", "buyerObservation", etc.
   */
  protected abstract readonly observationModel: keyof PrismaService;

  /**
   * Name of the foreign key field that links the observation to its subject,
   * e.g. "animalId", "buyerId", "employeeId", etc.
   */
  protected abstract readonly subjectIdField: string;

  protected abstract validateSubjectBelongsToCompany(
    subjectId: string,
    companyId: string,
  ): Promise<void>;

  protected abstract buildCreateData(
    userId: string,
    companyId: string,
    subjectId: string,
    createDto: TCreateDto,
  ): any;

  protected abstract transformObservation(entity: any): TResponse;

  async create(
    userId: string,
    subjectId: string,
    createDto: TCreateDto,
  ): Promise<TResponse> {
    const companyId = await this.getUserCompanyId(userId);

    await this.validateSubjectBelongsToCompany(subjectId, companyId);

    const model = (this.prisma as any)[this.observationModel];

    const observation = await model.create({
      data: this.buildCreateData(userId, companyId, subjectId, createDto),
    });

    return this.transformObservation(observation);
  }

  async findAllBySubjectId(
    userId: string,
    subjectId: string,
  ): Promise<TResponse[]> {
    const companyId = await this.getUserCompanyId(userId);

    await this.validateSubjectBelongsToCompany(subjectId, companyId);

    const model = (this.prisma as any)[this.observationModel];

    const observations = await model.findMany({
      where: {
        companyId,
        deletedAt: null,
        [this.subjectIdField]: subjectId,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return observations.map((obs: any) => this.transformObservation(obs));
  }

  async findOne(userId: string, id: string): Promise<TResponse> {
    const companyId = await this.getUserCompanyId(userId);
    const observation = await this.findObservationByIdAndCompany(id, companyId);
    return this.transformObservation(observation);
  }

  async update(
    userId: string,
    id: string,
    updateDto: TUpdateDto,
  ): Promise<TResponse> {
    const companyId = await this.getUserCompanyId(userId);
    await this.findObservationByIdAndCompany(id, companyId);

    const model = (this.prisma as any)[this.observationModel];

    const updated = await model.update({
      where: { id },
      data: this.buildUpdateData(updateDto),
    });

    return this.transformObservation(updated);
  }

  async remove(userId: string, id: string): Promise<{ message: string }> {
    const companyId = await this.getUserCompanyId(userId);
    await this.findObservationByIdAndCompany(id, companyId);

    const model = (this.prisma as any)[this.observationModel];

    await model.update({
      where: { id },
      data: {
        deletedAt: new Date(),
      },
    });

    return { message: 'Observation deleted successfully' };
  }

  protected async findObservationByIdAndCompany(id: string, companyId: string) {
    const model = (this.prisma as any)[this.observationModel];

    const observation = await model.findFirst({
      where: {
        id,
        companyId,
        deletedAt: null,
      },
    });

    if (!observation) {
      throw new NotFoundException('Observation not found');
    }

    return observation;
  }

  protected serializeFileIds(fileIds?: string[] | null): Prisma.JsonValue {
    if (!fileIds || fileIds.length === 0) {
      return null as Prisma.JsonValue;
    }
    return JSON.stringify(fileIds) as unknown as Prisma.JsonValue;
  }

  protected deserializeFileIds(fileIds: unknown): string[] | undefined {
    if (!fileIds) {
      return undefined;
    }

    if (typeof fileIds === 'string') {
      try {
        return JSON.parse(fileIds) as string[];
      } catch {
        return [];
      }
    }

    if (typeof fileIds === 'object') {
      return fileIds as string[];
    }

    return undefined;
  }

  protected async getUserCompanyId(userId: string): Promise<string> {
    return getUserCompanyIdOrThrow(this.prisma, userId);
  }

  protected buildUpdateData(updateDto: TUpdateDto): Record<string, unknown> {
    return buildObservationUpdateData(updateDto);
  }
}
