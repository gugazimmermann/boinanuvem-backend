import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/services/prisma.service';
import { Prisma } from '@prisma/client';
import { CreateBreedingDto, UpdateBreedingDto } from './dto';

@Injectable()
export class BreedingsService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, createDto: CreateBreedingDto) {
    const companyId = await this.getUserCompanyId(userId);

    // Validate animal belongs to company
    await this.validateAnimalBelongsToCompany(createDto.animalId, companyId);

    // Validate bull if provided (for natural breeding)
    if (createDto.bullId) {
      await this.validateAnimalBelongsToCompany(createDto.bullId, companyId);
    }

    // Validate employees if provided
    if (createDto.employeeIds && createDto.employeeIds.length > 0) {
      await this.validateEmployeesBelongToCompany(
        createDto.employeeIds,
        companyId,
      );
    }

    // Validate service providers if provided
    if (
      createDto.serviceProviderIds &&
      createDto.serviceProviderIds.length > 0
    ) {
      await this.validateServiceProvidersBelongToCompany(
        createDto.serviceProviderIds,
        companyId,
      );
    }

    const breeding = await this.prisma.breeding.create({
      data: {
        animalId: createDto.animalId,
        date: new Date(createDto.date),
        method: createDto.method,
        bullId: createDto.bullId ?? null,
        attemptNumber: createDto.attemptNumber ?? null,
        semenCode: createDto.semenCode ?? null,
        confirmed: createDto.confirmed ?? false,
        observation: createDto.observation ?? null,
        companyId,
        employeeIds: createDto.employeeIds
          ? JSON.stringify(createDto.employeeIds)
          : Prisma.JsonNull,
        serviceProviderIds: createDto.serviceProviderIds
          ? JSON.stringify(createDto.serviceProviderIds)
          : Prisma.JsonNull,
      },
    });

