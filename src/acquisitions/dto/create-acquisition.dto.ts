import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsNumber,
  IsDateString,
  IsEnum,
  IsArray,
  ArrayMinSize,
  ValidateNested,
  MinLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { AcquisitionItemDto } from './acquisition-item.dto';
import { FeeDto } from './fee.dto';

export enum PricingMode {
  INDIVIDUAL = 'individual',
  TOTAL = 'total',
}

export enum AcquisitionPaymentMethod {
  CASH_FLOW = 'cash_flow',
  ACCOUNTS_PAYABLE = 'accounts_payable',
}

export class CreateAcquisitionDto {
  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440010',
    description: 'Property ID',
  })
  @IsString()
  @MinLength(1, { message: 'Property ID must not be empty' })
  propertyId: string;

  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440030',
    description: 'Supplier ID',
  })
  @IsString()
  @MinLength(1, { message: 'Supplier ID must not be empty' })
  supplierId: string;

  @ApiProperty({
    example: '2020-01-15',
    description: 'Acquisition date',
  })
  @IsDateString({}, { message: 'Acquisition date must be a valid date' })
  acquisitionDate: string;

  @ApiProperty({
    example: 'individual',
    enum: PricingMode,
    description: 'Pricing mode',
  })
  @IsEnum(PricingMode, {
    message: 'Pricing mode must be either individual or total',
  })
  pricingMode: PricingMode;

  @ApiProperty({
    example: 'cash_flow',
    enum: AcquisitionPaymentMethod,
    description: 'Payment method',
  })
  @IsEnum(AcquisitionPaymentMethod, {
    message: 'Payment method must be either cash_flow or accounts_payable',
  })
  paymentMethod: AcquisitionPaymentMethod;

  @ApiProperty({
    example: 50000.0,
    description: 'Total price',
  })
  @IsNumber()
  totalPrice: number;

  @ApiProperty({
    example: [{ id: 'fee-001', name: 'Transportation', amount: 150.0 }],
    type: [FeeDto],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FeeDto)
  fees?: FeeDto[];

  @ApiProperty({
    example: 500.0,
    description: 'Transportation fee',
    required: false,
  })
  @IsOptional()
  @IsNumber()
  transportationFee?: number;

  @ApiProperty({
    example: 200.0,
    description: 'Handling fee',
    required: false,
  })
  @IsOptional()
  @IsNumber()
  handlingFee?: number;

  @ApiProperty({
    example: [
      {
        code: '001',
        registrationNumber: 'BR-2020-FJ0001',
        price: 5000.0,
        weight: 350.0,
      },
    ],
    type: [AcquisitionItemDto],
    description: 'Acquisition items',
  })
  @IsArray()
  @ArrayMinSize(1, { message: 'At least one acquisition item is required' })
  @ValidateNested({ each: true })
  @Type(() => AcquisitionItemDto)
  acquisitionItems: AcquisitionItemDto[];

  @ApiProperty({
    example: 'Acquisition notes',
    required: false,
  })
  @IsOptional()
  @IsString()
  observation?: string;
}
