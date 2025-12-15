import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsArray, MinLength } from 'class-validator';

export class CreateAccountsPayableObservationDto {
  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'Accounts payable ID (optional if provided in path)',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MinLength(1, { message: 'Accounts payable ID must not be empty' })
  accountsPayableId?: string;

  @ApiProperty({
    example: 'Payment reminder sent to supplier.',
    description: 'Observation text content',
  })
  @IsString()
  @MinLength(1, { message: 'Observation must not be empty' })
  observation: string;

  @ApiProperty({
    example: ['file-id-1', 'file-id-2'],
    description: 'Array of file IDs attached to the observation',
    required: false,
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  fileIds?: string[];
}
