import { ApiProperty } from '@nestjs/swagger';
import { BaseResponseDto } from '../../common/dto/base-response.dto';

export class CashFlowResponseDto extends BaseResponseDto {
  @ApiProperty({ example: 'income' })
  type: string;

  @ApiProperty({ example: 1000.0 })
  amount: number;

  @ApiProperty({ example: '2025-01-15' })
  date: Date;

  @ApiProperty({ example: 'Transaction description', required: false })
  description?: string;

  @ApiProperty({ example: 'cattle_sales', required: false })
  category?: string;

  @ApiProperty({ example: 'cash', required: false })
  paymentMethod?: string;

  @ApiProperty({ example: 'completed' })
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

  @ApiProperty({
    example: '770e8400-e29b-41d4-a716-446655440010',
    required: false,
  })
  employeeId?: string;

  @ApiProperty({
    example: '880e8400-e29b-41d4-a716-446655440010',
    required: false,
  })
  serviceProviderId?: string;

  @ApiProperty({
    example: '990e8400-e29b-41d4-a716-446655440010',
    required: false,
  })
  supplierId?: string;

  @ApiProperty({
    example: 'aa0e8400-e29b-41d4-a716-446655440010',
    required: false,
  })
  buyerId?: string;

  @ApiProperty({ example: '2025-01-15', required: false })
  paymentDate?: Date;

  @ApiProperty({ example: 'REF001', required: false })
  referenceNumber?: string;

  @ApiProperty({ example: 'Observation notes', required: false })
  observation?: string;
}
