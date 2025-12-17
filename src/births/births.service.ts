import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../common/services/prisma.service';
import {
  CreateBirthDto,
  UpdateBirthDto,
  BirthPurity,
  AnimalBreed,
} from './dto';

@Injectable()
export class BirthsService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, createBirthDto: CreateBirthDto) {
    const companyId = await this.getUserCompanyId(userId);

    await this.validatePropertyBelongsToCompany(
      createBirthDto.propertyId,
      companyId,
    );

    const parentData = await this.processParentAnimals(
      createBirthDto.motherId,
      createBirthDto.fatherId,
      companyId,
    );

    const purity = this.calculatePurity(
      parentData.motherBirth,
      parentData.fatherBirth,
      parentData.motherBreed,
      parentData.fatherBreed,
    );

    const breed = this.calculateBreed(
      createBirthDto.breed,
      purity,
      parentData.motherBreed,
      parentData.fatherBreed,
    );

    await this.validateAnimalCodeNotExists(companyId, createBirthDto.code);

    const result = await this.createAnimalAndBirth(
      createBirthDto,
      companyId,
      breed,
      purity,
    );

    return this.transformBirth(result);
  }

  private async validateAnimalCodeNotExists(
    companyId: string,
    code: string,
  ): Promise<void> {
    const existingAnimal = await this.prisma.animal.findFirst({
      where: {
        companyId,
        code,
        deletedAt: null,
      },
    });

    if (existingAnimal) {
      throw new ConflictException(
        'Animal with this code already exists for your company',
      );
    }
  }

  private calculateBreed(
    providedBreed: AnimalBreed | undefined,
    purity: BirthPurity,
    motherBreed?: string,
    fatherBreed?: string,
  ): AnimalBreed | undefined {
    if (providedBreed) {
      return providedBreed;
    }

    if (
      purity === BirthPurity.F1 &&
      motherBreed &&
      fatherBreed &&
      motherBreed !== fatherBreed
    ) {
      return undefined; // F1 crossbreed has no specific breed
    }

    const calculatedBreed = fatherBreed ?? motherBreed;
    return calculatedBreed ? (calculatedBreed as AnimalBreed) : undefined;
  }

  private async createAnimalAndBirth(
    createBirthDto: CreateBirthDto,
    companyId: string,
    breed: AnimalBreed | undefined,
    purity: BirthPurity,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const animal = await tx.animal.create({
        data: {
          code: createBirthDto.code,
          registrationNumber: createBirthDto.registrationNumber,
          acquisitionDate: null,
          status: 'active',
          companyId,
          propertyId: createBirthDto.propertyId,
        },
      });

      const birth = await tx.birth.create({
        data: {
          animalId: animal.id,
          birthDate: new Date(createBirthDto.birthDate),
          breed: breed ?? null,
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

  private async processParentAnimals(
    motherId: string | undefined,
    fatherId: string | undefined,
    companyId: string,
  ): Promise<{
    motherBirth: { purity: string | null; breed: string | null } | null;
    fatherBirth: { purity: string | null; breed: string | null } | null;
    motherBreed: string | undefined;
    fatherBreed: string | undefined;
  }> {
    const [motherData, fatherData] = await Promise.all([
      motherId
        ? this.processParentAnimal(motherId, companyId)
        : Promise.resolve(null),
      fatherId
        ? this.processParentAnimal(fatherId, companyId)
        : Promise.resolve(null),
    ]);

    return {
      motherBirth: motherData?.birth ?? null,
      fatherBirth: fatherData?.birth ?? null,
      motherBreed: motherData?.breed,
      fatherBreed: fatherData?.breed,
    };
  }

  private async processParentAnimal(
    animalId: string,
    companyId: string,
  ): Promise<{
    birth: { purity: string | null; breed: string | null } | null;
    breed: string | undefined;
  } | null> {
    await this.validateAnimalBelongsToCompany(animalId, companyId);

    const birth = await this.findBirthByAnimalId(animalId);
    if (birth) {
      return {
        birth,
        breed: birth.breed ?? undefined,
      };
    }

    const acquisitionItem = await this.findAcquisitionItemByAnimalId(animalId);
    if (acquisitionItem) {
      return {
        birth: {
          purity: acquisitionItem.purity ?? 'po',
          breed: acquisitionItem.breed,
        },
        breed: acquisitionItem.breed ?? undefined,
      };
    }

    return null;
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

  private async findAcquisitionItemByAnimalId(animalId: string) {
    return this.prisma.acquisitionItem.findUnique({
      where: {
        animalId,
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
    // Se ambas as raças são undefined, não há informação de cruzamento
    if (!motherBreed && !fatherBreed) {
      return BirthPurity.PO;
    }

    // Se apenas uma raça está disponível, considera como PO (raça pura conhecida)
    if (!motherBreed || !fatherBreed) {
      return BirthPurity.PO;
    }

    // Normalize breeds for comparison (lowercase and trim)
    const normalizedMotherBreed = motherBreed.toLowerCase().trim();
    const normalizedFatherBreed = fatherBreed.toLowerCase().trim();

    // Se ambas as raças estão disponíveis e são iguais, é PO
    if (normalizedMotherBreed === normalizedFatherBreed) {
      return BirthPurity.PO;
    }

    // Se ambas as raças estão disponíveis e são diferentes, é F1 (cruzamento)
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
