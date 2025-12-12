import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsNumber,
  IsDateString,
  IsArray,
  ValidateNested,
  MinLength,
} from 'class-validator';
import { Type } from 'class-transformer';

export class AppliedMedicineDto {
  @ApiProperty({ example: 'medicine-001' })
  @IsString()
  @MinLength(1)
  itemId: string;

  @ApiProperty({ example: 10 })
  @IsNumber()
  quantity: number;

  @ApiProperty({ example: 5.5 })
  @IsNumber()
  calculatedDosage: number;
}

export class CreateWeighingDto {
  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440020',
    description: 'Animal ID',
  })
  @IsString()
  @MinLength(1, { message: 'Animal ID must not be empty' })
  animalId: string;

  @ApiProperty({
    example: '2020-01-15',
    description: 'Weighing date',
  })
  @IsDateString({}, { message: 'Weighing date must be a valid date' })
  date: string;

  @ApiProperty({
    example: 350.0,
    description: 'Weight in kg',
  })
  @IsNumber()
  weight: number;

  @ApiProperty({
    example: ['550e8400-e29b-41d4-a716-446655440050'],
    description: 'Employee IDs',
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  employeeIds: string[];

  @ApiProperty({
    example: ['550e8400-e29b-41d4-a716-446655440060'],
    description: 'Service provider IDs',
    type: [String],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  serviceProviderIds?: string[];

  @ApiProperty({
    example: [
      {
        itemId: 'medicine-001',
        quantity: 10,
        calculatedDosage: 5.5,
      },
    ],
    type: [AppliedMedicineDto],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AppliedMedicineDto)
  appliedMedicines?: AppliedMedicineDto[];

  @ApiProperty({
    example: 'Weighing notes',
    required: false,
  })
  @IsOptional()
  @IsString()
  observation?: string;
}
