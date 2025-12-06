import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../common/services/prisma.service';
import { CreateEmployeeDto, UpdateEmployeeDto } from './dto';

@Injectable()
export class EmployeesService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, createEmployeeDto: CreateEmployeeDto) {
    const companyId = await this.getUserCompanyId(userId);

    // Validate all properties belong to company
    await this.validatePropertiesBelongToCompany(
      createEmployeeDto.propertyIds,
      companyId,
    );

    // Check if employee code already exists for this company (excluding soft-deleted)
    const existingEmployee = await this.prisma.employee.findFirst({
      where: {
        companyId,
        code: createEmployeeDto.code,
        deletedAt: null,
      },
    });

    if (existingEmployee) {
      throw new ConflictException(
        'Employee with this code already exists for your company',
      );
    }

    const employee = await this.prisma.employee.create({
      data: {
        code: createEmployeeDto.code,
        name: createEmployeeDto.name,
        cpf: createEmployeeDto.cpf ?? null,
        email: createEmployeeDto.email ?? null,
        phone: createEmployeeDto.phone ?? null,
        status: createEmployeeDto.status,
        companyId,
        street: createEmployeeDto.street ?? null,
        number: createEmployeeDto.number ?? null,
        complement: createEmployeeDto.complement ?? null,
        neighborhood: createEmployeeDto.neighborhood ?? null,
        city: createEmployeeDto.city ?? null,
        state: createEmployeeDto.state ?? null,
        zipCode: createEmployeeDto.zipCode ?? null,
        properties: {
          create: createEmployeeDto.propertyIds.map((propertyId) => ({
            propertyId,
          })),
        },
      },
      include: {
        properties: {
          select: {
            propertyId: true,
          },
        },
      },
    });

