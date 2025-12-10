import { ApiProperty } from '@nestjs/swagger';

export class AcquisitionItemResponseDto {
  @ApiProperty({ example: '660e8400-e29b-41d4-a716-446655440010' })
  id: string;

  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440020' })
  animalId: string;

  @ApiProperty({ example: 5000.0 })
  price: number;

  @ApiProperty({ example: 350.0 })
  weight: number;

  @ApiProperty({ example: 142.86 })
  costPerArroba: number;

  @ApiProperty({ example: 'nelore', required: false })
  breed?: string;

  @ApiProperty({ example: 'male', required: false })
  gender?: string;

  @ApiProperty({ example: '2020-01-15T00:00:00.000Z', required: false })
  birthDate?: Date;

  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440021',
    required: false,
  })
  motherId?: string;

  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440022',
    required: false,
  })
  fatherId?: string;

  @ApiProperty({ example: 'BR-2019-MJ0001', required: false })
  motherRegistrationNumber?: string;

  @ApiProperty({ example: 'BR-2018-MJ0002', required: false })
  fatherRegistrationNumber?: string;

  @ApiProperty({ example: 'po', required: false })
  purity?: string;

  @ApiProperty({ example: 'Healthy animal', required: false })
  birthObservation?: string;

  @ApiProperty({ example: '2025-01-20T00:00:00.000Z' })
  createdAt: Date;
}

export class AcquisitionResponseDto {
  @ApiProperty({ example: '660e8400-e29b-41d4-a716-446655440010' })
  id: string;

  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  companyId: string;

  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440010' })
  propertyId: string;

  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440030' })
  supplierId: string;

  @ApiProperty({ example: '2020-01-15T00:00:00.000Z' })
  acquisitionDate: Date;

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
  handlingFee?: number;

  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440040',
    required: false,
  })
  linkedCashFlowId?: string;

  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440050',
    required: false,
  })
  linkedAccountsPayableId?: string;

  @ApiProperty({ example: 'Acquisition notes', required: false })
  observation?: string;

  @ApiProperty({ type: [AcquisitionItemResponseDto] })
  acquisitionItems: AcquisitionItemResponseDto[];

  @ApiProperty({ example: '2025-01-20T00:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2025-01-20T00:00:00.000Z' })
  updatedAt: Date;
}
