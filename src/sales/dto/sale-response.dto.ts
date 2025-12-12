import { ApiProperty } from '@nestjs/swagger';
import { BaseResponseDto } from '../../common/dto/base-response.dto';

export class SaleItemResponseDto {
  @ApiProperty({ example: '660e8400-e29b-41d4-a716-446655440010' })
  id: string;

  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440020' })
  animalId: string;

  @ApiProperty({ example: 5000.0 })
  price: number;

  @ApiProperty({ example: 350.0 })
  weight: number;

  @ApiProperty({ example: 280.0, required: false })
  carcassWeight?: number;

  @ApiProperty({ example: '2025-01-20T00:00:00.000Z' })
  createdAt: Date;
}

export class SaleResponseDto extends BaseResponseDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440010' })
  propertyId: string;

  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440040' })
  buyerId: string;

  @ApiProperty({ example: '2020-01-15T00:00:00.000Z' })
  saleDate: Date;

  @ApiProperty({ example: 'slaughterhouse' })
  saleType: string;

  @ApiProperty({ example: 'individual' })
  pricingMode: string;

  @ApiProperty({ example: 'cash_flow' })
  paymentMethod: string;

  @ApiProperty({ example: 50000.0 })
  totalPrice: number;

  @ApiProperty({
    example: [{ id: 'fee-001', name: 'Transportation', amount: 150.0 }],
    required: false,
  })
  fees?: Array<{ id: string; name: string; amount: number }>;

  @ApiProperty({ example: 500.0, required: false })
  transportationFee?: number;

  @ApiProperty({ example: 200.0, required: false })
  additionalFees?: number;

  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440040',
    required: false,
  })
  linkedCashFlowId?: string;

  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440050',
    required: false,
  })
  linkedAccountsReceivableId?: string;

  @ApiProperty({ example: 'Sale notes', required: false })
  observation?: string;

  @ApiProperty({ type: [SaleItemResponseDto] })
  saleItems: SaleItemResponseDto[];
}
