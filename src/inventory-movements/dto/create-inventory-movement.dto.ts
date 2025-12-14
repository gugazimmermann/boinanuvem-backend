import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsNumber,
  IsDateString,
  IsEnum,
  IsArray,
  Min,
  ValidateIf,
} from 'class-validator';

export enum InventoryMovementType {
  PURCHASE = 'purchase',
  SALE = 'sale',
  ADJUSTMENT = 'adjustment',
  CONSUMPTION = 'consumption',
  TRANSFER = 'transfer',
}

export class CreateInventoryMovementDto {
  @ApiProperty({
    example: '660e8400-e29b-41d4-a716-446655440020',
    description: 'Inventory item ID',
  })
  @IsString()
  itemId: string;

  @ApiProperty({
    example: 'purchase',
    enum: InventoryMovementType,
    description: 'Movement type',
  })
  @IsEnum(InventoryMovementType, {
    message: 'Type must be a valid inventory movement type',
  })
  type: InventoryMovementType;

  @ApiProperty({
    example: 100,
    description: 'Quantity',
  })
  @IsNumber()
  @Min(0, { message: 'Quantity must be greater than or equal to 0' })
  quantity: number;

  @ApiProperty({
    example: 2.5,
    description: 'Unit price',
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(0, { message: 'Unit price must be greater than or equal to 0' })
  unitPrice?: number;

  @ApiProperty({
    example: '2025-01-15',
    description: 'Movement date',
  })
  @IsDateString({}, { message: 'Date must be a valid date' })
  date: string;

  @ApiProperty({
    example: 'Purchase of feed',
    description: 'Description',
    required: false,
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    example: '990e8400-e29b-41d4-a716-446655440010',
    description: 'Supplier ID (required for purchase type)',
    required: false,
  })
  @IsOptional()
  @ValidateIf(
    (o: CreateInventoryMovementDto) =>
      o.type === InventoryMovementType.PURCHASE,
  )
  @IsString()
  supplierId?: string;

  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440010',
    description: 'Property ID',
  })
  @IsString()
  propertyId: string;

  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440020',
    description: 'Location ID',
    required: false,
  })
  @IsOptional()
  @IsString()
  locationId?: string;

  @ApiProperty({
    example: '2025-12-31',
    description: 'Expiration date',
    required: false,
  })
  @IsOptional()
  @IsDateString({}, { message: 'Expiration date must be a valid date' })
  expirationDate?: string;

  @ApiProperty({
    example: ['770e8400-e29b-41d4-a716-446655440010'],
    description: 'Employee IDs',
    type: [String],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  employeeIds?: string[];

  @ApiProperty({
    example: ['880e8400-e29b-41d4-a716-446655440010'],
    description: 'Service provider IDs',
    type: [String],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  serviceProviderIds?: string[];

  @ApiProperty({
    example: 'Additional notes',
    description: 'Observation',
    required: false,
  })
  @IsOptional()
  @IsString()
  observation?: string;

  @ApiProperty({
    example: ['file-id-1', 'file-id-2'],
    description: 'File IDs',
    type: [String],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  fileIds?: string[];
}
