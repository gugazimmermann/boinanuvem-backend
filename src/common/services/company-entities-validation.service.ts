import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Injectable()
export class CompanyEntitiesValidationService {
  constructor(private readonly prisma: PrismaService) {}

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
    });

    if (!property) {
      throw new NotFoundException(
        'Property not found or does not belong to your company',
      );
    }
  }

  async validateLocationBelongsToCompany(
    locationId: string,
    companyId: string,
  ): Promise<void> {
    const location = await this.prisma.location.findFirst({
      where: {
        id: locationId,
        companyId,
        deletedAt: null,
      },
    });

    if (!location) {
      throw new NotFoundException(
        'Location not found or does not belong to your company',
      );
    }
  }

  async validateLocationBelongsToCompanyAndProperty(
    locationId: string,
    propertyId: string,
    companyId: string,
  ): Promise<void> {
    const location = await this.prisma.location.findFirst({
      where: {
        id: locationId,
        propertyId,
        companyId,
        deletedAt: null,
      },
    });

    if (!location) {
      throw new NotFoundException(
        'Location not found, does not belong to your company, or does not belong to the specified property',
      );
    }
  }

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
    });

    if (!employee) {
      throw new NotFoundException(
        'Employee not found or does not belong to your company',
      );
    }
  }

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
    });

    if (!serviceProvider) {
      throw new NotFoundException(
        'Service provider not found or does not belong to your company',
      );
    }
  }
}
