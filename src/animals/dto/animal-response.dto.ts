import { ApiProperty } from '@nestjs/swagger';

export class AnimalResponseDto {
  @ApiProperty({ example: '660e8400-e29b-41d4-a716-446655440010' })
  id: string;

  @ApiProperty({ example: '001' })
  code: string;

  @ApiProperty({ example: 'BR-2020-FJ0001' })
  registrationNumber: string;

  @ApiProperty({ example: '2020-01-15', required: false })
  acquisitionDate?: Date;

  @ApiProperty({ example: 'active' })
  status: string;

  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  companyId: string;

  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440010' })
  propertyId: string;

  @ApiProperty({ example: '2025-01-20T00:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2025-01-20T00:00:00.000Z' })
  updatedAt: Date;
}
