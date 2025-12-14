import { ApiProperty } from '@nestjs/swagger';

export class PregnantStatusResponseDto {
  @ApiProperty({
    example: true,
    description: 'Whether the animal is pregnant',
  })
  isPregnant: boolean;
}
