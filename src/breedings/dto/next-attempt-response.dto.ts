import { ApiProperty } from '@nestjs/swagger';

export class NextAttemptResponseDto {
  @ApiProperty({
    example: 1,
    description: 'Next attempt number for the animal',
  })
  nextAttemptNumber: number;
}
