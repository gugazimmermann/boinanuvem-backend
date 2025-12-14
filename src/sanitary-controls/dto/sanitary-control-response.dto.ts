import { ApiProperty } from '@nestjs/swagger';
import { BaseAnimalActivityResponseDto } from '../../common/dto/base-animal-activity.dto';

export class AppliedMedicineResponseDto {
  @ApiProperty({
    example: '660e8400-e29b-41d4-a716-446655440020',
  })
  itemId: string;

  @ApiProperty({ example: 10 })
  quantity: number;

  @ApiProperty({ example: 5.5, required: false })
  calculatedDosage?: number;
}

export class SanitaryControlResponseDto extends BaseAnimalActivityResponseDto {
  @ApiProperty({
    example: [
      {
        itemId: '660e8400-e29b-41d4-a716-446655440020',
        quantity: 10,
        calculatedDosage: 5.5,
      },
    ],
    description: 'Array of applied medicines/vaccines',
    type: [AppliedMedicineResponseDto],
  })
  appliedMedicines: AppliedMedicineResponseDto[];

  @ApiProperty({
    example: '660e8400-e29b-41d4-a716-446655440030',
    description: 'Legacy field for backward compatibility',
    required: false,
  })
  itemId?: string;

  @ApiProperty({
    example: 10,
    description: 'Legacy field for backward compatibility',
    required: false,
  })
  quantity?: number;

  @ApiProperty({
    example: 5.5,
    description: 'Legacy field for backward compatibility',
    required: false,
  })
  calculatedDosage?: number;
}
