import { Injectable, NotFoundException } from '@nestjs/common';
import { BaseServiceHelper } from '../common/services/base-service.helper';
import { CreateAccountsPayableDto, UpdateAccountsPayableDto } from './dto';

@Injectable()
export class AccountsPayableService extends BaseServiceHelper {
  async create(userId: string, createDto: CreateAccountsPayableDto) {
    const companyId = await this.getUserCompanyId(userId);
    await this.validateCreateDtoRelations(createDto, companyId);

    const accountsPayable = await this.prisma.accountsPayable.create({
      data: {
        companyId,
        amount: createDto.amount,
        dueDate: new Date(createDto.dueDate),
        description: createDto.description ?? null,
        category: createDto.category ?? null,
        paymentMethod: createDto.paymentMethod ?? null,
        status: createDto.status ?? 'unpaid',
        bankAccountId: createDto.bankAccountId ?? null,
        propertyId: createDto.propertyId ?? null,
        supplierId: createDto.supplierId ?? null,
        employeeId: createDto.employeeId ?? null,
        serviceProviderId: createDto.serviceProviderId ?? null,
        paidDate: createDto.paidDate ? new Date(createDto.paidDate) : null,
        paidAmount: createDto.paidAmount ?? null,
        referenceNumber: createDto.referenceNumber ?? null,
        observation: createDto.observation ?? null,
      },
    });

    return this.transformAccountsPayable(accountsPayable);
  }

  async findAll(userId: string) {
    const companyId = await this.getUserCompanyId(userId);

    const accountsPayable = await this.prisma.accountsPayable.findMany({
      where: {
        companyId,
        deletedAt: null,
      },
      orderBy: {
        dueDate: 'asc',
      },
    });

    return accountsPayable.map((ap) => this.transformAccountsPayable(ap));
  }

  async findOne(userId: string, id: string) {
    const companyId = await this.getUserCompanyId(userId);
    const ap = await this.findAccountsPayableByIdAndCompany(id, companyId);
    return this.transformAccountsPayable(ap);
  }

  async update(
    userId: string,
    id: string,
    updateDto: UpdateAccountsPayableDto,
  ) {
    const companyId = await this.getUserCompanyId(userId);
    await this.findAccountsPayableByIdAndCompany(id, companyId);

    // Validate related entities if being updated
    if (updateDto.bankAccountId) {
      await this.validateBankAccountBelongsToCompany(
        updateDto.bankAccountId,
        companyId,
      );
    }
    if (updateDto.propertyId) {
      await this.validatePropertyBelongsToCompany(
        updateDto.propertyId,
        companyId,
      );
    }
    if (updateDto.supplierId) {
      await this.validateSupplierBelongsToCompany(
        updateDto.supplierId,
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

    const updateData = this.buildUpdateData(updateDto);
    const updated = await this.prisma.accountsPayable.update({
      where: { id },
      data: updateData,
    });

    return this.transformAccountsPayable(updated);
  }

  async remove(userId: string, id: string) {
    const companyId = await this.getUserCompanyId(userId);
    await this.findAccountsPayableByIdAndCompany(id, companyId);

    // Soft delete
    await this.prisma.accountsPayable.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  private async findAccountsPayableByIdAndCompany(
    id: string,
    companyId: string,
  ) {
    const ap = await this.prisma.accountsPayable.findFirst({
      where: {
        id,
        companyId,
        deletedAt: null,
      },
    });

    if (!ap) {
      throw new NotFoundException('Accounts payable transaction not found');
    }

    return ap;
  }

  private async validateCreateDtoRelations(
    createDto: CreateAccountsPayableDto,
    companyId: string,
  ): Promise<void> {
    const validations: Promise<void>[] = [];

    if (createDto.bankAccountId) {
      validations.push(
        this.validateBankAccountBelongsToCompany(
          createDto.bankAccountId,
          companyId,
        ),
      );
    }
    if (createDto.propertyId) {
      validations.push(
        this.validatePropertyBelongsToCompany(createDto.propertyId, companyId),
      );
    }
    if (createDto.supplierId) {
      validations.push(
        this.validateSupplierBelongsToCompany(createDto.supplierId, companyId),
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

    await Promise.all(validations);
  }

  private buildUpdateData(
    updateDto: UpdateAccountsPayableDto,
  ): Record<string, unknown> {
    const data: Record<string, unknown> = {};

    this.setFieldIfDefined(data, 'amount', updateDto.amount);
    this.setFieldIfDefined(
      data,
      'dueDate',
      updateDto.dueDate,
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
      'bankAccountId',
      updateDto.bankAccountId,
      (val) => val ?? null,
    );
    this.setFieldIfDefined(
      data,
      'propertyId',
      updateDto.propertyId,
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
    this.setFieldIfDefined(data, 'paidDate', updateDto.paidDate, (val) =>
      val ? new Date(val as string | number | Date) : null,
    );
    this.setFieldIfDefined(
      data,
      'paidAmount',
      updateDto.paidAmount,
      (val) => val ?? null,
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

  private transformAccountsPayable(ap: {
    id: string;
    companyId: string;
    amount: { toNumber(): number } | number;
    dueDate: Date;
    description: string | null;
    category: string | null;
    paymentMethod: string | null;
    status: string;
    bankAccountId: string | null;
    propertyId: string | null;
    supplierId: string | null;
    employeeId: string | null;
    serviceProviderId: string | null;
    paidDate: Date | null;
    paidAmount: { toNumber(): number } | number | null;
    referenceNumber: string | null;
    observation: string | null;
    createdAt: Date;
    updatedAt: Date;
  }) {
    return {
      id: ap.id,
      companyId: ap.companyId,
      amount: this.transformDecimal(ap.amount) ?? 0,
      dueDate: ap.dueDate,
      description: ap.description,
      category: ap.category,
      paymentMethod: ap.paymentMethod,
      status: ap.status,
      bankAccountId: ap.bankAccountId,
      propertyId: ap.propertyId,
      supplierId: ap.supplierId,
      employeeId: ap.employeeId,
      serviceProviderId: ap.serviceProviderId,
      paidDate: ap.paidDate,
      paidAmount: this.transformDecimal(ap.paidAmount),
      referenceNumber: ap.referenceNumber,
      observation: ap.observation,
      createdAt: ap.createdAt,
      updatedAt: ap.updatedAt,
    };
  }
}
