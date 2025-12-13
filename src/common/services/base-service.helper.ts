import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from './prisma.service';

/**
 * Base service helper with common patterns for service classes
 * This class provides reusable methods to reduce code duplication
 */
@Injectable()
export class BaseServiceHelper {
  constructor(protected readonly prisma: PrismaService) {}

  /**
   * Get company ID for a user
   * Common pattern used across all services
   */
  async getUserCompanyId(userId: string): Promise<string> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { companyId: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user.companyId;
  }

  /**
   * Validate that an animal belongs to the company
   */
  async validateAnimalBelongsToCompany(
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
      throw new NotFoundException(
        'Animal not found or does not belong to your company',
      );
    }
  }

  /**
   * Validate that a property belongs to the company
   */
  async validatePropertyBelongsToCompany(
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

  /**
   * Validate that a buyer belongs to the company
   */
  async validateBuyerBelongsToCompany(
    buyerId: string,
    companyId: string,
  ): Promise<void> {
    const buyer = await this.prisma.buyer.findFirst({
      where: {
        id: buyerId,
        companyId,
        deletedAt: null,
      },
      select: { id: true },
    });

    if (!buyer) {
      throw new NotFoundException(
        'Buyer not found or does not belong to your company',
      );
    }
  }

  /**
   * Validate that an employee belongs to the company
   */
  async validateEmployeeBelongsToCompany(
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
      throw new NotFoundException(
        'Employee not found or does not belong to your company',
      );
    }
  }

  /**
   * Validate that multiple employees belong to the company
   */
  async validateEmployeesBelongToCompany(
    employeeIds: string[],
    companyId: string,
  ): Promise<void> {
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

  /**
   * Validate that a service provider belongs to the company
   */
  async validateServiceProviderBelongsToCompany(
    serviceProviderId: string,
    companyId: string,
  ): Promise<void> {
    const serviceProvider = await this.prisma.serviceProvider.findFirst({
      where: {
        id: serviceProviderId,
        companyId,
        deletedAt: null,
      },
      select: { id: true },
    });

    if (!serviceProvider) {
      throw new NotFoundException(
        'Service provider not found or does not belong to your company',
      );
    }
  }

  /**
   * Validate that multiple service providers belong to the company
   */
  async validateServiceProvidersBelongToCompany(
    serviceProviderIds: string[],
    companyId: string,
  ): Promise<void> {
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

  /**
   * Validate that a supplier belongs to the company
   */
  async validateSupplierBelongsToCompany(
    supplierId: string,
    companyId: string,
  ): Promise<void> {
    const supplier = await this.prisma.supplier.findFirst({
      where: {
        id: supplierId,
        companyId,
        deletedAt: null,
      },
      select: { id: true },
    });

    if (!supplier) {
      throw new NotFoundException(
        'Supplier not found or does not belong to your company',
      );
    }
  }

  /**
   * Validate that a bank account belongs to the company
   */
  async validateBankAccountBelongsToCompany(
    bankAccountId: string,
    companyId: string,
  ): Promise<void> {
    const bankAccount = await this.prisma.bankAccount.findFirst({
      where: {
        id: bankAccountId,
        companyId,
        deletedAt: null,
      },
      select: { id: true },
    });

    if (!bankAccount) {
      throw new NotFoundException(
        'Bank account not found or does not belong to your company',
      );
    }
  }

  /**
   * Generic method to find an entity by ID and company with optional include
   * Note: Uses dynamic Prisma model access which requires type assertions
   */
  async findEntityByIdAndCompany<T>(
    model: string,
    id: string,
    companyId: string,
    include?: any,
    errorMessage?: string,
  ): Promise<T> {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    const entity = await (this.prisma as any)[model].findFirst({
      where: {
        id,
        companyId,
        deletedAt: null,
      },
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      ...(include ? { include } : {}),
    });

    if (!entity) {
      throw new NotFoundException(
        errorMessage ?? `${model} not found or does not belong to your company`,
      );
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return entity;
  }

  /**
   * Transform Prisma Decimal to number
   * Handles both Decimal objects and regular numbers
   */
  protected transformDecimal(
    value: { toNumber(): number } | number | null | undefined,
  ): number | undefined {
    if (value === null || value === undefined) {
      return undefined;
    }
    return typeof value === 'object' ? value.toNumber() : value;
  }
}
