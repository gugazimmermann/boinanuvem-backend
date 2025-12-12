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
import { SaleItemDto } from './sale-item.dto';
import { FeeDto } from '../../acquisitions/dto/fee.dto';

export enum SaleType {
  SLAUGHTERHOUSE = 'slaughterhouse',
  OTHER_FARM = 'other_farm',
  AUCTION = 'auction',
}

export enum PricingMode {
  INDIVIDUAL = 'individual',
  TOTAL = 'total',
}

export enum SalePaymentMethod {
  CASH_FLOW = 'cash_flow',
  ACCOUNTS_RECEIVABLE = 'accounts_receivable',
}

export class CreateSaleDto {
  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440010',
    description: 'Property ID',
  })
  @IsString()
  @MinLength(1, { message: 'Property ID must not be empty' })
  propertyId: string;

  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440040',
    description: 'Buyer ID',
  })
  @IsString()
  @MinLength(1, { message: 'Buyer ID must not be empty' })
  buyerId: string;

  @ApiProperty({
    example: '2020-01-15',
    description: 'Sale date',
  })
  @IsDateString({}, { message: 'Sale date must be a valid date' })
  saleDate: string;

  @ApiProperty({
    example: 'slaughterhouse',
    enum: SaleType,
    description: 'Sale type',
  })
  @IsEnum(SaleType, {
    message: 'Sale type must be a valid sale type',
  })
  saleType: SaleType;

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
    enum: SalePaymentMethod,
    description: 'Payment method',
  })
  @IsEnum(SalePaymentMethod, {
    message: 'Payment method must be either cash_flow or accounts_receivable',
  })
  paymentMethod: SalePaymentMethod;

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
    description: 'Additional fees',
    required: false,
  })
  @IsOptional()
  @IsNumber()
  additionalFees?: number;

  @ApiProperty({
    example: [
      {
        animalId: '550e8400-e29b-41d4-a716-446655440020',
        price: 5000.0,
        weight: 350.0,
      },
    ],
    type: [SaleItemDto],
    description: 'Sale items',
  })
  @IsArray()
  @ArrayMinSize(1, { message: 'At least one sale item is required' })
  @ValidateNested({ each: true })
  @Type(() => SaleItemDto)
  saleItems: SaleItemDto[];

  @ApiProperty({
    example: 'Sale notes',
    required: false,
  })
  @IsOptional()
  @IsString()
  observation?: string;
}
