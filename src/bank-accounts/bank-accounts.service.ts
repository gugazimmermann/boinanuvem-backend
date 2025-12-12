import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { BaseServiceHelper } from '../common/services/base-service.helper';
import { CreateBankAccountDto, UpdateBankAccountDto } from './dto';

@Injectable()
export class BankAccountsService extends BaseServiceHelper {
  async create(userId: string, createDto: CreateBankAccountDto) {
    const companyId = await this.getUserCompanyId(userId);

    // Check if account already exists for this company
    const existing = await this.findExistingAccount(
      companyId,
      createDto.bankCode,
      createDto.branch,
      createDto.accountNumber,
    );

    if (existing) {
      throw new ConflictException(
        'Bank account with these details already exists for your company',
      );
    }

    const bankAccount = await this.prisma.bankAccount.create({
      data: {
        companyId,
        bankName: createDto.bankName,
        bankCode: createDto.bankCode,
        branch: createDto.branch,
        accountNumber: createDto.accountNumber,
        accountType: createDto.accountType,
        accountHolderName: createDto.accountHolderName ?? null,
        status: createDto.status ?? 'active',
      },
    });

    return this.transformBankAccount(bankAccount);
  }

  async findAll(userId: string) {
    const companyId = await this.getUserCompanyId(userId);

    const bankAccounts = await this.prisma.bankAccount.findMany({
      where: {
        companyId,
        deletedAt: null,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return bankAccounts.map((ba) => this.transformBankAccount(ba));
  }

  async findOne(userId: string, id: string) {
    const companyId = await this.getUserCompanyId(userId);
    const bankAccount = await this.findBankAccountByIdAndCompany(id, companyId);
    return this.transformBankAccount(bankAccount);
  }

  async update(userId: string, id: string, updateDto: UpdateBankAccountDto) {
    const companyId = await this.getUserCompanyId(userId);
    const existing = await this.findBankAccountByIdAndCompany(id, companyId);

    // If account details are being updated, check for conflicts
    if (
      updateDto.bankCode !== undefined ||
      updateDto.branch !== undefined ||
      updateDto.accountNumber !== undefined
    ) {
      const bankCode = updateDto.bankCode ?? existing.bankCode;
      const branch = updateDto.branch ?? existing.branch;
      const accountNumber = updateDto.accountNumber ?? existing.accountNumber;

      const conflict = await this.findExistingAccount(
        companyId,
        bankCode,
        branch,
        accountNumber,
      );

      if (conflict && conflict.id !== id) {
        throw new ConflictException(
          'Bank account with these details already exists for your company',
        );
      }
    }

    const updateData = this.buildUpdateData(updateDto);
    const updated = await this.prisma.bankAccount.update({
      where: { id },
      data: updateData,
    });

    return this.transformBankAccount(updated);
  }

  async remove(userId: string, id: string) {
    const companyId = await this.getUserCompanyId(userId);
    await this.findBankAccountByIdAndCompany(id, companyId);

    // Soft delete
    await this.prisma.bankAccount.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  private async findBankAccountByIdAndCompany(id: string, companyId: string) {
    const bankAccount = await this.prisma.bankAccount.findFirst({
      where: {
        id,
        companyId,
        deletedAt: null,
      },
    });

    if (!bankAccount) {
      throw new NotFoundException('Bank account not found');
    }

    return bankAccount;
  }

  private async findExistingAccount(
    companyId: string,
    bankCode: string,
    branch: string,
    accountNumber: string,
  ) {
    return this.prisma.bankAccount.findFirst({
      where: {
        companyId,
        bankCode,
        branch,
        accountNumber,
        deletedAt: null,
      },
    });
  }

  private buildUpdateData(
    updateDto: UpdateBankAccountDto,
  ): Record<string, unknown> {
    const data: Record<string, unknown> = {};

    if (updateDto.bankName !== undefined) data.bankName = updateDto.bankName;
    if (updateDto.bankCode !== undefined) data.bankCode = updateDto.bankCode;
    if (updateDto.branch !== undefined) data.branch = updateDto.branch;
    if (updateDto.accountNumber !== undefined)
      data.accountNumber = updateDto.accountNumber;
    if (updateDto.accountType !== undefined)
      data.accountType = updateDto.accountType;
    if (updateDto.accountHolderName !== undefined)
      data.accountHolderName = updateDto.accountHolderName ?? null;
    if (updateDto.status !== undefined) data.status = updateDto.status;

    return data;
  }

  private transformBankAccount(ba: {
    id: string;
    companyId: string;
    bankName: string;
    bankCode: string;
    branch: string;
    accountNumber: string;
    accountType: string;
    accountHolderName: string | null;
    status: string;
    createdAt: Date;
    updatedAt: Date;
  }) {
    return {
      id: ba.id,
      companyId: ba.companyId,
      bankName: ba.bankName,
      bankCode: ba.bankCode,
      branch: ba.branch,
      accountNumber: ba.accountNumber,
      accountType: ba.accountType,
      accountHolderName: ba.accountHolderName,
      status: ba.status,
      createdAt: ba.createdAt,
      updatedAt: ba.updatedAt,
    };
  }
}
