import { ApiProperty } from '@nestjs/swagger';

export class WeighingResponseDto {
  @ApiProperty({ example: '660e8400-e29b-41d4-a716-446655440010' })
  id: string;

  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440020' })
  animalId: string;

  @ApiProperty({ example: '2020-01-15T00:00:00.000Z' })
  weighingDate: Date;

  @ApiProperty({ example: 350.0 })
  weight: number;

  @ApiProperty({
    example: ['550e8400-e29b-41d4-a716-446655440050'],
    type: [String],
  })
  employeeIds: string[];

  @ApiProperty({
    example: ['550e8400-e29b-41d4-a716-446655440060'],
    type: [String],
    required: false,
  })
  serviceProviderIds?: string[];

  @ApiProperty({
    example: [
      {
        itemId: 'medicine-001',
        quantity: 10,
        calculatedDosage: 5.5,
      },
    ],
    required: false,
  })
  appliedMedicines?: Array<{
    itemId: string;
    quantity: number;
    calculatedDosage: number;
  }>;

  @ApiProperty({ example: 'Weighing notes', required: false })
  observation?: string;

  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  companyId: string;

  @ApiProperty({ example: '2025-01-20T00:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2025-01-20T00:00:00.000Z' })
  updatedAt: Date;
}
