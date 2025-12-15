import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../common/services/prisma.service';
import {
  CreateEmployeeObservationDto,
  UpdateEmployeeObservationDto,
  EmployeeObservationResponseDto,
} from './dto';
import { BaseObservationService } from '../common/observations/base-observation.service';

@Injectable()
export class EmployeeObservationsService extends BaseObservationService<
  CreateEmployeeObservationDto,
  UpdateEmployeeObservationDto,
  EmployeeObservationResponseDto
> {
  protected readonly observationModel = 'employeeObservation' as const;
  protected readonly subjectIdField = 'employeeId';

  constructor(protected override readonly prisma: PrismaService) {
    super(prisma);
  }

  async findAllByEmployeeId(
    userId: string,
    employeeId: string,
  ): Promise<EmployeeObservationResponseDto[]> {
    return this.findAllBySubjectId(userId, employeeId);
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
    employeeId: string,
    companyId: string,
  ): Promise<void> {
    const employee = await this.prisma.employee.findFirst({
      where: {
        id: employeeId,
        companyId,
        deletedAt: null,
      },
      select: { id: true },
    });

    if (!employee) {
      throw new NotFoundException('Employee not found');
    }
  }

  protected buildCreateData(
    userId: string,
    companyId: string,
    employeeId: string,
    createDto: CreateEmployeeObservationDto,
  ): any {
    return {
      employeeId,
      observation: createDto.observation,
      fileIds: createDto.fileIds
        ? JSON.stringify(createDto.fileIds)
        : Prisma.JsonNull,
      companyId,
      createdBy: userId,
    };
  }

  protected buildUpdateData(
    updateDto: UpdateEmployeeObservationDto,
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
    employeeId: string;
    observation: string;
    fileIds: unknown;
    companyId: string;
    createdBy: string | null;
    createdAt: Date;
    updatedAt: Date;
  }): EmployeeObservationResponseDto {
    const result: EmployeeObservationResponseDto = {
      id: observation.id,
      employeeId: observation.employeeId,
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
