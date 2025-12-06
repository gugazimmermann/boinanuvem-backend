import { ApiProperty } from '@nestjs/swagger';

class AreaResponseDto {
  @ApiProperty({ example: 150.5 })
  value: number;

  @ApiProperty({ example: 'hectares' })
  type: string;
}

class PasturePlanningMonthResponseDto {
  @ApiProperty({ example: 'January' })
  month: string;

  @ApiProperty({ example: 22.34 })
  min: number;

  @ApiProperty({ example: 27.92 })
  max: number;

  @ApiProperty({ example: 207.87 })
  precipitation: number;

  @ApiProperty({ example: 'Excellent' })
  classification: string;
}

export class PropertyResponseDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440010' })
  id: string;

  @ApiProperty({ example: '001' })
  code: string;

  @ApiProperty({ example: 'Fazenda do Juca' })
  name: string;

  @ApiProperty({ type: AreaResponseDto })
  area: AreaResponseDto;

  @ApiProperty({ example: 'active' })
  status: string;

  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  companyId: string;

  @ApiProperty({ example: 'Rua Simão Piaz' })
  street: string;

  @ApiProperty({ example: 'SN' })
  number: string;

  @ApiProperty({ example: 'Fazenda do Juca', required: false })
  complement?: string;

  @ApiProperty({ example: 'LIMOEIRO' })
  neighborhood: string;

  @ApiProperty({ example: 'São João do Itaperiú' })
  city: string;

  @ApiProperty({ example: 'SC' })
  state: string;

  @ApiProperty({ example: '88395-000' })
  zipCode: string;

  @ApiProperty({ example: -26.559317100277863, required: false })
  latitude?: number;

  @ApiProperty({ example: -48.75873810994559, required: false })
  longitude?: number;

  @ApiProperty({ type: [PasturePlanningMonthResponseDto], required: false })
  pasturePlanning?: PasturePlanningMonthResponseDto[];

  @ApiProperty({ example: ['April', 'May', 'June'], required: false })
  breedingMonths?: string[];

  @ApiProperty({ example: false })
  pasturePlanningModifiedByUser: boolean;

  @ApiProperty({ example: false })
  breedingSeasonModifiedByUser: boolean;

  @ApiProperty({ example: '2025-01-15T00:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2025-01-15T00:00:00.000Z' })
  updatedAt: Date;
}
