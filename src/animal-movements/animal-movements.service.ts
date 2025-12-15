import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../common/services/prisma.service';
import { CompanyEntitiesValidationService } from '../common/services/company-entities-validation.service';
import { CreateAnimalMovementDto, AnimalMovementResponseDto } from './dto';

@Injectable()
export class AnimalMovementsService {
  constructor(
    private prisma: PrismaService,
    private companyEntitiesValidation: CompanyEntitiesValidationService,
  ) {}

  async create(
    userId: string,
    createDto: CreateAnimalMovementDto,
  ): Promise<AnimalMovementResponseDto> {
    const companyId =
      await this.companyEntitiesValidation.getUserCompanyId(userId);

    await this.companyEntitiesValidation.validatePropertyBelongsToCompany(
      createDto.propertyId,
      companyId,
    );

    if (createDto.locationId) {
      await this.companyEntitiesValidation.validateLocationBelongsToCompanyAndProperty(
        createDto.locationId,
        createDto.propertyId,
        companyId,
      );
    }

    if (createDto.animalIds && createDto.animalIds.length > 0) {
      await this.validateAnimalsBelongToCompanyAndProperty(
        createDto.animalIds,
        companyId,
        createDto.propertyId,
      );
    }

    if (createDto.employeeIds && createDto.employeeIds.length > 0) {
      await this.companyEntitiesValidation.validateEmployeesBelongToCompany(
        createDto.employeeIds,
        companyId,
      );
    }

    if (
      createDto.serviceProviderIds &&
      createDto.serviceProviderIds.length > 0
    ) {
      await this.companyEntitiesValidation.validateServiceProvidersBelongToCompany(
        createDto.serviceProviderIds,
        companyId,
      );
    }

    const movement = await this.prisma.animalMovement.create({
      data: {
        companyId,
        propertyId: createDto.propertyId,
        locationId: createDto.locationId ?? null,
        // Store arrays as JSON arrays (not stringified)
        animalIds: createDto.animalIds,
        employeeIds: createDto.employeeIds ?? Prisma.JsonNull,
        serviceProviderIds: createDto.serviceProviderIds ?? Prisma.JsonNull,
        date: new Date(createDto.date),
        observation: createDto.observation ?? null,
        fileIds: createDto.fileIds ?? Prisma.JsonNull,
      },
    });

    return this.transformAnimalMovement(movement);
  }

