import { IsString, IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateCheckoutSessionDto {
  @ApiProperty({ example: 'cuid123', description: 'Plan ID from database' })
  @IsString()
  planId!: string;

  @ApiProperty({
    example: 'monthly',
    enum: ['monthly', 'annual'],
    description: 'Billing cycle for the subscription',
  })
  @IsString()
  @IsIn(['monthly', 'annual'])
  billingCycle!: 'monthly' | 'annual';
}
