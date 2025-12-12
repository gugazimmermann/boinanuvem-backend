import { ApiProperty } from '@nestjs/swagger';
import { BaseAnimalActivityResponseDto } from '../../common/dto/base-animal-activity.dto';

export class SanitaryControlResponseDto extends BaseAnimalActivityResponseDto {
  @ApiProperty({
    example: '660e8400-e29b-41d4-a716-446655440030',
    required: false,
  })
  itemId?: string;

  @ApiProperty({ example: 10, required: false })
  quantity?: number;

  @ApiProperty({ example: 5.5, required: false })
  calculatedDosage?: number;
}
