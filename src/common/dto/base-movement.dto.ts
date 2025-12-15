import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsDateString, IsOptional, IsString } from 'class-validator';

export class BaseMovementCreateDto {
  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description:
      'Company ID (optional, derived from authenticated user if omitted)',
    required: false,
  })
  @IsOptional()
  @IsString()
  companyId?: string;

  @ApiProperty({
    example: 'property-id-1',
    description: 'Property ID where the movement occurs',
  })
  @IsString()
  propertyId!: string;

  @ApiProperty({
    example: ['employee-id-1'],
    description: 'Employees involved in the movement',
    required: false,
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  employeeIds?: string[];

  @ApiProperty({
    example: ['service-provider-id-1'],
    description: 'Service providers involved in the movement',
    required: false,
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  serviceProviderIds?: string[];

  @ApiProperty({
    example: '2025-01-15',
    description: 'Movement date (ISO 8601)',
  })
  @IsDateString({}, { message: 'Date must be a valid ISO 8601 date' })
  date!: string;

  @ApiProperty({
    example: 'Additional notes about the movement',
    description: 'Additional notes about the movement',
    required: false,
  })
  @IsOptional()
  @IsString()
  observation?: string;

  @ApiProperty({
    example: ['file-id-1', 'file-id-2'],
    description: 'Attached file IDs',
    required: false,
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  fileIds?: string[];
}
