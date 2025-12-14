import { ApiProperty } from '@nestjs/swagger';

export class PregnantAnimalsResponseDto {
  @ApiProperty({
    example: [
      '660e8400-e29b-41d4-a716-446655440010',
      '660e8400-e29b-41d4-a716-446655440020',
    ],
    description: 'Array of pregnant animal IDs',
    type: [String],
  })
  animalIds: string[];
}
