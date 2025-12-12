import { ApiProperty } from '@nestjs/swagger';

export class DeathResponseDto {
  @ApiProperty({ example: '660e8400-e29b-41d4-a716-446655440010' })
  id: string;

  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440020' })
  animalId: string;

  @ApiProperty({ example: '2020-01-15T00:00:00.000Z' })
  deathDate: Date;

  @ApiProperty({ example: 'Disease' })
  cause: string;

  @ApiProperty({ example: 'Death notes', required: false })
  observation?: string;

  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  companyId: string;

  @ApiProperty({ example: '2025-01-20T00:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2025-01-20T00:00:00.000Z' })
  updatedAt: Date;
}
