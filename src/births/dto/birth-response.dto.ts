import { ApiProperty } from '@nestjs/swagger';

export class BirthResponseDto {
  @ApiProperty({ example: '660e8400-e29b-41d4-a716-446655440010' })
  id: string;

  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440020' })
  animalId: string;

  @ApiProperty({ example: '2020-01-15T00:00:00.000Z' })
  birthDate: Date;

  @ApiProperty({ example: 'nelore', required: false })
  breed?: string;

  @ApiProperty({ example: 'male', required: false })
  gender?: string;

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

  @ApiProperty({ example: 'po', required: false })
  purity?: string;

  @ApiProperty({ example: 'Healthy birth', required: false })
  observation?: string;

  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  companyId: string;

  @ApiProperty({ example: '2025-01-20T00:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2025-01-20T00:00:00.000Z' })
  updatedAt: Date;
}
