import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/services/prisma.service';
import { CreateCashFlowDto, UpdateCashFlowDto } from './dto';

@Injectable()
export class CashFlowService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, createDto: CreateCashFlowDto) {
    const companyId = await this.getUserCompanyId(userId);
    await this.validateCreateDtoRelations(createDto, companyId);

    const cashFlow = await this.prisma.cashFlow.create({
      data: {
        companyId,
        type: createDto.type,
        amount: createDto.amount,
        date: new Date(createDto.date),
        description: createDto.description ?? null,
        category: createDto.category ?? null,
        paymentMethod: createDto.paymentMethod ?? null,
        status: createDto.status ?? 'completed',
        propertyId: createDto.propertyId ?? null,
        employeeId: createDto.employeeId ?? null,
        serviceProviderId: createDto.serviceProviderId ?? null,
        supplierId: createDto.supplierId ?? null,
        buyerId: createDto.buyerId ?? null,
        paymentDate: createDto.paymentDate
          ? new Date(createDto.paymentDate)
          : null,
        referenceNumber: createDto.referenceNumber ?? null,
        observation: createDto.observation ?? null,
      },
    });

    return this.transformCashFlow(cashFlow);
  }

  async findAll(userId: string) {
    const companyId = await this.getUserCompanyId(userId);

    const cashFlows = await this.prisma.cashFlow.findMany({
      where: {
        companyId,
        deletedAt: null,
      },
      orderBy: {
        date: 'desc',
      },
    });

    return cashFlows.map((cf) => this.transformCashFlow(cf));
  }

  async findOne(userId: string, id: string) {
    const companyId = await this.getUserCompanyId(userId);
    const cashFlow = await this.findCashFlowByIdAndCompany(id, companyId);
    return this.transformCashFlow(cashFlow);
  }

  async update(userId: string, id: string, updateDto: UpdateCashFlowDto) {
    const companyId = await this.getUserCompanyId(userId);
    await this.findCashFlowByIdAndCompany(id, companyId);

    // Validate related entities if being updated
    if (updateDto.propertyId) {
      await this.validatePropertyBelongsToCompany(
        updateDto.propertyId,
        companyId,
      );
    }
    if (updateDto.employeeId) {
      await this.validateEmployeeBelongsToCompany(
        updateDto.employeeId,
        companyId,
      );
    }
    if (updateDto.serviceProviderId) {
      await this.validateServiceProviderBelongsToCompany(
        updateDto.serviceProviderId,
        companyId,
      );
    }
    if (updateDto.supplierId) {
      await this.validateSupplierBelongsToCompany(
        updateDto.supplierId,
        companyId,
      );
    }
    if (updateDto.buyerId) {
      await this.validateBuyerBelongsToCompany(updateDto.buyerId, companyId);
    }

    const updateData = this.buildUpdateData(updateDto);
    const updated = await this.prisma.cashFlow.update({
      where: { id },
      data: updateData,
    });

    return this.transformCashFlow(updated);
  }

  async remove(userId: string, id: string) {
    const companyId = await this.getUserCompanyId(userId);
    await this.findCashFlowByIdAndCompany(id, companyId);

    // Soft delete
    await this.prisma.cashFlow.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
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

  private async findCashFlowByIdAndCompany(id: string, companyId: string) {
    const cashFlow = await this.prisma.cashFlow.findFirst({
      where: {
        id,
        companyId,
        deletedAt: null,
      },
    });

    if (!cashFlow) {
      throw new NotFoundException('Cash flow transaction not found');
    }

    return cashFlow;
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
    });

    if (!property) {
      throw new NotFoundException(
        'Property not found or does not belong to your company',
      );
    }
  }

  private async validateEmployeeBelongsToCompany(
    employeeId: string,
    companyId: string,
  ) {
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

  private async validateServiceProviderBelongsToCompany(
    serviceProviderId: string,
    companyId: string,
  ) {
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

  private async validateSupplierBelongsToCompany(
    supplierId: string,
    companyId: string,
  ) {
    const supplier = await this.prisma.supplier.findFirst({
      where: {
        id: supplierId,
        companyId,
        deletedAt: null,
      },
    });

    if (!supplier) {
      throw new NotFoundException(
        'Supplier not found or does not belong to your company',
      );
    }
  }

  private async validateBuyerBelongsToCompany(
    buyerId: string,
    companyId: string,
  ) {
    const buyer = await this.prisma.buyer.findFirst({
      where: {
        id: buyerId,
        companyId,
        deletedAt: null,
      },
    });

    if (!buyer) {
      throw new NotFoundException(
        'Buyer not found or does not belong to your company',
      );
    }
  }

  private async validateCreateDtoRelations(
    createDto: CreateCashFlowDto,
    companyId: string,
  ): Promise<void> {
    const validations: Promise<void>[] = [];

    if (createDto.propertyId) {
      validations.push(
        this.validatePropertyBelongsToCompany(createDto.propertyId, companyId),
      );
    }
    if (createDto.employeeId) {
      validations.push(
        this.validateEmployeeBelongsToCompany(createDto.employeeId, companyId),
      );
    }
    if (createDto.serviceProviderId) {
      validations.push(
        this.validateServiceProviderBelongsToCompany(
          createDto.serviceProviderId,
          companyId,
        ),
      );
    }
    if (createDto.supplierId) {
      validations.push(
        this.validateSupplierBelongsToCompany(createDto.supplierId, companyId),
      );
    }
    if (createDto.buyerId) {
      validations.push(
        this.validateBuyerBelongsToCompany(createDto.buyerId, companyId),
      );
    }

    await Promise.all(validations);
  }

  private buildUpdateData(
    updateDto: UpdateCashFlowDto,
  ): Record<string, unknown> {
    const data: Record<string, unknown> = {};

    this.setFieldIfDefined(data, 'type', updateDto.type);
    this.setFieldIfDefined(data, 'amount', updateDto.amount);
    this.setFieldIfDefined(
      data,
      'date',
      updateDto.date,
      (val) => new Date(val as string | number | Date),
    );
    this.setFieldIfDefined(
      data,
      'description',
      updateDto.description,
      (val) => val ?? null,
    );
    this.setFieldIfDefined(
      data,
      'category',
      updateDto.category,
      (val) => val ?? null,
    );
    this.setFieldIfDefined(
      data,
      'paymentMethod',
      updateDto.paymentMethod,
      (val) => val ?? null,
    );
    this.setFieldIfDefined(data, 'status', updateDto.status);
    this.setFieldIfDefined(
      data,
      'propertyId',
      updateDto.propertyId,
      (val) => val ?? null,
    );
    this.setFieldIfDefined(
      data,
      'employeeId',
      updateDto.employeeId,
      (val) => val ?? null,
    );
    this.setFieldIfDefined(
      data,
      'serviceProviderId',
      updateDto.serviceProviderId,
      (val) => val ?? null,
    );
    this.setFieldIfDefined(
      data,
      'supplierId',
      updateDto.supplierId,
      (val) => val ?? null,
    );
    this.setFieldIfDefined(
      data,
      'buyerId',
      updateDto.buyerId,
      (val) => val ?? null,
    );
    this.setFieldIfDefined(data, 'paymentDate', updateDto.paymentDate, (val) =>
      val ? new Date(val as string | number | Date) : null,
    );
    this.setFieldIfDefined(
      data,
      'referenceNumber',
      updateDto.referenceNumber,
      (val) => val ?? null,
    );
    this.setFieldIfDefined(
      data,
      'observation',
      updateDto.observation,
      (val) => val ?? null,
    );

    return data;
  }

  private setFieldIfDefined(
    data: Record<string, unknown>,
    key: string,
    value: unknown,
    transform?: (val: unknown) => unknown,
  ): void {
    if (value !== undefined) {
      data[key] = transform ? transform(value) : value;
    }
  }

  private transformCashFlow(cashFlow: {
    id: string;
    companyId: string;
    type: string;
    amount: { toNumber(): number } | number;
    date: Date;
    description: string | null;
    category: string | null;
    paymentMethod: string | null;
    status: string;
    bankAccountId: string | null;
    propertyId: string | null;
    employeeId: string | null;
    serviceProviderId: string | null;
    supplierId: string | null;
    buyerId: string | null;
    paymentDate: Date | null;
    referenceNumber: string | null;
    observation: string | null;
    createdAt: Date;
    updatedAt: Date;
  }) {
    const amountValue =
      typeof cashFlow.amount === 'object'
        ? cashFlow.amount.toNumber()
        : cashFlow.amount;

    return {
      id: cashFlow.id,
      companyId: cashFlow.companyId,
      type: cashFlow.type,
      amount: amountValue,
      date: cashFlow.date,
      description: cashFlow.description,
      category: cashFlow.category,
      paymentMethod: cashFlow.paymentMethod,
      status: cashFlow.status,
      bankAccountId: cashFlow.bankAccountId,
      propertyId: cashFlow.propertyId,
      employeeId: cashFlow.employeeId,
      serviceProviderId: cashFlow.serviceProviderId,
      supplierId: cashFlow.supplierId,
      buyerId: cashFlow.buyerId,
      paymentDate: cashFlow.paymentDate,
      referenceNumber: cashFlow.referenceNumber,
      observation: cashFlow.observation,
      createdAt: cashFlow.createdAt,
      updatedAt: cashFlow.updatedAt,
    };
  }
}
