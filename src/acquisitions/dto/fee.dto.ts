import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, MinLength } from 'class-validator';

export class FeeDto {
  @ApiProperty({ example: 'fee-001' })
  @IsString()
  @MinLength(1)
  id: string;

  @ApiProperty({ example: 'Transportation' })
  @IsString()
  @MinLength(1)
  name: string;

  @ApiProperty({ example: 150.0 })
  @IsNumber()
  amount: number;
}
