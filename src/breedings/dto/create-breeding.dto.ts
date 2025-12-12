import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsInt,
  Min,
} from 'class-validator';
import { BaseAnimalActivityCreateDto } from '../../common/dto/base-animal-activity.dto';

export enum BreedingMethod {
  NATURAL = 'natural',
  ARTIFICIAL_INSEMINATION = 'artificial_insemination',
}

export class CreateBreedingDto extends BaseAnimalActivityCreateDto {
  @ApiProperty({
    example: 'natural',
    enum: BreedingMethod,
    description: 'Breeding method',
  })
  @IsEnum(BreedingMethod, {
    message: 'Method must be either natural or artificial_insemination',
  })
  method: BreedingMethod;

  @ApiProperty({
    example: '660e8400-e29b-41d4-a716-446655440020',
    description: 'Bull ID (for natural breeding)',
    required: false,
  })
  @IsOptional()
  @IsString()
  bullId?: string;

  @ApiProperty({
    example: 1,
    description: 'Attempt number (for artificial insemination)',
    required: false,
  })
  @IsOptional()
  @IsInt()
  @Min(1, { message: 'Attempt number must be at least 1' })
  attemptNumber?: number;

  @ApiProperty({
    example: 'SEM001',
    description: 'Semen code (for artificial insemination)',
    required: false,
  })
  @IsOptional()
  @IsString()
  semenCode?: string;

  @ApiProperty({
    example: false,
    description: 'Whether the breeding is confirmed',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  confirmed?: boolean;
}
