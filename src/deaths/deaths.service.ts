import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../common/services/prisma.service';
import { CreateDeathDto, UpdateDeathDto } from './dto';

@Injectable()
export class DeathsService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, createDeathDto: CreateDeathDto) {
    const companyId = await this.getUserCompanyId(userId);

    // Validate animal belongs to company
    await this.validateAnimalBelongsToCompany(
      createDeathDto.animalId,
      companyId,
    );

    // Check if animal already has a death record
    const existingDeath = await this.prisma.death.findUnique({
      where: {
        animalId: createDeathDto.animalId,
      },
    });

    if (existingDeath && !existingDeath.deletedAt) {
      throw new ConflictException('Animal already has a death record');
    }

    // Create death record and update animal status in a transaction
    const result = await this.prisma.$transaction(async (tx) => {
      // If there's a soft-deleted death, restore it; otherwise create new
      let death;
      if (existingDeath) {
        death = await tx.death.update({
          where: { id: existingDeath.id },
          data: {
            deathDate: new Date(createDeathDto.date),
            cause: createDeathDto.cause,
            observation: createDeathDto.observation ?? null,
            deletedAt: null,
          },
        });
      } else {
        death = await tx.death.create({
          data: {
            animalId: createDeathDto.animalId,
            deathDate: new Date(createDeathDto.date),
            cause: createDeathDto.cause,
            observation: createDeathDto.observation ?? null,
            companyId,
          },
        });
      }

      // Update animal status to inactive
      await tx.animal.update({
        where: { id: createDeathDto.animalId },
        data: {
          status: 'inactive',
        },
      });

      return death;
    });

    return this.transformDeath(result);
  }

  async findAll(userId: string) {
    const companyId = await this.getUserCompanyId(userId);

    const deaths = await this.prisma.death.findMany({
      where: {
        companyId,
        deletedAt: null,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return deaths.map((death) => this.transformDeath(death));
  }

  async findOne(userId: string, id: string) {
    const companyId = await this.getUserCompanyId(userId);
    const death = await this.findDeathByIdAndCompany(id, companyId);
    return this.transformDeath(death);
  }

  async findByAnimalId(userId: string, animalId: string) {
    const companyId = await this.getUserCompanyId(userId);

    // Validate animal belongs to company
    await this.validateAnimalBelongsToCompany(animalId, companyId);

    const death = await this.prisma.death.findUnique({
      where: {
        animalId,
      },
    });

    if (!death || death.companyId !== companyId || death.deletedAt) {
      throw new NotFoundException('Death record not found for this animal');
    }

    return this.transformDeath(death);
  }

  async update(userId: string, id: string, updateDeathDto: UpdateDeathDto) {
    const companyId = await this.getUserCompanyId(userId);
    await this.findDeathByIdAndCompany(id, companyId);

    const updateData: Record<string, unknown> = {};

    if (updateDeathDto.date !== undefined) {
      updateData.deathDate = new Date(updateDeathDto.date);
    }

    this.addIfDefined(updateData, 'cause', updateDeathDto.cause);
    this.addIfNotUndefined(
      updateData,
      'observation',
      updateDeathDto.observation,
    );

    const updated = await this.prisma.death.update({
      where: { id },
      data: updateData,
    });

    return this.transformDeath(updated);
  }

  async remove(userId: string, id: string) {
    const companyId = await this.getUserCompanyId(userId);
    const death = await this.findDeathByIdAndCompany(id, companyId);

    // Restore animal status to active
    await this.prisma.animal.update({
      where: { id: death.animalId },
      data: {
        status: 'active',
      },
    });

    // Soft delete
    await this.prisma.death.update({
      where: { id },
      data: {
        deletedAt: new Date(),
      },
    });

    return { message: 'Death record deleted successfully' };
  }

  private async getUserCompanyId(userId: string): Promise<string> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { companyId: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user.companyId;
  }

  private async findDeathByIdAndCompany(id: string, companyId: string) {
    const death = await this.prisma.death.findFirst({
      where: {
        id,
        companyId,
        deletedAt: null,
      },
    });

    if (!death) {
      throw new NotFoundException('Death record not found');
    }

    return death;
  }

  private async validateAnimalBelongsToCompany(
    animalId: string,
    companyId: string,
  ) {
    const animal = await this.prisma.animal.findFirst({
      where: {
        id: animalId,
        companyId,
        deletedAt: null,
      },
    });

    if (!animal) {
      throw new NotFoundException(
        'Animal not found or does not belong to your company',
      );
    }

    return animal;
  }

  private addIfDefined(
    data: Record<string, unknown>,
    key: string,
    value: unknown,
  ): void {
    if (value !== undefined && value !== null) {
      data[key] = value;
    }
  }

  private addIfNotUndefined(
    data: Record<string, unknown>,
    key: string,
    value: unknown,
  ): void {
    if (value !== undefined) {
      data[key] = value ?? null;
    }
  }

  private transformDeath(death: {
    id: string;
    animalId: string;
    deathDate: Date;
    cause: string;
    observation: string | null;
    companyId: string;
    createdAt: Date;
    updatedAt: Date;
  }) {
    return {
      id: death.id,
      animalId: death.animalId,
      deathDate: death.deathDate,
      cause: death.cause,
      observation: death.observation ?? undefined,
      companyId: death.companyId,
      createdAt: death.createdAt,
      updatedAt: death.updatedAt,
    };
  }
}
