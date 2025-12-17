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

  async findAcquisitionForAnimal(userId: string, animalId: string) {
    const companyId = await this.getUserCompanyId(userId);
    await this.findAnimalByIdAndCompany(animalId, companyId);

    const acquisitionItem = await this.findAcquisitionItem(animalId, companyId);
    if (!acquisitionItem) return null;

    return this.transformAcquisition(acquisitionItem.acquisition);
  }

  private async findAcquisitionItem(animalId: string, companyId: string) {
    return this.prisma.acquisitionItem.findFirst({
      where: {
        animalId,
        acquisition: { deletedAt: null, companyId },
      },
      include: {
        acquisition: {
          include: { acquisitionItems: true },
        },
      },
    });
  }

  private transformAcquisition(acq: {
    id: string;
    companyId: string;
    propertyId: string;
    supplierId: string;
    acquisitionDate: Date;
    pricingMode: string;
    paymentMethod: string;
    totalPrice: unknown;
    fees: unknown;
    transportationFee: unknown;
    handlingFee: unknown;
    linkedCashFlowId: string | null;
    linkedAccountsPayableId: string | null;
    observation: string | null;
    acquisitionItems: Array<{
      id: string;
      animalId: string;
      price: unknown;
      weight: unknown;
      costPerArroba: unknown;
      breed: string | null;
      gender: string | null;
      birthDate: Date | null;
      motherId: string | null;
      fatherId: string | null;
      motherRegistrationNumber: string | null;
      fatherRegistrationNumber: string | null;
      purity: string | null;
      birthObservation: string | null;
      createdAt: Date;
    }>;
    createdAt: Date;
    updatedAt: Date;
  }) {
    return {
      id: acq.id,
      companyId: acq.companyId,
      propertyId: acq.propertyId,
      supplierId: acq.supplierId,
      acquisitionDate: acq.acquisitionDate,
      pricingMode: acq.pricingMode,
      paymentMethod: acq.paymentMethod,
      totalPrice: this.toNumber(acq.totalPrice) ?? 0,
      fees:
        (acq.fees as Array<{
          id: string;
          name: string;
          amount: number;
        }> | null) ?? undefined,
      transportationFee: this.toNumber(acq.transportationFee),
      handlingFee: this.toNumber(acq.handlingFee),
      linkedCashFlowId: acq.linkedCashFlowId ?? undefined,
      linkedAccountsPayableId: acq.linkedAccountsPayableId ?? undefined,
      observation: acq.observation ?? undefined,
      acquisitionItems: (acq.acquisitionItems ?? []).map((item) =>
        this.transformAcquisitionItem(item),
      ),
      createdAt: acq.createdAt,
      updatedAt: acq.updatedAt,
    };
  }

  private transformAcquisitionItem(item: {
    id: string;
    animalId: string;
    price: unknown;
    weight: unknown;
    costPerArroba: unknown;
    breed: string | null;
    gender: string | null;
    birthDate: Date | null;
    motherId: string | null;
    fatherId: string | null;
    motherRegistrationNumber: string | null;
    fatherRegistrationNumber: string | null;
    purity: string | null;
    birthObservation: string | null;
    createdAt: Date;
  }) {
    return {
      id: item.id,
      animalId: item.animalId,
      price: this.toNumber(item.price) ?? 0,
      weight: this.toNumber(item.weight) ?? 0,
      costPerArroba: this.toNumber(item.costPerArroba) ?? 0,
      breed: item.breed ?? undefined,
      gender: item.gender ?? undefined,
      birthDate: item.birthDate ?? undefined,
      motherId: item.motherId ?? undefined,
      fatherId: item.fatherId ?? undefined,
      motherRegistrationNumber: item.motherRegistrationNumber ?? undefined,
      fatherRegistrationNumber: item.fatherRegistrationNumber ?? undefined,
      purity: item.purity ?? undefined,
      birthObservation: item.birthObservation ?? undefined,
      createdAt: item.createdAt,
    };
  }

  private toNumber(v: unknown): number | undefined {
    if (v === null || v === undefined) return undefined;
    if (typeof v === 'number') return v;
    if (
      typeof v === 'object' &&
      typeof (v as { toNumber?: unknown }).toNumber === 'function'
    ) {
      return (v as { toNumber(): number }).toNumber();
    }
    if (typeof v === 'string') {
      const n = Number.parseFloat(v);
      return Number.isFinite(n) ? n : undefined;
    }
    if (typeof v === 'bigint') {
      const n = Number.parseFloat(v.toString());
      return Number.isFinite(n) ? n : undefined;
    }
    if (typeof v === 'boolean') {
      return v ? 1 : 0;
    }
    return undefined;
  }

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
