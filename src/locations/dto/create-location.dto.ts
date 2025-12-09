import {
  IsString,
  MinLength,
  IsNumber,
  IsObject,
  IsEnum,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

enum AreaType {
  HECTARES = 'hectares',
  SQUARE_METERS = 'square_meters',
  SQUARE_FEET = 'square_feet',
  ACRES = 'acres',
  SQUARE_KILOMETERS = 'square_kilometers',
  SQUARE_MILES = 'square_miles',
}

enum LocationType {
  PASTURE = 'pasture',
  BARN = 'barn',
  STORAGE = 'storage',
  CORRAL = 'corral',
  SILO = 'silo',
  FIELD = 'field',
  PADDOCK = 'paddock',
  FEEDLOT = 'feedlot',
  SEMI_FEEDLOT = 'semi_feedlot',
  MILKING_PARLOR = 'milking_parlor',
  WAREHOUSE = 'warehouse',
  GARAGE = 'garage',
  OFFICE = 'office',
  RESIDENCE = 'residence',
  OTHER = 'other',
}

class AreaDto {
  @ApiProperty({ example: 28.5 })
  @Type(() => Number)
  @IsNumber()
  value: number;

  @ApiProperty({ example: 'hectares', enum: AreaType })
  @IsEnum(AreaType)
  type: AreaType;
}

export class CreateLocationDto {
  @ApiProperty({ example: '001' })
  @IsString()
  @MinLength(1)
  code: string;

  @ApiProperty({ example: 'Pasto Norte' })
  @IsString()
  @MinLength(2)
  name: string;

  @ApiProperty({
    example: 'pasture',
    enum: LocationType,
    description: 'Type of location',
  })
  @IsEnum(LocationType)
  locationType: LocationType;

  @ApiProperty({ type: AreaDto })
  @ValidateNested()
  @Type(() => AreaDto)
  @IsObject()
  area: AreaDto;

  @ApiProperty({ example: 'active', enum: ['active', 'inactive'] })
  @IsEnum(['active', 'inactive'])
  status: 'active' | 'inactive';

  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440010' })
  @IsString()
  @MinLength(1)
  propertyId: string;
}
