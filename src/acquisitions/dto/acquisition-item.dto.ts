import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsNumber,
  IsDateString,
  IsEnum,
  MinLength,
} from 'class-validator';
import { AnimalBreed, BirthPurity } from '../../births/dto/create-birth.dto';

export class AcquisitionItemDto {
  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440020',
    description: 'Animal ID (optional if creating new animal)',
    required: false,
  })
  @IsOptional()
  @IsString()
  animalId?: string;

  @ApiProperty({
    example: '001',
    description: 'Code for new animal (required if animalId not provided)',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MinLength(1)
  code?: string;

  @ApiProperty({
    example: 'BR-2020-FJ0001',
    description:
      'Registration number for new animal (required if animalId not provided)',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MinLength(1)
  registrationNumber?: string;

  @ApiProperty({ example: 5000.0, description: 'Price per animal' })
  @IsNumber()
  price: number;

  @ApiProperty({ example: 350.0, description: 'Weight in kg' })
  @IsNumber()
  weight: number;

  @ApiProperty({
    example: 'nelore',
    enum: AnimalBreed,
    required: false,
  })
  @IsOptional()
  @IsEnum(AnimalBreed)
  breed?: AnimalBreed;

  @ApiProperty({
    example: 'male',
    enum: ['male', 'female'],
    required: false,
  })
  @IsOptional()
  @IsEnum(['male', 'female'])
  gender?: 'male' | 'female';

  @ApiProperty({
    example: '2020-01-15',
    required: false,
  })
  @IsOptional()
  @IsDateString({}, { message: 'Birth date must be a valid date' })
  birthDate?: string;

  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440021',
    required: false,
  })
  @IsOptional()
  @IsString()
  motherId?: string;

  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440022',
    required: false,
  })
  @IsOptional()
  @IsString()
  fatherId?: string;

  @ApiProperty({
    example: 'BR-2019-MJ0001',
    required: false,
  })
  @IsOptional()
  @IsString()
  motherRegistrationNumber?: string;

  @ApiProperty({
    example: 'BR-2018-MJ0002',
    required: false,
  })
  @IsOptional()
  @IsString()
  fatherRegistrationNumber?: string;

  @ApiProperty({
    example: 'po',
    enum: BirthPurity,
    required: false,
  })
  @IsOptional()
  @IsEnum(BirthPurity)
  purity?: BirthPurity;

  @ApiProperty({
    example: 'Healthy animal',
    required: false,
  })
  @IsOptional()
  @IsString()
  birthObservation?: string;
}
