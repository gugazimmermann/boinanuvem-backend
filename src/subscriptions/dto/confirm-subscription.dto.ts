import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ConfirmSubscriptionDto {
  @ApiProperty({
    example: 'cs_test_1234567890',
    description: 'Stripe checkout session ID',
  })
  @IsString()
  sessionId!: string;
}
