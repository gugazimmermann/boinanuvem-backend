import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  MinLength,
  IsEnum,
  IsNumber,
  IsBoolean,
  IsArray,
  Min,
  ValidateIf,
  IsDateString,
} from 'class-validator';

export enum InventoryItemCategory {
  TOOLS = 'tools',
  FEED = 'feed',
  SUPPLEMENTS = 'supplements',
  VITAMINS = 'vitamins',
  MEDICINES = 'medicines',
  VACCINES = 'vaccines',
  FERTILIZER = 'fertilizer',
  CUSTOM = 'custom',
}

export class CreateInventoryItemDto {
  @ApiProperty({ example: 'RAC001', description: 'Inventory item code' })
  @IsString()
  @MinLength(1, { message: 'Code must not be empty' })
  code: string;

  @ApiProperty({ example: 'Ração Premium para Gado', description: 'Item name' })
  @IsString()
  @MinLength(1, { message: 'Name must not be empty' })
  name: string;

  @ApiProperty({
    example: 'Ração balanceada com alto teor proteico',
    description: 'Item description',
    required: false,
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    example: 'feed',
    enum: InventoryItemCategory,
    description: 'Item category',
  })
  @IsEnum(InventoryItemCategory, {
    message: 'Category must be a valid inventory item category',
  })
  category: InventoryItemCategory;

  @ApiProperty({
    example: 'Custom Category Name',
    description: 'Custom category name (required if category is custom)',
    required: false,
  })
  @IsOptional()
  @ValidateIf(
    (o: CreateInventoryItemDto) => o.category === InventoryItemCategory.CUSTOM,
  )
  @IsString()
  customCategory?: string;

  @ApiProperty({ example: 'kg', description: 'Unit of measurement' })
  @IsString()
  @MinLength(1, { message: 'Unit must not be empty' })
  unit: string;

  @ApiProperty({
    example: 500,
    description: 'Minimum stock level',
  })
  @IsNumber()
  @Min(0, { message: 'Minimum stock must be greater than or equal to 0' })
  minimumStock: number;

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
    example: '990e8400-e29b-41d4-a716-446655440010',
    description: 'Supplier ID',
    required: false,
  })
  @IsOptional()
  @IsString()
  supplierId?: string;

  @ApiProperty({
    example: false,
    description: 'Whether the item has expiration date',
    default: false,
  })
  @IsBoolean()
  hasExpiration: boolean;

  @ApiProperty({
    example: '2025-12-31',
    description: 'Expiration date (required if hasExpiration is true)',
    required: false,
  })
  @IsOptional()
  @ValidateIf((o: CreateInventoryItemDto) => o.hasExpiration === true)
  @IsDateString({}, { message: 'Expiration date must be a valid date' })
  expirationDate?: string;

  @ApiProperty({
    example: 1,
    description: 'Usage amount',
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(0, { message: 'Usage amount must be greater than or equal to 0' })
  usageAmount?: number;

  @ApiProperty({
    example: 'dose',
    description: 'Usage unit',
    required: false,
  })
  @IsOptional()
  @IsString()
  usageUnit?: string;

  @ApiProperty({
    example: 'per_animal',
    description: 'Usage basis',
    required: false,
  })
  @IsOptional()
  @IsString()
  usageBasis?: string;

  @ApiProperty({
    example: ['550e8400-e29b-41d4-a716-446655440010'],
    description: 'Property IDs where this item is used',
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  propertyIds: string[];
}
