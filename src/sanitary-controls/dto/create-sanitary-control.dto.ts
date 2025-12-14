import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsNumber,
  Min,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { BaseAnimalActivityCreateDto } from '../../common/dto/base-animal-activity.dto';

export class AppliedMedicineDto {
  @ApiProperty({
    example: '660e8400-e29b-41d4-a716-446655440020',
    description: 'Inventory item ID (medicine, vaccine, etc.)',
  })
  @IsString()
  itemId: string;

  @ApiProperty({
    example: 10,
    description: 'Quantity used',
  })
  @IsNumber()
  @Min(0, { message: 'Quantity must be greater than or equal to 0' })
  quantity: number;

  @ApiProperty({
    example: 5.5,
    description: 'Calculated dosage',
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(0, { message: 'Calculated dosage must be greater than or equal to 0' })
  calculatedDosage?: number;
}

export class CreateSanitaryControlDto extends BaseAnimalActivityCreateDto {
  @ApiProperty({
    example: [
      {
        itemId: '660e8400-e29b-41d4-a716-446655440020',
        quantity: 10,
        calculatedDosage: 5.5,
      },
    ],
    description: 'Array of applied medicines/vaccines',
    type: [AppliedMedicineDto],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AppliedMedicineDto)
  appliedMedicines?: AppliedMedicineDto[];

  @ApiProperty({
    example: '660e8400-e29b-41d4-a716-446655440020',
    description:
      'Inventory item ID (medicine, vaccine, etc.) - Legacy field for backward compatibility',
    required: false,
  })
  @IsOptional()
  @IsString()
  itemId?: string;

  @ApiProperty({
    example: 10,
    description: 'Quantity used - Legacy field for backward compatibility',
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(0, { message: 'Quantity must be greater than or equal to 0' })
  quantity?: number;

  @ApiProperty({
    example: 5.5,
    description: 'Calculated dosage - Legacy field for backward compatibility',
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(0, { message: 'Calculated dosage must be greater than or equal to 0' })
  calculatedDosage?: number;
}
