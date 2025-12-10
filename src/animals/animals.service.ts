import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../common/services/prisma.service';
import { CreateAnimalDto, UpdateAnimalDto } from './dto';

@Injectable()
export class AnimalsService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, createAnimalDto: CreateAnimalDto) {
    const companyId = await this.getUserCompanyId(userId);

    // Validate property belongs to company
    await this.validatePropertyBelongsToCompany(
      createAnimalDto.propertyId,
      companyId,
    );

    // Check if code already exists for this company (excluding soft-deleted)
    const existing = await this.findByCode(companyId, createAnimalDto.code);

    if (existing) {
      throw new ConflictException(
        'Animal with this code already exists for your company',
      );
    }

    const animal = await this.prisma.animal.create({
      data: {
        code: createAnimalDto.code,
        registrationNumber: createAnimalDto.registrationNumber,
        acquisitionDate: createAnimalDto.acquisitionDate
          ? new Date(createAnimalDto.acquisitionDate)
          : null,
        status: createAnimalDto.status,
        companyId,
        propertyId: createAnimalDto.propertyId,
      },
    });

    return this.transformAnimal(animal);
  }

  async findAll(userId: string) {
    const companyId = await this.getUserCompanyId(userId);

    const animals = await this.prisma.animal.findMany({
      where: {
        companyId,
        deletedAt: null,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return animals.map((animal) => this.transformAnimal(animal));
  }

  async findOne(userId: string, id: string) {
    const companyId = await this.getUserCompanyId(userId);
    const animal = await this.findAnimalByIdAndCompany(id, companyId);
    return this.transformAnimal(animal);
  }

  async update(userId: string, id: string, updateAnimalDto: UpdateAnimalDto) {
    const companyId = await this.getUserCompanyId(userId);
    const existing = await this.findAnimalByIdAndCompany(id, companyId);

    // If code is being updated, check for conflicts
    if (
      updateAnimalDto.code !== undefined &&
      updateAnimalDto.code !== null &&
      updateAnimalDto.code !== '' &&
      updateAnimalDto.code !== existing.code
    ) {
      await this.validateCodeConflict(
        companyId,
        id,
        updateAnimalDto.code,
        existing.code,
      );
    }

    // If propertyId is being updated, validate it belongs to company
    if (updateAnimalDto.propertyId) {
      await this.validatePropertyBelongsToCompany(
        updateAnimalDto.propertyId,
        companyId,
      );
    }

    const updateData = this.buildUpdateData(updateAnimalDto);
    const updated = await this.prisma.animal.update({
      where: { id },
      data: updateData,
    });

    return this.transformAnimal(updated);
  }

  async remove(userId: string, id: string) {
    const companyId = await this.getUserCompanyId(userId);
    await this.findAnimalByIdAndCompany(id, companyId);

    // Soft delete by setting deletedAt timestamp
    await this.prisma.animal.update({
      where: { id },
      data: {
        deletedAt: new Date(),
      },
    });

    return { message: 'Animal deleted successfully' };
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

  private async findAnimalByIdAndCompany(id: string, companyId: string) {
    const animal = await this.prisma.animal.findFirst({
      where: {
        id,
        companyId,
        deletedAt: null,
      },
    });

    if (!animal) {
      throw new NotFoundException('Animal not found');
    }

    return animal;
  }

  private async findByCode(
    companyId: string,
    code: string,
  ): Promise<{ id: string } | null> {
    return this.prisma.animal.findFirst({
      where: {
        companyId,
        code,
        deletedAt: null,
      },
    });
  }

  private async validateCodeConflict(
    companyId: string,
    animalId: string,
    newCode: string | undefined,
    currentCode: string,
  ): Promise<void> {
    if (!newCode || newCode === currentCode) {
      return;
    }

    const codeConflict = await this.prisma.animal.findFirst({
      where: {
        companyId,
        code: newCode,
        deletedAt: null,
        NOT: { id: animalId },
      },
    });

    if (codeConflict) {
      throw new ConflictException(
        'Animal with this code already exists for your company',
      );
    }
  }

  private async validatePropertyBelongsToCompany(
    propertyId: string,
    companyId: string,
  ): Promise<void> {
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

  private buildUpdateData(updateAnimalDto: UpdateAnimalDto) {
    const data: Record<string, unknown> = {};

    // Code must not be empty string (MinLength(1) validation)
    if (
      updateAnimalDto.code !== undefined &&
      updateAnimalDto.code !== null &&
      updateAnimalDto.code !== ''
    ) {
      data.code = updateAnimalDto.code;
    }

    if (
      updateAnimalDto.registrationNumber !== undefined &&
      updateAnimalDto.registrationNumber !== null &&
      updateAnimalDto.registrationNumber !== ''
    ) {
      data.registrationNumber = updateAnimalDto.registrationNumber;
    }

    if (updateAnimalDto.acquisitionDate !== undefined) {
      data.acquisitionDate = updateAnimalDto.acquisitionDate
        ? new Date(updateAnimalDto.acquisitionDate)
        : null;
    }

    this.addIfDefined(data, 'status', updateAnimalDto.status);
    this.addIfDefined(data, 'propertyId', updateAnimalDto.propertyId);

    return data;
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

  private transformAnimal(animal: {
    id: string;
    code: string;
    registrationNumber: string;
    acquisitionDate: Date | null;
    status: string;
    companyId: string;
    propertyId: string;
    createdAt: Date;
    updatedAt: Date;
  }) {
    return {
      id: animal.id,
      code: animal.code,
      registrationNumber: animal.registrationNumber,
      acquisitionDate: animal.acquisitionDate ?? undefined,
      status: animal.status,
      companyId: animal.companyId,
      propertyId: animal.propertyId,
      createdAt: animal.createdAt,
      updatedAt: animal.updatedAt,
    };
  }
}
