import {
  IsString,
  IsEmail,
  IsOptional,
  MinLength,
  Matches,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateCompanyDto {
  @ApiProperty({ example: 'Fazenda Boi na Nuvem Ltda', required: false })
  @IsOptional()
  @IsString()
  @MinLength(2)
  companyName?: string;

  @ApiProperty({ example: 'contato@fazenda.com.br', required: false })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({ example: '(47) 99999-9999', required: false })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ example: 'Rua das Fazendas', required: false })
  @IsOptional()
  @IsString()
  street?: string;

  @ApiProperty({ example: '123', required: false })
  @IsOptional()
  @IsString()
  number?: string;

  @ApiProperty({ example: 'Sala 1', required: false })
  @IsOptional()
  @IsString()
  complement?: string;

  @ApiProperty({ example: 'Centro', required: false })
  @IsOptional()
  @IsString()
  neighborhood?: string;

  @ApiProperty({ example: 'Itajaí', required: false })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiProperty({ example: 'SC', required: false })
  @IsOptional()
  @IsString()
  @Matches(/^[A-Z]{2}$/, { message: 'State must be 2 uppercase letters' })
  state?: string;

  @ApiProperty({ example: '88303-030', required: false })
  @IsOptional()
  @IsString()
  @Matches(/^\d{5}-\d{3}$/, { message: 'ZIP code must be in format XXXXX-XXX' })
  zipCode?: string;

  @ApiProperty({ example: -26.9056, required: false })
  @IsOptional()
  latitude?: number;

  @ApiProperty({ example: -48.6556, required: false })
  @IsOptional()
  longitude?: number;
}
