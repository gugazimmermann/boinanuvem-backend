import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsEnum,
  IsNumber,
  IsDateString,
  Min,
} from 'class-validator';

export enum CashFlowType {
  INCOME = 'income',
  EXPENSE = 'expense',
}

export enum CashFlowCategory {
  CATTLE_SALES = 'cattle_sales',
  CATTLE_ACQUISITIONS = 'cattle_acquisitions',
  FEED = 'feed',
  MEDICINES = 'medicines',
  VACCINES = 'vaccines',
  LABOR = 'labor',
  EQUIPMENT = 'equipment',
  MAINTENANCE = 'maintenance',
  TRANSPORTATION = 'transportation',
  UTILITIES = 'utilities',
  TAXES = 'taxes',
  INSURANCE = 'insurance',
  OTHER = 'other',
}

export enum PaymentMethod {
  CASH = 'cash',
  BANK_TRANSFER = 'bank_transfer',
  CHECK = 'check',
  CREDIT_CARD = 'credit_card',
  DEBIT_CARD = 'debit_card',
  PIX = 'pix',
  OTHER = 'other',
}

export class CreateCashFlowDto {
  @ApiProperty({
    example: 'income',
    enum: CashFlowType,
    description: 'Cash flow type',
  })
  @IsEnum(CashFlowType, {
    message: 'Type must be either income or expense',
  })
  type: CashFlowType;

  @ApiProperty({
    example: 1000.0,
    description: 'Amount',
  })
  @IsNumber()
  @Min(0, { message: 'Amount must be greater than or equal to 0' })
  amount: number;

  @ApiProperty({
    example: '2025-01-15',
    description: 'Transaction date',
  })
  @IsDateString({}, { message: 'Date must be a valid date' })
  date: string;

  @ApiProperty({
    example: 'Transaction description',
    description: 'Description',
    required: false,
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    example: 'cattle_sales',
    enum: CashFlowCategory,
    description: 'Category',
    required: false,
  })
  @IsOptional()
  @IsEnum(CashFlowCategory)
  category?: CashFlowCategory;

  @ApiProperty({
    example: 'cash',
    enum: PaymentMethod,
    description: 'Payment method',
    required: false,
  })
  @IsOptional()
  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod;

  @ApiProperty({
    example: 'completed',
    enum: ['completed', 'pending', 'cancelled'],
    description: 'Status',
    default: 'completed',
  })
  @IsOptional()
  @IsEnum(['completed', 'pending', 'cancelled'])
  status?: string;

  @ApiProperty({
    example: '660e8400-e29b-41d4-a716-446655440010',
    description: 'Bank account ID',
    required: false,
  })
  @IsOptional()
  @IsString()
  bankAccountId?: string;

  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440010',
    description: 'Property ID',
    required: false,
  })
  @IsOptional()
  @IsString()
  propertyId?: string;

  @ApiProperty({
    example: '770e8400-e29b-41d4-a716-446655440010',
    description: 'Employee ID',
    required: false,
  })
  @IsOptional()
  @IsString()
  employeeId?: string;

  @ApiProperty({
    example: '880e8400-e29b-41d4-a716-446655440010',
    description: 'Service provider ID',
    required: false,
  })
  @IsOptional()
  @IsString()
  serviceProviderId?: string;

  @ApiProperty({
    example: '990e8400-e29b-41d4-a716-446655440010',
    description: 'Supplier ID',
    required: false,
  })
  @IsOptional()
  @IsString()
  supplierId?: string;

  @ApiProperty({
    example: 'aa0e8400-e29b-41d4-a716-446655440010',
    description: 'Buyer ID',
    required: false,
  })
  @IsOptional()
  @IsString()
  buyerId?: string;

  @ApiProperty({
    example: '2025-01-15',
    description: 'Payment date',
    required: false,
  })
  @IsOptional()
  @IsDateString({}, { message: 'Payment date must be a valid date' })
  paymentDate?: string;

  @ApiProperty({
    example: 'REF001',
    description: 'Reference number',
    required: false,
  })
  @IsOptional()
  @IsString()
  referenceNumber?: string;

  @ApiProperty({
    example: 'Observation notes',
    description: 'Observation',
    required: false,
  })
  @IsOptional()
  @IsString()
  observation?: string;
}
