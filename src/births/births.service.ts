import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../common/services/prisma.service';
import { CreateBirthDto, UpdateBirthDto, BirthPurity } from './dto';

@Injectable()
export class BirthsService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, createBirthDto: CreateBirthDto) {
    const companyId = await this.getUserCompanyId(userId);

    // Validate property belongs to company
    await this.validatePropertyBelongsToCompany(
      createBirthDto.propertyId,
      companyId,
    );

    // Validate mother and father if provided
    let motherBirth = null;
    let fatherBirth = null;
    let motherBreed: string | undefined;
    let fatherBreed: string | undefined;

    if (createBirthDto.motherId) {
      await this.validateAnimalBelongsToCompany(
        createBirthDto.motherId,
        companyId,
      );
      motherBirth = await this.findBirthByAnimalId(createBirthDto.motherId);
      // Breed is stored on Birth, not Animal
    }

    if (createBirthDto.fatherId) {
      await this.validateAnimalBelongsToCompany(
        createBirthDto.fatherId,
        companyId,
      );
      fatherBirth = await this.findBirthByAnimalId(createBirthDto.fatherId);
      // Breed is stored on Birth, not Animal
    }

    // Calculate purity if not provided
    let purity = createBirthDto.purity;
    if (!purity) {
      purity = this.calculatePurity(
        motherBirth,
        fatherBirth,
        motherBreed,
        fatherBreed,
      );
    }

    // Check if animal code already exists
    const existingAnimal = await this.prisma.animal.findFirst({
      where: {
        companyId,
        code: createBirthDto.code,
        deletedAt: null,
      },
    });

    if (existingAnimal) {
      throw new ConflictException(
        'Animal with this code already exists for your company',
      );
    }

    // Create animal and birth in a transaction
    const result = await this.prisma.$transaction(async (tx) => {
      // Create the animal
      const animal = await tx.animal.create({
        data: {
          code: createBirthDto.code,
          registrationNumber: createBirthDto.registrationNumber,
          acquisitionDate: new Date(createBirthDto.birthDate),
          status: 'active',
          companyId,
          propertyId: createBirthDto.propertyId,
        },
      });

      // Create the birth record
      const birth = await tx.birth.create({
        data: {
          animalId: animal.id,
          birthDate: new Date(createBirthDto.birthDate),
          breed: createBirthDto.breed ?? null,
          gender: createBirthDto.gender ?? null,
          motherId: createBirthDto.motherId ?? null,
          fatherId: createBirthDto.fatherId ?? null,
          purity: purity ?? null,
          observation: createBirthDto.observation ?? null,
          companyId,
        },
      });

      return birth;
    });

