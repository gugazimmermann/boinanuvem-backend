import { IsBoolean, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CancelSubscriptionDto {
  @ApiProperty({
    example: false,
    description: 'Cancel immediately or at the end of the billing period',
    required: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  cancelImmediately?: boolean = false;
}
