import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  MinLength,
  IsEnum,
  IsDateString,
} from 'class-validator';

export class CreateAnimalDto {
  @ApiProperty({ example: '001', description: 'Animal code' })
  @IsString()
  @MinLength(1, { message: 'Code must not be empty' })
  code: string;

  @ApiProperty({
    example: 'BR-2020-FJ0001',
    description: 'Animal registration number',
  })
  @IsString()
  @MinLength(1, { message: 'Registration number must not be empty' })
  registrationNumber: string;

  @ApiProperty({
    example: '2020-01-15',
    description: 'Acquisition date',
    required: false,
  })
  @IsOptional()
  @IsDateString({}, { message: 'Acquisition date must be a valid date' })
  acquisitionDate?: string;

  @ApiProperty({
    example: 'active',
    enum: ['active', 'inactive', 'sold'],
    description: 'Animal status',
  })
  @IsEnum(['active', 'inactive', 'sold'], {
    message: 'Status must be one of: active, inactive, sold',
  })
  status: 'active' | 'inactive' | 'sold';

  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440010',
    description: 'Property ID',
  })
  @IsString()
  @MinLength(1, { message: 'Property ID must not be empty' })
  propertyId: string;
}
