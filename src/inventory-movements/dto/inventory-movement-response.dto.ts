import { ApiProperty } from '@nestjs/swagger';

export class InventoryMovementResponseDto {
  @ApiProperty({ example: '660e8400-e29b-41d4-a716-446655440010' })
  id: string;

  @ApiProperty({ example: '660e8400-e29b-41d4-a716-446655440020' })
  itemId: string;

  @ApiProperty({ example: 'purchase' })
  type: string;

  @ApiProperty({ example: 100 })
  quantity: number;

  @ApiProperty({ example: 2.5, required: false })
  unitPrice?: number;

  @ApiProperty({ example: '2025-01-15' })
  date: Date;

  @ApiProperty({ example: 'Purchase of feed', required: false })
  description?: string;

  @ApiProperty({
    example: '990e8400-e29b-41d4-a716-446655440010',
    required: false,
  })
  supplierId?: string;

  @ApiProperty({
    example: 'aa0e8400-e29b-41d4-a716-446655440010',
    required: false,
  })
  cashFlowId?: string;

  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440010' })
  propertyId: string;

  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  companyId: string;

  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440020',
    required: false,
  })
  locationId?: string;

  @ApiProperty({ example: '2025-12-31', required: false })
  expirationDate?: Date;

  @ApiProperty({
    example: ['770e8400-e29b-41d4-a716-446655440010'],
    type: [String],
    required: false,
  })
  employeeIds?: string[];

  @ApiProperty({
    example: ['880e8400-e29b-41d4-a716-446655440010'],
    type: [String],
    required: false,
  })
  serviceProviderIds?: string[];

  @ApiProperty({ example: 'Additional notes', required: false })
  observation?: string;

  @ApiProperty({
    example: ['file-id-1', 'file-id-2'],
    type: [String],
    required: false,
  })
  fileIds?: string[];

  @ApiProperty({ example: '2025-01-20T00:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2025-01-20T00:00:00.000Z', required: false })
  updatedAt?: Date;
}
