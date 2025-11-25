import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsIn } from 'class-validator';

export class GetPlansQueryDto {
  @ApiProperty({
    description: 'Filter plans by status',
    enum: ['active', 'inactive', 'all'],
    default: 'active',
    required: false,
  })
  @IsOptional()
  @IsString()
  @IsIn(['active', 'inactive', 'all'])
  status?: 'active' | 'inactive' | 'all' = 'active';
}

export class PlanLimitsDto {
  @ApiProperty({ example: '1 Propriedade' })
  properties!: string;

  @ApiProperty({ example: '10 Localizações' })
  locations!: string;

  @ApiProperty({ example: '50 Animais' })
  animals!: string;

  @ApiProperty({ example: '2 Membros' })
  members!: string;
}

export class PlanResponseDto {
  @ApiProperty({ example: 'cuid123' })
  id!: string;

  @ApiProperty({ example: 'Básico' })
  name!: string;

  @ApiProperty({ example: 'Plano ideal para pequenas propriedades.' })
  description!: string;

  @ApiProperty({ example: 'R$ 99,00' })
  monthlyPrice!: string;

  @ApiProperty({ example: 'R$ 950,00' })
  annualPrice!: string;

  @ApiProperty({ type: PlanLimitsDto })
  limits!: PlanLimitsDto;

  @ApiProperty({
    example: ['Gestão de Animais', 'Controle de Localização'],
    type: [String],
  })
  features!: string[];

  @ApiProperty({ example: false })
  popular!: boolean;

  @ApiProperty({ example: 'active', enum: ['active', 'inactive'] })
  status!: string;

  @ApiProperty({ example: '2025-11-25T22:00:00.000Z' })
  createdAt!: Date;

  @ApiProperty({ example: '2025-11-25T22:00:00.000Z' })
  updatedAt!: Date;
}
