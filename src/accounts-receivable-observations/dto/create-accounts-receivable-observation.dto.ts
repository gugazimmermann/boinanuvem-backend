import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsArray, MinLength } from 'class-validator';

export class CreateAccountsReceivableObservationDto {
  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'Accounts receivable ID (optional if provided in path)',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MinLength(1, { message: 'Accounts receivable ID must not be empty' })
  accountsReceivableId?: string;

  @ApiProperty({
    example: 'Payment follow-up scheduled for next week.',
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
