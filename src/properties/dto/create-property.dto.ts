import {
  IsString,
  IsOptional,
  MinLength,
  Matches,
  IsNumber,
  IsObject,
  IsBoolean,
  IsEnum,
  ValidateNested,
  IsArray,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { formatZipCode } from '../../common/utils/format-utils';

enum AreaType {
  HECTARES = 'hectares',
  SQUARE_METERS = 'square_meters',
  SQUARE_FEET = 'square_feet',
  ACRES = 'acres',
  SQUARE_KILOMETERS = 'square_kilometers',
  SQUARE_MILES = 'square_miles',
}

class AreaDto {
  @ApiProperty({ example: 150.5 })
  @IsNumber()
  value: number;

  @ApiProperty({ example: 'hectares', enum: AreaType })
  @IsEnum(AreaType)
  type: AreaType;
}

class PasturePlanningMonthDto {
  @ApiProperty({ example: 'January' })
  @IsString()
  month: string;

  @ApiProperty({ example: 22.34 })
  @IsNumber()
  min: number;

  @ApiProperty({ example: 27.92 })
  @IsNumber()
  max: number;

  @ApiProperty({ example: 207.87 })
  @IsNumber()
  precipitation: number;

  @ApiProperty({
    example: 'Excellent',
    enum: ['Poor', 'Medium', 'Good', 'Excellent'],
  })
  @IsEnum(['Poor', 'Medium', 'Good', 'Excellent'])
  classification: 'Poor' | 'Medium' | 'Good' | 'Excellent';
}

export class CreatePropertyDto {
  @ApiProperty({ example: '001' })
  @IsString()
  @MinLength(1)
  code: string;

  @ApiProperty({ example: 'Fazenda do Juca' })
  @IsString()
  @MinLength(2)
  name: string;

  @ApiProperty({ type: AreaDto })
  @ValidateNested()
  @Type(() => AreaDto)
  @IsObject()
  area: AreaDto;

  @ApiProperty({ example: 'active', enum: ['active', 'inactive'] })
  @IsEnum(['active', 'inactive'])
  status: 'active' | 'inactive';

  @ApiProperty({ example: 'Rua Simão Piaz' })
  @IsString()
  street: string;

  @ApiProperty({ example: 'SN' })
  @IsString()
  number: string;

  @ApiProperty({ example: 'Fazenda do Juca', required: false })
  @IsOptional()
  @IsString()
  complement?: string;

  @ApiProperty({ example: 'LIMOEIRO' })
  @IsString()
  neighborhood: string;

  @ApiProperty({ example: 'São João do Itaperiú' })
  @IsString()
  city: string;

  @ApiProperty({ example: 'SC' })
  @IsString()
  @Matches(/^[A-Z]{2}$/, { message: 'State must be 2 uppercase letters' })
  state: string;

  @ApiProperty({ example: '88395000' })
  @Transform(({ value }: { value: unknown }) =>
    formatZipCode(value as string | null | undefined),
  )
  @IsString()
  @Matches(/^\d{5}-\d{3}$/, { message: 'ZIP code must be in format XXXXX-XXX' })
  zipCode: string;

  @ApiProperty({ example: -26.559317100277863, required: false })
  @IsOptional()
  @IsNumber()
  latitude?: number;

  @ApiProperty({ example: -48.75873810994559, required: false })
  @IsOptional()
  @IsNumber()
  longitude?: number;

  @ApiProperty({ type: [PasturePlanningMonthDto], required: false })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PasturePlanningMonthDto)
  pasturePlanning?: PasturePlanningMonthDto[];

  @ApiProperty({ example: ['April', 'May', 'June'], required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  breedingMonths?: string[];

  @ApiProperty({ example: false, required: false })
  @IsOptional()
  @IsBoolean()
  pasturePlanningModifiedByUser?: boolean;

  @ApiProperty({ example: false, required: false })
  @IsOptional()
  @IsBoolean()
  breedingSeasonModifiedByUser?: boolean;
}
