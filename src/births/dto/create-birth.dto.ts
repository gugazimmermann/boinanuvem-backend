import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  MinLength,
  IsEnum,
  IsDateString,
} from 'class-validator';

export enum AnimalBreed {
  NELORE = 'nelore',
  ANGUS = 'angus',
  BRAHMAN = 'brahman',
  HEREFORD = 'hereford',
  CANCHIM = 'canchim',
  TABAPUA = 'tabapua',
  GUZERA = 'guzera',
  GIROLANDO = 'girolando',
  SIMENTAL = 'simental',
  LIMOUSIN = 'limousin',
  CHAROLAIS = 'charolais',
  SENEPOL = 'senepol',
  CARACU = 'caracu',
  INDUBRASIL = 'indubrasil',
  BRANGUS = 'brangus',
  SANTA_GERTRUDIS = 'santa_gertrudis',
  DEVON = 'devon',
  RED_ANGUS = 'red_angus',
  MARCHIGIANA = 'marchigiana',
  CHIANINA = 'chianina',
}

export enum BirthPurity {
  PO = 'po',
  PC = 'pc',
  F1 = 'f1',
  F2 = 'f2',
  F3 = 'f3',
  F4 = 'f4',
  F5 = 'f5',
}

export class CreateBirthDto {
  @ApiProperty({ example: '001', description: 'Code for the new animal' })
  @IsString()
  @MinLength(1, { message: 'Code must not be empty' })
  code: string;

  @ApiProperty({
    example: 'BR-2020-FJ0001',
    description: 'Registration number for the new animal',
  })
  @IsString()
  @MinLength(1, { message: 'Registration number must not be empty' })
  registrationNumber: string;

  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440010',
    description: 'Property ID where the animal will be located',
  })
  @IsString()
  @MinLength(1, { message: 'Property ID must not be empty' })
  propertyId: string;

  @ApiProperty({
    example: '2020-01-15',
    description: 'Birth date',
  })
  @IsDateString({}, { message: 'Birth date must be a valid date' })
  birthDate: string;

  @ApiProperty({
    example: 'nelore',
    enum: AnimalBreed,
    description: 'Animal breed',
    required: false,
  })
  @IsOptional()
  @IsEnum(AnimalBreed, {
    message: 'Breed must be a valid animal breed',
  })
  breed?: AnimalBreed;

  @ApiProperty({
    example: 'male',
    enum: ['male', 'female'],
    description: 'Animal gender',
    required: false,
  })
  @IsOptional()
  @IsEnum(['male', 'female'], {
    message: 'Gender must be either male or female',
  })
  gender?: 'male' | 'female';

  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440020',
    description: 'Mother animal ID',
    required: false,
  })
  @IsOptional()
  @IsString()
  motherId?: string;

  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440021',
    description: 'Father animal ID',
    required: false,
  })
  @IsOptional()
  @IsString()
  fatherId?: string;

  @ApiProperty({
    example: 'po',
    enum: BirthPurity,
    description: 'Animal purity',
    required: false,
  })
  @IsOptional()
  @IsEnum(BirthPurity, {
    message: 'Purity must be a valid purity value',
  })
  purity?: BirthPurity;

  @ApiProperty({
    example: 'Healthy birth, no complications',
    description: 'Observations about the birth',
    required: false,
  })
  @IsOptional()
  @IsString()
  observation?: string;
}
