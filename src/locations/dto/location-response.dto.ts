import { ApiProperty } from '@nestjs/swagger';

class AreaResponseDto {
  @ApiProperty({ example: 28.5 })
  value: number;

  @ApiProperty({ example: 'hectares' })
  type: string;
}

export class LocationResponseDto {
  @ApiProperty({ example: '660e8400-e29b-41d4-a716-446655440010' })
  id: string;

  @ApiProperty({ example: '001' })
  code: string;

  @ApiProperty({ example: 'Pasto Norte' })
  name: string;

  @ApiProperty({ example: 'pasture' })
  locationType: string;

  @ApiProperty({ type: AreaResponseDto })
  area: AreaResponseDto;

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
