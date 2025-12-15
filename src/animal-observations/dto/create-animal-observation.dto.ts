import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsArray, MinLength } from 'class-validator';

export class CreateAnimalObservationDto {
  @ApiProperty({
    example: 'Animal is showing signs of improvement after treatment.',
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
