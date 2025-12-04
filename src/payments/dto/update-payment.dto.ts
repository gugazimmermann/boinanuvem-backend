import {
  IsString,
  IsOptional,
  IsDateString,
  IsObject,
  IsEnum,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum PaymentStatus {
  PENDING = 'pending',
  PAID = 'paid',
  FAILED = 'failed',
  REFUNDED = 'refunded',
  CANCELLED = 'cancelled',
}

export class UpdatePaymentDto {
  @ApiProperty({
    example: 'paid',
    required: false,
    enum: PaymentStatus,
  })
  @IsOptional()
  @IsEnum(PaymentStatus)
  status?: PaymentStatus;

  @ApiProperty({ example: '2024-12-31T00:00:00.000Z', required: false })
  @IsOptional()
  @IsDateString()
  paymentDate?: Date;

  @ApiProperty({ example: 'credit_card', required: false })
  @IsOptional()
  @IsString()
  paymentMethod?: string;

  @ApiProperty({ example: 'ext_123456', required: false })
  @IsOptional()
  @IsString()
  externalId?: string;

  @ApiProperty({ example: {}, required: false })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
