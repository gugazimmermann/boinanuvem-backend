import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsDateString, MinLength } from 'class-validator';

export class CreateDeathDto {
  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440020',
    description: 'Animal ID',
  })
  @IsString()
  @MinLength(1, { message: 'Animal ID must not be empty' })
  animalId: string;

  @ApiProperty({
    example: '2020-01-15',
    description: 'Death date',
  })
  @IsDateString({}, { message: 'Death date must be a valid date' })
  date: string;

  @ApiProperty({
    example: 'Disease',
    description: 'Cause of death',
  })
  @IsString()
  @MinLength(1, { message: 'Cause must not be empty' })
  cause: string;

  @ApiProperty({
    example: 'Death notes',
    required: false,
  })
  @IsOptional()
  @IsString()
  observation?: string;
}