    return this.transformBreeding(breeding);
  }

  async findAll(userId: string) {
    const companyId = await this.getUserCompanyId(userId);

    const breedings = await this.prisma.breeding.findMany({
      where: {
        companyId,
        deletedAt: null,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return breedings.map((breeding) => this.transformBreeding(breeding));
  }

  async findOne(userId: string, id: string) {
    const companyId = await this.getUserCompanyId(userId);
    const breeding = await this.findBreedingByIdAndCompany(id, companyId);
    return this.transformBreeding(breeding);
  }

  async findByAnimalId(userId: string, animalId: string) {
    const companyId = await this.getUserCompanyId(userId);

    // Validate animal belongs to company
    await this.validateAnimalBelongsToCompany(animalId, companyId);

    const breedings = await this.prisma.breeding.findMany({
      where: {
        animalId,
        companyId,
        deletedAt: null,
      },
      orderBy: {
        date: 'desc',
      },
    });

    return breedings.map((breeding) => this.transformBreeding(breeding));
  }

  async update(userId: string, id: string, updateDto: UpdateBreedingDto) {
    const companyId = await this.getUserCompanyId(userId);
    await this.findBreedingByIdAndCompany(id, companyId);

    // Validate animal if being updated
    if (updateDto.animalId) {
      await this.validateAnimalBelongsToCompany(updateDto.animalId, companyId);
    }

    // Validate bull if being updated
    if (updateDto.bullId !== undefined) {
      if (updateDto.bullId) {
        await this.validateAnimalBelongsToCompany(updateDto.bullId, companyId);
      }
    }

    // Validate employees if being updated
    if (updateDto.employeeIds !== undefined) {
      if (updateDto.employeeIds.length > 0) {
        await this.validateEmployeesBelongToCompany(
          updateDto.employeeIds,
          companyId,
        );
      }
    }

    // Validate service providers if being updated
    if (updateDto.serviceProviderIds !== undefined) {
      if (updateDto.serviceProviderIds.length > 0) {
        await this.validateServiceProvidersBelongToCompany(
          updateDto.serviceProviderIds,
          companyId,
        );
      }
    }

    const updateData = this.buildUpdateData(updateDto);
    const updated = await this.prisma.breeding.update({
      where: { id },
      data: updateData,
    });

    return this.transformBreeding(updated);
  }

  async confirm(userId: string, id: string) {
    const companyId = await this.getUserCompanyId(userId);
    await this.findBreedingByIdAndCompany(id, companyId);

    const updated = await this.prisma.breeding.update({
      where: { id },
      data: { confirmed: true },
    });

    return this.transformBreeding(updated);
  }

  async remove(userId: string, id: string) {
    const companyId = await this.getUserCompanyId(userId);
    await this.findBreedingByIdAndCompany(id, companyId);

    // Soft delete
    await this.prisma.breeding.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async findUnconfirmed(userId: string) {
    const companyId = await this.getUserCompanyId(userId);

    const breedings = await this.prisma.breeding.findMany({
      where: {
        companyId,
        confirmed: false,
        deletedAt: null,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return breedings.map((breeding) => this.transformBreeding(breeding));
  }

  async getNextAttemptNumber(userId: string, animalId: string) {
    const companyId = await this.getUserCompanyId(userId);

    // Validate animal belongs to company
    await this.validateAnimalBelongsToCompany(animalId, companyId);

    // Find most recent birth where animal is mother
    const mostRecentBirth = await this.prisma.birth.findFirst({
      where: {
        motherId: animalId,
        companyId,
        deletedAt: null,
      },
      orderBy: {
        birthDate: 'desc',
      },
      select: {
        birthDate: true,
      },
    });

    // Get all AI breedings for the animal
    const aiBreedings = await this.prisma.breeding.findMany({
      where: {
        animalId,
        companyId,
        method: 'artificial_insemination',
        deletedAt: null,
      },
      select: {
        attemptNumber: true,
        date: true,
      },
    });

    // If no birth, use all AI breedings
    if (!mostRecentBirth) {
      if (aiBreedings.length === 0) {
        return { nextAttemptNumber: 1 };
      }
      const maxAttempt = Math.max(
        ...aiBreedings.map((b) => b.attemptNumber ?? 0),
      );
      return { nextAttemptNumber: maxAttempt + 1 };
    }

    // Filter AI breedings after most recent birth
    const aiBreedingsAfterBirth = aiBreedings.filter((b) => {
      const breedingDate = new Date(b.date).getTime();
      const birthDate = new Date(mostRecentBirth.birthDate).getTime();
      return breedingDate > birthDate;
    });

    if (aiBreedingsAfterBirth.length === 0) {
      return { nextAttemptNumber: 1 };
    }

    const maxAttempt = Math.max(
      ...aiBreedingsAfterBirth.map((b) => b.attemptNumber ?? 0),
    );
    return { nextAttemptNumber: maxAttempt + 1 };
  }

  async isAnimalPregnant(userId: string, animalId: string) {
    const companyId = await this.getUserCompanyId(userId);

    // Validate animal belongs to company
    await this.validateAnimalBelongsToCompany(animalId, companyId);

    const confirmedBreeding = await this.prisma.breeding.findFirst({
      where: {
        animalId,
        companyId,
        confirmed: true,
        deletedAt: null,
      },
    });

    return { isPregnant: !!confirmedBreeding };
  }

  async getMostRecentConfirmedBreeding(userId: string, animalId: string) {
    const companyId = await this.getUserCompanyId(userId);

    // Validate animal belongs to company
    await this.validateAnimalBelongsToCompany(animalId, companyId);

    const breeding = await this.prisma.breeding.findFirst({
      where: {
        animalId,
        companyId,
        confirmed: true,
        deletedAt: null,
      },
      orderBy: {
        date: 'desc',
      },
    });

    return breeding ? this.transformBreeding(breeding) : null;
  }

  async findByPropertyId(userId: string, propertyId: string) {
    const companyId = await this.getUserCompanyId(userId);

    // Validate property belongs to company
    await this.validatePropertyBelongsToCompany(propertyId, companyId);

    // Get all animals for the property
    const animals = await this.prisma.animal.findMany({
      where: {
        propertyId,
        companyId,
        deletedAt: null,
      },
      select: {
        id: true,
      },
    });

    const animalIds = animals.map((a) => a.id);

    if (animalIds.length === 0) {
      return [];
    }

    // Get breedings for those animals
    const breedings = await this.prisma.breeding.findMany({
      where: {
        animalId: { in: animalIds },
        companyId,
        deletedAt: null,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return breedings.map((breeding) => this.transformBreeding(breeding));
  }

  async getPregnantAnimalsByProperty(userId: string, propertyId: string) {
    const companyId = await this.getUserCompanyId(userId);

    // Validate property belongs to company
    await this.validatePropertyBelongsToCompany(propertyId, companyId);

    // Get all animals for the property
    const animals = await this.prisma.animal.findMany({
      where: {
        propertyId,
        companyId,
        deletedAt: null,
      },
      select: {
        id: true,
      },
    });

    const animalIds = animals.map((a) => a.id);

    if (animalIds.length === 0) {
      return { animalIds: [] };
    }

    // Get confirmed breedings for those animals
    const confirmedBreedings = await this.prisma.breeding.findMany({
      where: {
        animalId: { in: animalIds },
        companyId,
        confirmed: true,
        deletedAt: null,
      },
      select: {
        animalId: true,
      },
      distinct: ['animalId'],
    });

    const uniqueAnimalIds = confirmedBreedings.map((b) => b.animalId);

    return { animalIds: uniqueAnimalIds };
  }

  async unconfirmMostRecentBreeding(userId: string, animalId: string) {
    const companyId = await this.getUserCompanyId(userId);

    // Validate animal belongs to company
    await this.validateAnimalBelongsToCompany(animalId, companyId);

    // Find most recent confirmed breeding
    const breeding = await this.prisma.breeding.findFirst({
      where: {
        animalId,
        companyId,
        confirmed: true,
        deletedAt: null,
      },
      orderBy: {
        date: 'desc',
      },
    });

    if (!breeding) {
      throw new NotFoundException(
        'No confirmed breeding found for this animal',
      );
    }

    // Unconfirm the breeding
    const updated = await this.prisma.breeding.update({
      where: { id: breeding.id },
      data: { confirmed: false },
    });

    return this.transformBreeding(updated);
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

  private async findBreedingByIdAndCompany(id: string, companyId: string) {
    const breeding = await this.prisma.breeding.findFirst({
      where: {
        id,
        companyId,
        deletedAt: null,
      },
    });

    if (!breeding) {
      throw new NotFoundException('Breeding not found');
    }

    return breeding;
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
  }

  private async validateEmployeesBelongToCompany(
    employeeIds: string[],
    companyId: string,
  ) {
    const employees = await this.prisma.employee.findMany({
      where: {
        id: { in: employeeIds },
        companyId,
        deletedAt: null,
      },
      select: { id: true },
    });

    if (employees.length !== employeeIds.length) {
      throw new NotFoundException(
        'One or more employees not found or do not belong to your company',
      );
    }
  }

  private async validateServiceProvidersBelongToCompany(
    serviceProviderIds: string[],
    companyId: string,
  ) {
    const serviceProviders = await this.prisma.serviceProvider.findMany({
      where: {
        id: { in: serviceProviderIds },
        companyId,
        deletedAt: null,
      },
      select: { id: true },
    });

    if (serviceProviders.length !== serviceProviderIds.length) {
      throw new NotFoundException(
        'One or more service providers not found or do not belong to your company',
      );
    }
  }

  private async validatePropertyBelongsToCompany(
    propertyId: string,
    companyId: string,
  ) {
    const property = await this.prisma.property.findFirst({
      where: {
        id: propertyId,
        companyId,
        deletedAt: null,
      },
      select: { id: true },
    });

    if (!property) {
      throw new NotFoundException(
        'Property not found or does not belong to your company',
      );
    }
  }

  private buildUpdateData(
    updateDto: UpdateBreedingDto,
  ): Record<string, unknown> {
    const data: Record<string, unknown> = {};

    if (updateDto.animalId !== undefined) data.animalId = updateDto.animalId;
    if (updateDto.date !== undefined) data.date = new Date(updateDto.date);
    if (updateDto.method !== undefined) data.method = updateDto.method;
    if (updateDto.bullId !== undefined) data.bullId = updateDto.bullId;
    if (updateDto.attemptNumber !== undefined)
      data.attemptNumber = updateDto.attemptNumber;
    if (updateDto.semenCode !== undefined) data.semenCode = updateDto.semenCode;
    if (updateDto.confirmed !== undefined) data.confirmed = updateDto.confirmed;
    if (updateDto.observation !== undefined)
      data.observation = updateDto.observation;
    if (updateDto.employeeIds !== undefined)
      data.employeeIds =
        updateDto.employeeIds.length > 0
          ? JSON.stringify(updateDto.employeeIds)
          : null;
    if (updateDto.serviceProviderIds !== undefined)
      data.serviceProviderIds =
        updateDto.serviceProviderIds.length > 0
          ? JSON.stringify(updateDto.serviceProviderIds)
          : null;

    return data;
  }

  private transformBreeding(breeding: {
    id: string;
    animalId: string;
    date: Date;
    method: string;
    bullId: string | null;
    attemptNumber: number | null;
    semenCode: string | null;
    confirmed: boolean;
    observation: string | null;
    companyId: string;
    employeeIds: Prisma.JsonValue;
    serviceProviderIds: Prisma.JsonValue;
    createdAt: Date;
    updatedAt: Date;
  }) {
    return {
      id: breeding.id,
      animalId: breeding.animalId,
      date: breeding.date,
      method: breeding.method,
      bullId: breeding.bullId,
      attemptNumber: breeding.attemptNumber,
      semenCode: breeding.semenCode,
      confirmed: breeding.confirmed,
      observation: breeding.observation,
      companyId: breeding.companyId,
      employeeIds: breeding.employeeIds
        ? (JSON.parse(breeding.employeeIds as string) as string[])
        : [],
      serviceProviderIds: breeding.serviceProviderIds
        ? (JSON.parse(breeding.serviceProviderIds as string) as string[])
        : [],
      createdAt: breeding.createdAt,
      updatedAt: breeding.updatedAt,
    };
  }
}
