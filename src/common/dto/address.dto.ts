import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, Matches } from 'class-validator';
import { Transform } from 'class-transformer';
import { formatZipCode } from '../utils/format-utils';

export class AddressDto {
  @ApiProperty({ example: 'Rua das Flores', required: false })
  @IsOptional()
  @IsString()
  street?: string;

  @ApiProperty({ example: '123', required: false })
  @IsOptional()
  @IsString()
  number?: string;

  @ApiProperty({ example: 'Escritório 1', required: false })
  @IsOptional()
  @IsString()
  complement?: string;

  @ApiProperty({ example: 'Centro', required: false })
  @IsOptional()
  @IsString()
  neighborhood?: string;

  @ApiProperty({ example: 'São Paulo', required: false })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiProperty({ example: 'SP', required: false })
  @IsOptional()
  @IsString()
  @Matches(/^[A-Z]{2}$/, { message: 'State must be 2 uppercase letters' })
  state?: string;

  @ApiProperty({ example: '01310-100', required: false })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    formatZipCode(value as string | null | undefined),
  )
  @IsString()
  @Matches(/^\d{5}-\d{3}$/, {
    message: 'ZIP code must be in format XXXXX-XXX',
  })
  zipCode?: string;
}
