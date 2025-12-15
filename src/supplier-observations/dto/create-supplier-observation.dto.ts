import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsArray, MinLength } from 'class-validator';

export class CreateSupplierObservationDto {
  @ApiProperty({
    example: 'Supplier delivered order ahead of schedule.',
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
