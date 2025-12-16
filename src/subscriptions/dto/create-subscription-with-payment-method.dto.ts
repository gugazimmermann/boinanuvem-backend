import { IsString, IsEnum, IsNotEmpty } from 'class-validator';

export class CreateSubscriptionWithPaymentMethodDto {
  @IsString()
  @IsNotEmpty()
  planId: string;

  @IsEnum(['monthly', 'annual'])
  @IsNotEmpty()
  billingCycle: 'monthly' | 'annual';

  @IsString()
  @IsNotEmpty()
  paymentMethodId: string;
}
