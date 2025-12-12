import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsNumber,
  IsDateString,
  Min,
} from 'class-validator';

/**
 * Base transaction create DTO with common transaction fields
 * Used by accounts payable and accounts receivable DTOs
 */
export class BaseTransactionCreateDto {
  @ApiProperty({
    example: 1000.0,
    description: 'Amount',
  })
  @IsNumber()
  @Min(0, { message: 'Amount must be greater than or equal to 0' })
  amount: number;

  @ApiProperty({
    example: '2025-02-15',
    description: 'Due date',
  })
  @IsDateString({}, { message: 'Due date must be a valid date' })
  dueDate: string;

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
    description: 'Category',
    required: false,
  })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiProperty({
    example: 'cash',
    description: 'Payment method',
    required: false,
  })
  @IsOptional()
  @IsString()
  paymentMethod?: string;

  @ApiProperty({
    example: 'unpaid',
    description: 'Status',
    default: 'unpaid',
  })
  @IsOptional()
  @IsString()
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
    example: '2025-01-15',
    description: 'Paid date',
    required: false,
  })
  @IsOptional()
  @IsDateString({}, { message: 'Paid date must be a valid date' })
  paidDate?: string;

  @ApiProperty({
    example: 500.0,
    description: 'Paid amount',
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(0, { message: 'Paid amount must be greater than or equal to 0' })
  paidAmount?: number;

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
