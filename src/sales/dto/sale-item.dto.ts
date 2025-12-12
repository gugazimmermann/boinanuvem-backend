import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional, MinLength } from 'class-validator';

export class SaleItemDto {
  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440020',
    description: 'Animal ID',
  })
  @IsString()
  @MinLength(1, { message: 'Animal ID must not be empty' })
  animalId: string;

  @ApiProperty({ example: 5000.0, description: 'Price per animal' })
  @IsNumber()
  price: number;

  @ApiProperty({ example: 350.0, description: 'Weight in kg' })
  @IsNumber()
  weight: number;

  @ApiProperty({
    example: 280.0,
    description: 'Carcass weight in kg',
    required: false,
  })
  @IsOptional()
  @IsNumber()
  carcassWeight?: number;
}
