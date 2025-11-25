import { IsOptional, IsString, IsNumber, Min, Max } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class PaginationDto {
  @ApiPropertyOptional({
    description: 'Page number (1-based)',
    minimum: 1,
    maximum: 1000,
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(1000)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Number of items per page',
    minimum: 1,
    maximum: 100,
    default: 10,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 10;
}

export class SearchDto extends PaginationDto {
  @ApiPropertyOptional({
    description: 'Search query string',
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim() : undefined,
  )
  search?: string;
}
