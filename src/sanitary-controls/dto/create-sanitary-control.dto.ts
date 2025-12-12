import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsNumber, Min } from 'class-validator';
import { BaseAnimalActivityCreateDto } from '../../common/dto/base-animal-activity.dto';

export class CreateSanitaryControlDto extends BaseAnimalActivityCreateDto {
  @ApiProperty({
    example: '660e8400-e29b-41d4-a716-446655440020',
    description: 'Inventory item ID (medicine, vaccine, etc.)',
    required: false,
  })
  @IsOptional()
  @IsString()
  itemId?: string;

  @ApiProperty({
    example: 10,
    description: 'Quantity used',
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(0, { message: 'Quantity must be greater than or equal to 0' })
  quantity?: number;

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
