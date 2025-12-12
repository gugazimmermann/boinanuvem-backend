import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsArray, IsDateString } from 'class-validator';
import { BaseResponseDto } from './base-response.dto';

/**
 * Base animal activity create DTO with common fields for animal-related activities
 * Used by sanitary controls, breedings, and similar DTOs
 */
export class BaseAnimalActivityCreateDto {
  @ApiProperty({
    example: '660e8400-e29b-41d4-a716-446655440010',
    description: 'Animal ID',
  })
  @IsString()
  animalId: string;

  @ApiProperty({
    example: '2025-01-15',
    description: 'Activity date',
  })
  @IsDateString({}, { message: 'Date must be a valid date' })
  date: string;

  @ApiProperty({
    example: 'Observation notes',
    description: 'Observation',
    required: false,
  })
  @IsOptional()
  @IsString()
  observation?: string;

  @ApiProperty({
    example: ['770e8400-e29b-41d4-a716-446655440010'],
    description: 'Employee IDs',
    type: [String],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  employeeIds?: string[];

  @ApiProperty({
    example: ['880e8400-e29b-41d4-a716-446655440010'],
    description: 'Service provider IDs',
    type: [String],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  serviceProviderIds?: string[];
}

/**
 * Base animal activity response DTO with common fields
 * Extends BaseResponseDto to include common response fields
 */
export class BaseAnimalActivityResponseDto extends BaseResponseDto {
  @ApiProperty({ example: '660e8400-e29b-41d4-a716-446655440020' })
  animalId: string;

  @ApiProperty({ example: '2025-01-15' })
  date: Date;

  @ApiProperty({ example: 'Observation notes', required: false })
  observation?: string;

  @ApiProperty({
    example: ['770e8400-e29b-41d4-a716-446655440010'],
    type: [String],
    required: false,
  })
  employeeIds?: string[];

  @ApiProperty({
    example: ['880e8400-e29b-41d4-a716-446655440010'],
    type: [String],
    required: false,
  })
  serviceProviderIds?: string[];
}