  async findAllForCompany(
    userId: string,
  ): Promise<AnimalMovementResponseDto[]> {
    const companyId =
      await this.companyEntitiesValidation.getUserCompanyId(userId);

    const movements = await this.prisma.animalMovement.findMany({
      where: {
        companyId,
        deletedAt: null,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return movements.map((m) => this.transformAnimalMovement(m));
  }

  async findOne(
    userId: string,
    id: string,
  ): Promise<AnimalMovementResponseDto> {
    const companyId =
      await this.companyEntitiesValidation.getUserCompanyId(userId);

    const movement = await this.prisma.animalMovement.findFirst({
      where: {
        id,
        companyId,
        deletedAt: null,
      },
    });

    if (!movement) {
      throw new NotFoundException('Animal movement not found');
    }

    return this.transformAnimalMovement(movement);
  }

  async findByAnimalId(
    userId: string,
    animalId: string,
  ): Promise<AnimalMovementResponseDto[]> {
    const companyId =
      await this.companyEntitiesValidation.getUserCompanyId(userId);
    await this.validateAnimalBelongsToCompany(animalId, companyId);

    const movements = await this.prisma.animalMovement.findMany({
      where: {
        companyId,
        deletedAt: null,
        // animalIds JSON array contains animalId
        animalIds: {
          array_contains: [animalId],
        },
      },
      orderBy: {
        date: 'desc',
      },
    });

    return movements.map((m) => this.transformAnimalMovement(m));
  }

  async findByLocationId(
    userId: string,
    locationId: string,
  ): Promise<AnimalMovementResponseDto[]> {
    const companyId =
      await this.companyEntitiesValidation.getUserCompanyId(userId);
    await this.companyEntitiesValidation.validateLocationBelongsToCompany(
      locationId,
      companyId,
    );

    const movements = await this.prisma.animalMovement.findMany({
      where: {
        companyId,
        deletedAt: null,
        locationId,
      },
      orderBy: {
        date: 'desc',
      },
    });

    return movements.map((m) => this.transformAnimalMovement(m));
  }

  async findByPropertyId(
    userId: string,
    propertyId: string,
  ): Promise<AnimalMovementResponseDto[]> {
    const companyId =
      await this.companyEntitiesValidation.getUserCompanyId(userId);
    await this.companyEntitiesValidation.validatePropertyBelongsToCompany(
      propertyId,
      companyId,
    );

    const movements = await this.prisma.animalMovement.findMany({
      where: {
        companyId,
        deletedAt: null,
        propertyId,
      },
      orderBy: {
        date: 'desc',
      },
    });

    return movements.map((m) => this.transformAnimalMovement(m));
  }

  async findByEmployeeId(
    userId: string,
    employeeId: string,
  ): Promise<AnimalMovementResponseDto[]> {
    const companyId =
      await this.companyEntitiesValidation.getUserCompanyId(userId);
    await this.companyEntitiesValidation.validateEmployeeBelongsToCompany(
      employeeId,
      companyId,
    );

    const movements = await this.prisma.animalMovement.findMany({
      where: {
        companyId,
        deletedAt: null,
        employeeIds: {
          array_contains: [employeeId],
        },
      },
      orderBy: {
        date: 'desc',
      },
    });

    return movements.map((m) => this.transformAnimalMovement(m));
  }

  async findByServiceProviderId(
    userId: string,
    serviceProviderId: string,
  ): Promise<AnimalMovementResponseDto[]> {
    const companyId =
      await this.companyEntitiesValidation.getUserCompanyId(userId);
    await this.companyEntitiesValidation.validateServiceProviderBelongsToCompany(
      serviceProviderId,
      companyId,
    );

    const movements = await this.prisma.animalMovement.findMany({
      where: {
        companyId,
        deletedAt: null,
        serviceProviderIds: {
          array_contains: [serviceProviderId],
        },
      },
      orderBy: {
        date: 'desc',
      },
    });

    return movements.map((m) => this.transformAnimalMovement(m));
  }

  async findAnimalsByLastMovementLocation(
    userId: string,
    locationId: string,
  ): Promise<string[]> {
    const companyId =
      await this.companyEntitiesValidation.getUserCompanyId(userId);
    await this.companyEntitiesValidation.validateLocationBelongsToCompany(
      locationId,
      companyId,
    );

    const movements = await this.prisma.animalMovement.findMany({
      where: {
        companyId,
        deletedAt: null,
      },
      orderBy: {
        date: 'desc',
      },
    });

    const lastMovementByAnimal = new Map<
      string,
      Prisma.AnimalMovementGetPayload<Prisma.AnimalMovementDefaultArgs>
    >();

    for (const movement of movements) {
      const animalIds = Array.isArray(movement.animalIds)
        ? (movement.animalIds as string[])
        : [];

      for (const animalId of animalIds) {
        if (!lastMovementByAnimal.has(animalId)) {
          lastMovementByAnimal.set(animalId, movement);
        }
      }
    }

    const result: string[] = [];
    for (const [animalId, movement] of lastMovementByAnimal.entries()) {
      if (movement.locationId === locationId) {
        result.push(animalId);
      }
    }

    return result;
  }

  async remove(userId: string, id: string): Promise<void> {
    const companyId =
      await this.companyEntitiesValidation.getUserCompanyId(userId);

    const existing = await this.prisma.animalMovement.findFirst({
      where: {
        id,
        companyId,
        deletedAt: null,
      },
    });

    if (!existing) {
      throw new NotFoundException('Animal movement not found');
    }

    await this.prisma.animalMovement.update({
      where: { id },
      data: {
        deletedAt: new Date(),
      },
    });
  }

  private transformAnimalMovement(movement: {
    id: string;
    companyId: string;
    propertyId: string;
    locationId: string | null;
    animalIds: Prisma.JsonValue;
    employeeIds: Prisma.JsonValue;
    serviceProviderIds: Prisma.JsonValue;
    date: Date;
    observation: string | null;
    fileIds: Prisma.JsonValue;
    createdAt: Date;
    updatedAt: Date;
  }): AnimalMovementResponseDto {
    return {
      id: movement.id,
      companyId: movement.companyId,
      propertyId: movement.propertyId,
      locationId: movement.locationId,
      animalIds: Array.isArray(movement.animalIds)
        ? (movement.animalIds as string[])
        : [],
      employeeIds: Array.isArray(movement.employeeIds)
        ? (movement.employeeIds as string[])
        : [],
      serviceProviderIds: Array.isArray(movement.serviceProviderIds)
        ? (movement.serviceProviderIds as string[])
        : [],
      date: movement.date.toISOString(),
      observation: movement.observation,
      fileIds: Array.isArray(movement.fileIds)
        ? (movement.fileIds as string[])
        : [],
      createdAt: movement.createdAt.toISOString(),
      updatedAt: movement.updatedAt.toISOString(),
    };
  }

  private async validateAnimalsBelongToCompanyAndProperty(
    animalIds: string[],
    companyId: string,
    propertyId: string,
  ): Promise<void> {
    const animals = await this.prisma.animal.findMany({
      where: {
        id: { in: animalIds },
        companyId,
        propertyId,
        deletedAt: null,
      },
      select: { id: true },
    });

    if (animals.length !== animalIds.length) {
      throw new NotFoundException(
        'One or more animals not found or do not belong to your company/property',
      );
    }
  }

  private async validateAnimalBelongsToCompany(
    animalId: string,
    companyId: string,
  ): Promise<void> {
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
}
