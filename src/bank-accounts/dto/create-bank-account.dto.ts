import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum, MinLength } from 'class-validator';

export enum BankAccountType {
  CHECKING = 'checking',
  SAVINGS = 'savings',
  INVESTMENT = 'investment',
}

export class CreateBankAccountDto {
  @ApiProperty({
    example: 'Banco do Brasil',
    description: 'Bank name',
  })
  @IsString()
  @MinLength(1, { message: 'Bank name must not be empty' })
  bankName: string;

  @ApiProperty({
    example: '001',
    description: 'Bank code',
  })
  @IsString()
  @MinLength(1, { message: 'Bank code must not be empty' })
  bankCode: string;

  @ApiProperty({
    example: '1234',
    description: 'Branch number',
  })
  @IsString()
  @MinLength(1, { message: 'Branch must not be empty' })
  branch: string;

  @ApiProperty({
    example: '12345-6',
    description: 'Account number',
  })
  @IsString()
  @MinLength(1, { message: 'Account number must not be empty' })
  accountNumber: string;

  @ApiProperty({
    example: 'checking',
    enum: BankAccountType,
    description: 'Account type',
  })
  @IsEnum(BankAccountType, {
    message: 'Account type must be checking, savings, or investment',
  })
  accountType: BankAccountType;

  @ApiProperty({
    example: 'John Doe',
    description: 'Account holder name',
    required: false,
  })
  @IsOptional()
  @IsString()
  accountHolderName?: string;

  @ApiProperty({
    example: 'active',
    enum: ['active', 'inactive'],
    description: 'Status',
    default: 'active',
  })
  @IsOptional()
  @IsEnum(['active', 'inactive'])
  status?: string;
}
