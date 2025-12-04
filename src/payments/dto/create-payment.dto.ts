import {
  IsString,
  IsNumber,
  IsOptional,
  IsDateString,
  IsObject,
  Min,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreatePaymentDto {
  @ApiProperty({ example: 'cmiry4nru0001q6j4iasubpp1' })
  @IsString()
  companyId: string;

  @ApiProperty({ example: 'sub_123456', required: false })
  @IsOptional()
  @IsString()
  subscriptionId?: string;

  @ApiProperty({ example: 99.0 })
  @IsNumber()
  @Min(0)
  amount: number;

  @ApiProperty({ example: 'BRL', required: false, default: 'BRL' })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiProperty({ example: 'credit_card', required: false })
  @IsOptional()
  @IsString()
  paymentMethod?: string;

  @ApiProperty({ example: '2024-12-31T00:00:00.000Z' })
  @IsDateString()
  dueDate: Date;

  @ApiProperty({ example: 'Monthly subscription payment', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 'ext_123456', required: false })
  @IsOptional()
  @IsString()
  externalId?: string;

  @ApiProperty({ example: {}, required: false })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
