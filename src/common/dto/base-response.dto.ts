import { ApiProperty } from '@nestjs/swagger';

/**
 * Base response DTO with common fields present in all response DTOs
 */
export class BaseResponseDto {
  @ApiProperty({ example: '660e8400-e29b-41d4-a716-446655440010' })
  id: string;

  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  companyId: string;

  @ApiProperty({ example: '2025-01-20T00:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2025-01-20T00:00:00.000Z' })
  updatedAt: Date;
}

/**
 * Base transaction response DTO with common transaction fields
 * Extends BaseResponseDto to include transaction-specific fields
 */
export class BaseTransactionResponseDto extends BaseResponseDto {
  @ApiProperty({ example: 1000.0 })
  amount: number;

  @ApiProperty({ example: '2025-02-15' })
  dueDate: Date;

  @ApiProperty({ example: 'Transaction description', required: false })
  description?: string;

  @ApiProperty({ example: 'cattle_sales', required: false })
  category?: string;

  @ApiProperty({ example: 'cash', required: false })
  paymentMethod?: string;

  @ApiProperty({ example: 'unpaid' })
  status: string;

  @ApiProperty({
    example: '660e8400-e29b-41d4-a716-446655440020',
    required: false,
  })
  bankAccountId?: string;

  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440010',
    required: false,
  })
  propertyId?: string;

  @ApiProperty({ example: '2025-01-15', required: false })
  paidDate?: Date;

  @ApiProperty({ example: 500.0, required: false })
  paidAmount?: number;

  @ApiProperty({ example: 'REF001', required: false })
  referenceNumber?: string;

  @ApiProperty({ example: 'Observation notes', required: false })
  observation?: string;
}
