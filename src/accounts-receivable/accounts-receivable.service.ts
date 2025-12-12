import { Injectable, NotFoundException } from '@nestjs/common';
import { BaseServiceHelper } from '../common/services/base-service.helper';
import {
  CreateAccountsReceivableDto,
  UpdateAccountsReceivableDto,
} from './dto';

@Injectable()
export class AccountsReceivableService extends BaseServiceHelper {
  async create(userId: string, createDto: CreateAccountsReceivableDto) {
    const companyId = await this.getUserCompanyId(userId);

    // Validate property if provided
    if (createDto.propertyId) {
      await this.validatePropertyBelongsToCompany(
        createDto.propertyId,
        companyId,
      );
    }

    // Validate buyer if provided
    if (createDto.buyerId) {
      await this.validateBuyerBelongsToCompany(createDto.buyerId, companyId);
    }

    const accountsReceivable = await this.prisma.accountsReceivable.create({
      data: {
        companyId,
        amount: createDto.amount,
        dueDate: new Date(createDto.dueDate),
        description: createDto.description ?? null,
        category: createDto.category ?? null,
        paymentMethod: createDto.paymentMethod ?? null,
        status: createDto.status ?? 'unpaid',
        propertyId: createDto.propertyId ?? null,
        buyerId: createDto.buyerId ?? null,
        paidDate: createDto.paidDate ? new Date(createDto.paidDate) : null,
        paidAmount: createDto.paidAmount ?? null,
        referenceNumber: createDto.referenceNumber ?? null,
        observation: createDto.observation ?? null,
      },
    });

    return this.transformAccountsReceivable(accountsReceivable);
  }

  async findAll(userId: string) {
    const companyId = await this.getUserCompanyId(userId);

    const accountsReceivable = await this.prisma.accountsReceivable.findMany({
      where: {
        companyId,
        deletedAt: null,
      },
      orderBy: {
        dueDate: 'asc',
      },
    });

    return accountsReceivable.map((ar) => this.transformAccountsReceivable(ar));
  }

  async findOne(userId: string, id: string) {
    const companyId = await this.getUserCompanyId(userId);
    const ar = await this.findAccountsReceivableByIdAndCompany(id, companyId);
    return this.transformAccountsReceivable(ar);
  }

  async update(
    userId: string,
    id: string,
    updateDto: UpdateAccountsReceivableDto,
  ) {
    const companyId = await this.getUserCompanyId(userId);
    await this.findAccountsReceivableByIdAndCompany(id, companyId);

    // Validate related entities if being updated
    if (updateDto.propertyId) {
      await this.validatePropertyBelongsToCompany(
        updateDto.propertyId,
        companyId,
      );
    }
    if (updateDto.buyerId) {
      await this.validateBuyerBelongsToCompany(updateDto.buyerId, companyId);
    }

    const updateData = this.buildUpdateData(updateDto);
    const updated = await this.prisma.accountsReceivable.update({
      where: { id },
      data: updateData,
    });

    return this.transformAccountsReceivable(updated);
  }

  async remove(userId: string, id: string) {
    const companyId = await this.getUserCompanyId(userId);
    await this.findAccountsReceivableByIdAndCompany(id, companyId);

    // Soft delete
    await this.prisma.accountsReceivable.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  private async findAccountsReceivableByIdAndCompany(
    id: string,
    companyId: string,
  ) {
    const ar = await this.prisma.accountsReceivable.findFirst({
      where: {
        id,
        companyId,
        deletedAt: null,
      },
    });

    if (!ar) {
      throw new NotFoundException('Accounts receivable transaction not found');
    }

    return ar;
  }

  private buildUpdateData(
    updateDto: UpdateAccountsReceivableDto,
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
      'propertyId',
      updateDto.propertyId,
      (val) => val ?? null,
    );
    this.setFieldIfDefined(
      data,
      'buyerId',
      updateDto.buyerId,
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

  private transformAccountsReceivable(ar: {
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
    buyerId: string | null;
    paidDate: Date | null;
    paidAmount: { toNumber(): number } | number | null;
    referenceNumber: string | null;
    observation: string | null;
    createdAt: Date;
    updatedAt: Date;
  }) {
    return {
      id: ar.id,
      companyId: ar.companyId,
      amount: this.transformDecimal(ar.amount) ?? 0,
      dueDate: ar.dueDate,
      description: ar.description,
      category: ar.category,
      paymentMethod: ar.paymentMethod,
      status: ar.status,
      bankAccountId: ar.bankAccountId,
      propertyId: ar.propertyId,
      buyerId: ar.buyerId,
      paidDate: ar.paidDate,
      paidAmount: this.transformDecimal(ar.paidAmount),
      referenceNumber: ar.referenceNumber,
      observation: ar.observation,
      createdAt: ar.createdAt,
      updatedAt: ar.updatedAt,
    };
  }
}