    return this.transformEmployee(employee);
  }

  async findAll(userId: string) {
    const companyId = await this.getUserCompanyId(userId);

    const employees = await this.prisma.employee.findMany({
      where: {
        companyId,
        deletedAt: null,
      },
      include: {
        properties: {
          select: {
            propertyId: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return employees.map((employee) => this.transformEmployee(employee));
  }

  async findOne(userId: string, id: string) {
    const companyId = await this.getUserCompanyId(userId);
    const employee = await this.findEmployeeByIdAndCompany(id, companyId);
    return this.transformEmployee(employee);
  }

  async update(
    userId: string,
    id: string,
    updateEmployeeDto: UpdateEmployeeDto,
  ) {
    const companyId = await this.getUserCompanyId(userId);
    const existingEmployee = await this.findEmployeeByIdAndCompany(
      id,
      companyId,
    );

    // If code is being updated, check for conflicts
    if (
      updateEmployeeDto.code &&
      updateEmployeeDto.code !== existingEmployee.code
    ) {
      await this.validateCodeConflict(
        companyId,
        id,
        updateEmployeeDto.code,
        existingEmployee.code,
      );
    }

    // If propertyIds are being updated, validate them
    if (updateEmployeeDto.propertyIds) {
      await this.validatePropertiesBelongToCompany(
        updateEmployeeDto.propertyIds,
        companyId,
      );
    }

    const updateData = this.buildUpdateData(updateEmployeeDto);

    // Update employee
    const updatedEmployee = await this.prisma.employee.update({
      where: { id },
      data: updateData,
      include: {
        properties: {
          select: {
            propertyId: true,
          },
        },
      },
    });

    // Sync property relations if propertyIds were provided
    if (updateEmployeeDto.propertyIds) {
      await this.syncPropertyRelations(id, updateEmployeeDto.propertyIds);
      // Re-fetch to get updated relations
      const employeeWithRelations = await this.prisma.employee.findUnique({
        where: { id },
        include: {
          properties: {
            select: {
              propertyId: true,
            },
          },
        },
      });
      return this.transformEmployee(employeeWithRelations!);
    }

    return this.transformEmployee(updatedEmployee);
  }

  async remove(userId: string, id: string) {
    const companyId = await this.getUserCompanyId(userId);
    await this.findEmployeeByIdAndCompany(id, companyId);

    // Soft delete by setting deletedAt timestamp
    // Junction table records will be cascade deleted
    await this.prisma.employee.update({
      where: { id },
      data: {
        deletedAt: new Date(),
      },
    });

    return { message: 'Employee deleted successfully' };
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

  private async findEmployeeByIdAndCompany(id: string, companyId: string) {
    const employee = await this.prisma.employee.findFirst({
      where: {
        id,
        companyId,
        deletedAt: null,
      },
      include: {
        properties: {
          select: {
            propertyId: true,
          },
        },
      },
    });

    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    return employee;
  }

  private async validateCodeConflict(
    companyId: string,
    employeeId: string,
    newCode: string,
    currentCode: string,
  ): Promise<void> {
    if (!newCode || newCode === currentCode) {
      return;
    }

    const codeConflict = await this.prisma.employee.findFirst({
      where: {
        companyId,
        code: newCode,
        deletedAt: null,
        NOT: { id: employeeId },
      },
    });

    if (codeConflict) {
      throw new ConflictException(
        'Employee with this code already exists for your company',
      );
    }
  }

  private async validatePropertiesBelongToCompany(
    propertyIds: string[],
    companyId: string,
  ): Promise<void> {
    if (!propertyIds || propertyIds.length === 0) {
      throw new BadRequestException('At least one property must be selected');
    }

    const properties = await this.prisma.property.findMany({
      where: {
        id: { in: propertyIds },
        companyId,
        deletedAt: null,
      },
      select: { id: true },
    });

    if (properties.length !== propertyIds.length) {
      throw new NotFoundException(
        'One or more properties not found or do not belong to your company',
      );
    }
  }

  private async syncPropertyRelations(
    employeeId: string,
    propertyIds: string[],
  ): Promise<void> {
    // Delete existing relations
    await this.prisma.employeeProperty.deleteMany({
      where: { employeeId },
    });

    // Create new relations
    if (propertyIds.length > 0) {
      await this.prisma.employeeProperty.createMany({
        data: propertyIds.map((propertyId) => ({
          employeeId,
          propertyId,
        })),
      });
    }
  }

  private buildUpdateData(updateEmployeeDto: UpdateEmployeeDto) {
    const data: Record<string, unknown> = {};

    this.addIfDefined(data, 'code', updateEmployeeDto.code);
    this.addIfDefined(data, 'name', updateEmployeeDto.name);
    this.addIfDefined(data, 'status', updateEmployeeDto.status);
    this.addIfNotUndefined(data, 'cpf', updateEmployeeDto.cpf);
    this.addIfNotUndefined(data, 'email', updateEmployeeDto.email);
    this.addIfNotUndefined(data, 'phone', updateEmployeeDto.phone);
    this.addIfNotUndefined(data, 'street', updateEmployeeDto.street);
    this.addIfNotUndefined(data, 'number', updateEmployeeDto.number);
    this.addIfNotUndefined(data, 'complement', updateEmployeeDto.complement);
    this.addIfNotUndefined(
      data,
      'neighborhood',
      updateEmployeeDto.neighborhood,
    );
    this.addIfNotUndefined(data, 'city', updateEmployeeDto.city);
    this.addIfNotUndefined(data, 'state', updateEmployeeDto.state);
    this.addIfNotUndefined(data, 'zipCode', updateEmployeeDto.zipCode);

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

  private addIfNotUndefined(
    data: Record<string, unknown>,
    key: string,
    value: unknown,
  ): void {
    if (value !== undefined) {
      data[key] = value ?? null;
    }
  }

  private transformEmployee(employee: {
    id: string;
    code: string;
    name: string;
    cpf: string | null;
    email: string | null;
    phone: string | null;
    status: string;
    companyId: string;
    street: string | null;
    number: string | null;
    complement: string | null;
    neighborhood: string | null;
    city: string | null;
    state: string | null;
    zipCode: string | null;
    createdAt: Date;
    updatedAt: Date;
    properties: { propertyId: string }[];
  }) {
    return {
      id: employee.id,
      code: employee.code,
      name: employee.name,
      cpf: employee.cpf ?? undefined,
      email: employee.email ?? undefined,
      phone: employee.phone ?? undefined,
      status: employee.status,
      companyId: employee.companyId,
      propertyIds: employee.properties.map((p) => p.propertyId),
      street: employee.street ?? undefined,
      number: employee.number ?? undefined,
      complement: employee.complement ?? undefined,
      neighborhood: employee.neighborhood ?? undefined,
      city: employee.city ?? undefined,
      state: employee.state ?? undefined,
      zipCode: employee.zipCode ?? undefined,
      createdAt: employee.createdAt,
      updatedAt: employee.updatedAt,
    };
  }
}
