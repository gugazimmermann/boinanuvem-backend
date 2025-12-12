import { ApiProperty } from '@nestjs/swagger';

export class InventoryItemResponseDto {
  @ApiProperty({ example: '660e8400-e29b-41d4-a716-446655440010' })
  id: string;

  @ApiProperty({ example: 'RAC001' })
  code: string;

  @ApiProperty({ example: 'Ração Premium para Gado' })
  name: string;

  @ApiProperty({
    example: 'Ração balanceada com alto teor proteico',
    required: false,
  })
  description?: string;

  @ApiProperty({ example: 'feed' })
  category: string;

  @ApiProperty({ example: 'Custom Category Name', required: false })
  customCategory?: string;

  @ApiProperty({ example: 'kg' })
  unit: string;

  @ApiProperty({ example: 500 })
  minimumStock: number;

  @ApiProperty({ example: 2.5, required: false })
  unitPrice?: number;

  @ApiProperty({
    example: '990e8400-e29b-41d4-a716-446655440010',
    required: false,
  })
  supplierId?: string;

  @ApiProperty({ example: false })
  hasExpiration: boolean;

  @ApiProperty({ example: '2025-12-31', required: false })
  expirationDate?: Date;

  @ApiProperty({ example: 1, required: false })
  usageAmount?: number;

  @ApiProperty({ example: 'dose', required: false })
  usageUnit?: string;

  @ApiProperty({ example: 'per_animal', required: false })
  usageBasis?: string;

  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  companyId: string;

  @ApiProperty({
    example: ['550e8400-e29b-41d4-a716-446655440010'],
    type: [String],
  })
  propertyIds: string[];

  @ApiProperty({ example: '2025-01-20T00:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2025-01-20T00:00:00.000Z', required: false })
  updatedAt?: Date;
}
