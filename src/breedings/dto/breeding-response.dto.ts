import { ApiProperty } from '@nestjs/swagger';
import { BaseAnimalActivityResponseDto } from '../../common/dto/base-animal-activity.dto';

export class BreedingResponseDto extends BaseAnimalActivityResponseDto {
  @ApiProperty({ example: 'natural' })
  method: string;

  @ApiProperty({
    example: '660e8400-e29b-41d4-a716-446655440030',
    required: false,
  })
  bullId?: string;

  @ApiProperty({ example: 1, required: false })
  attemptNumber?: number;

  @ApiProperty({ example: 'SEM001', required: false })
  semenCode?: string;

  @ApiProperty({ example: false })
  confirmed: boolean;
}
