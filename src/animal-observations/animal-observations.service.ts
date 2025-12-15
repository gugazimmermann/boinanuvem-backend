import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../common/services/prisma.service';
import {
  CreateAnimalObservationDto,
  UpdateAnimalObservationDto,
  AnimalObservationResponseDto,
} from './dto';
import { BaseObservationService } from '../common/observations/base-observation.service';
import { buildObservationResponse } from '../common/observations/observation-transform.helper';

@Injectable()
export class AnimalObservationsService extends BaseObservationService<
  CreateAnimalObservationDto,
  UpdateAnimalObservationDto,
  AnimalObservationResponseDto
> {
  protected readonly observationModel = 'animalObservation' as const;
  protected readonly subjectIdField = 'animalId';

  constructor(protected override readonly prisma: PrismaService) {
    super(prisma);
  }

  // Backwards-compatible alias for tests and existing callers
  async findAllByAnimalId(
    userId: string,
    animalId: string,
  ): Promise<AnimalObservationResponseDto[]> {
    return this.findAllBySubjectId(userId, animalId);
  }

  protected async validateSubjectBelongsToCompany(
    animalId: string,
    companyId: string,
  ): Promise<void> {
    const animal = await this.prisma.animal.findFirst({
      where: {
        id: animalId,
        companyId,
        deletedAt: null,
      },
      select: { id: true },
    });

    if (!animal) {
      throw new NotFoundException('Animal not found');
    }
  }

  protected buildCreateData(
    userId: string,
    companyId: string,
    animalId: string,
    createDto: CreateAnimalObservationDto,
  ): any {
    return {
      animalId,
      observation: createDto.observation,
      fileIds: createDto.fileIds
        ? JSON.stringify(createDto.fileIds)
        : Prisma.JsonNull,
      companyId,
      createdBy: userId,
    };
  }

  protected buildUpdateData(
    updateDto: UpdateAnimalObservationDto,
  ): Record<string, unknown> {
    // Use the shared helper via BaseObservationService default implementation
    return super.buildUpdateData(updateDto);
  }

  protected transformObservation(observation: {
    id: string;
    animalId: string;
    observation: string;
    fileIds: unknown;
    companyId: string;
    createdBy: string | null;
    createdAt: Date;
    updatedAt: Date;
  }): AnimalObservationResponseDto {
    return buildObservationResponse<AnimalObservationResponseDto>(
      observation,
      'animalId',
    );
  }
}
