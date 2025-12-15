import { ApiProperty } from '@nestjs/swagger';

export class InventoryObservationResponseDto {
  @ApiProperty({ example: '660e8400-e29b-41d4-a716-446655440010' })
  id: string;

  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  itemId: string;

  @ApiProperty({ example: 'Item stock is running low, need to reorder soon.' })
  observation: string;

  @ApiProperty({
    example: ['file-id-1', 'file-id-2'],
    required: false,
  })
  fileIds?: string[];

  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  companyId: string;

  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440001',
    required: false,
  })
  createdBy?: string;

  @ApiProperty({ example: '2025-01-20T00:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2025-01-20T00:00:00.000Z' })
  updatedAt: Date;
}