    return this.transformBirth(result);
  }

  async findAll(userId: string) {
    const companyId = await this.getUserCompanyId(userId);

    const births = await this.prisma.birth.findMany({
      where: {
        companyId,
        deletedAt: null,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return births.map((birth) => this.transformBirth(birth));
  }

  async findOne(userId: string, id: string) {
    const companyId = await this.getUserCompanyId(userId);
    const birth = await this.findBirthByIdAndCompany(id, companyId);
    return this.transformBirth(birth);
  }

  async findByAnimalId(userId: string, animalId: string) {
    const companyId = await this.getUserCompanyId(userId);

    // Validate animal belongs to company
    await this.validateAnimalBelongsToCompany(animalId, companyId);

    const birth = await this.findBirthByAnimalId(animalId);

    if (!birth || birth.companyId !== companyId || birth.deletedAt) {
      throw new NotFoundException('Birth record not found for this animal');
    }

    return this.transformBirth(birth);
  }

  async update(userId: string, id: string, updateBirthDto: UpdateBirthDto) {
    const companyId = await this.getUserCompanyId(userId);
    await this.findBirthByIdAndCompany(id, companyId);

    // Validate mother and father if being updated
    if (updateBirthDto.motherId) {
      await this.validateAnimalBelongsToCompany(
        updateBirthDto.motherId,
        companyId,
      );
    }

    if (updateBirthDto.fatherId) {
      await this.validateAnimalBelongsToCompany(
        updateBirthDto.fatherId,
        companyId,
      );
    }

    const updateData: Record<string, unknown> = {};

    if (updateBirthDto.birthDate !== undefined) {
      updateData.birthDate = new Date(updateBirthDto.birthDate);
    }

    this.addIfDefined(updateData, 'breed', updateBirthDto.breed);
    this.addIfDefined(updateData, 'gender', updateBirthDto.gender);
    this.addIfNotUndefined(updateData, 'motherId', updateBirthDto.motherId);
    this.addIfNotUndefined(updateData, 'fatherId', updateBirthDto.fatherId);
    this.addIfDefined(updateData, 'purity', updateBirthDto.purity);
    this.addIfNotUndefined(
      updateData,
      'observation',
      updateBirthDto.observation,
    );

    const updated = await this.prisma.birth.update({
      where: { id },
      data: updateData,
    });

    return this.transformBirth(updated);
  }

  async remove(userId: string, id: string) {
    const companyId = await this.getUserCompanyId(userId);
    await this.findBirthByIdAndCompany(id, companyId);

    // Soft delete
    await this.prisma.birth.update({
      where: { id },
      data: {
        deletedAt: new Date(),
      },
    });

    return { message: 'Birth record deleted successfully' };
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

  private async findBirthByIdAndCompany(id: string, companyId: string) {
    const birth = await this.prisma.birth.findFirst({
      where: {
        id,
        companyId,
        deletedAt: null,
      },
    });

    if (!birth) {
      throw new NotFoundException('Birth record not found');
    }

    return birth;
  }

  private async findBirthByAnimalId(animalId: string) {
    return this.prisma.birth.findUnique({
      where: {
        animalId,
        deletedAt: null,
      },
    });
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

  private calculatePurity(
    motherBirth: { purity: string | null } | null,
    fatherBirth: { purity: string | null } | null,
    motherBreed?: string,
    fatherBreed?: string,
  ): BirthPurity {
    if (!motherBirth && !fatherBirth) {
      return BirthPurity.PO;
    }

    if (motherBirth && fatherBirth) {
      const result = this.getPurityWhenBothPresent(
        motherBirth,
        fatherBirth,
        motherBreed,
        fatherBreed,
      );
      if (result !== null) {
        return result;
      }
    } else {
      const result = this.getPurityWhenOneMissing(motherBirth, fatherBirth);
      if (result !== null) {
        return result;
      }
    }

    return BirthPurity.F1;
  }

  private getPurityWhenOneMissing(
    motherBirth: { purity: string | null } | null,
    fatherBirth: { purity: string | null } | null,
  ): BirthPurity | null {
    if (!motherBirth && !fatherBirth) {
      return BirthPurity.PO;
    }

    const motherPurity = motherBirth?.purity as BirthPurity | undefined;
    const fatherPurity = fatherBirth?.purity as BirthPurity | undefined;
    const availablePurity = motherPurity ?? fatherPurity;

    if (!availablePurity) return null;

    if (motherPurity && !fatherBirth) {
      return this.getNextPurity(motherPurity);
    }
    if (!motherBirth && fatherPurity) {
      return this.getNextPurity(fatherPurity);
    }

    return null;
  }

  private getPurityWhenBothPresent(
    motherBirth: { purity: string | null },
    fatherBirth: { purity: string | null },
    motherBreed?: string,
    fatherBreed?: string,
  ): BirthPurity | null {
    const motherPurity = motherBirth.purity as BirthPurity | undefined;
    const fatherPurity = fatherBirth.purity as BirthPurity | undefined;

    if (!motherPurity || !fatherPurity) {
      return null;
    }

    if (motherPurity === BirthPurity.PO && fatherPurity === BirthPurity.PO) {
      return this.checkPOPOCombination(motherBreed, fatherBreed);
    }

    if (
      this.checkPOAndFCombination(motherPurity, fatherPurity, BirthPurity.F1)
    ) {
      return BirthPurity.F2;
    }

    if (motherPurity === BirthPurity.F1 && fatherPurity === BirthPurity.F1) {
      return BirthPurity.F2;
    }

    if (
      this.checkPOAndFCombination(motherPurity, fatherPurity, BirthPurity.F2)
    ) {
      return BirthPurity.F3;
    }

    if (
      this.checkPOAndFCombination(motherPurity, fatherPurity, BirthPurity.F3)
    ) {
      return BirthPurity.F4;
    }

    if (
      this.checkPOAndFCombination(motherPurity, fatherPurity, BirthPurity.F4)
    ) {
      return BirthPurity.F5;
    }

    return this.checkPOAndF5OrPCCombination(motherPurity, fatherPurity);
  }

  private checkPOPOCombination(
    motherBreed?: string,
    fatherBreed?: string,
  ): BirthPurity {
    if (motherBreed === fatherBreed) {
      return BirthPurity.PO;
    }
    return BirthPurity.F1;
  }

  private checkPOAndFCombination(
    motherPurity: BirthPurity,
    fatherPurity: BirthPurity,
    fLevel: BirthPurity,
  ): boolean {
    return (
      (motherPurity === BirthPurity.PO && fatherPurity === fLevel) ||
      (motherPurity === fLevel && fatherPurity === BirthPurity.PO)
    );
  }

  private checkPOAndF5OrPCCombination(
    motherPurity: BirthPurity,
    fatherPurity: BirthPurity,
  ): BirthPurity | null {
    if (
      (motherPurity === BirthPurity.PO && fatherPurity === BirthPurity.F5) ||
      (motherPurity === BirthPurity.F5 && fatherPurity === BirthPurity.PO) ||
      motherPurity === BirthPurity.PC ||
      fatherPurity === BirthPurity.PC
    ) {
      return BirthPurity.PC;
    }
    return null;
  }

  private getNextPurity(purity: BirthPurity): BirthPurity | null {
    const PURITY_SEQUENCE: BirthPurity[] = [
      BirthPurity.PO,
      BirthPurity.F1,
      BirthPurity.F2,
      BirthPurity.F3,
      BirthPurity.F4,
      BirthPurity.F5,
      BirthPurity.PC,
    ];
    const index = PURITY_SEQUENCE.indexOf(purity);
    return index >= 0 && index < PURITY_SEQUENCE.length - 1
      ? PURITY_SEQUENCE[index + 1]
      : null;
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

  private transformBirth(birth: {
    id: string;
    animalId: string;
    birthDate: Date;
    breed: string | null;
    gender: string | null;
    motherId: string | null;
    fatherId: string | null;
    purity: string | null;
    observation: string | null;
    companyId: string;
    createdAt: Date;
    updatedAt: Date;
  }) {
    return {
      id: birth.id,
      animalId: birth.animalId,
      birthDate: birth.birthDate,
      breed: birth.breed ?? undefined,
      gender: birth.gender ?? undefined,
      motherId: birth.motherId ?? undefined,
      fatherId: birth.fatherId ?? undefined,
      purity: birth.purity ?? undefined,
      observation: birth.observation ?? undefined,
      companyId: birth.companyId,
      createdAt: birth.createdAt,
      updatedAt: birth.updatedAt,
    };
  }
}
