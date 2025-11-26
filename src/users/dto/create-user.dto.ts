import {
  IsString,
  IsEmail,
  IsOptional,
  MinLength,
  Matches,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateUserDto {
  @ApiProperty({ example: 'Maria Santos' })
  @IsString()
  @MinLength(2)
  name: string;

  @ApiProperty({ example: '234.567.890-11', required: false })
  @IsOptional()
  @IsString()
  @Matches(/^\d{3}\.\d{3}\.\d{3}-\d{2}$/, {
    message: 'CPF must be in format XXX.XXX.XXX-XX',
  })
  cpf?: string;

  @ApiProperty({ example: 'maria@fazenda.com.br' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: '(47) 99999-7777' })
  @IsString()
  phone: string;

  @ApiProperty({ example: 'password123' })
  @IsString()
  @MinLength(6)
  password: string;

  @ApiProperty({ example: 'Rua da Maria', required: false })
  @IsOptional()
  @IsString()
  street?: string;

  @ApiProperty({ example: '789', required: false })
  @IsOptional()
  @IsString()
  number?: string;

  @ApiProperty({ example: 'Casa 2', required: false })
  @IsOptional()
  @IsString()
  complement?: string;

  @ApiProperty({ example: 'Bairro Novo', required: false })
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

  @ApiProperty({ example: '88303-050', required: false })
  @IsOptional()
  @IsString()
  @Matches(/^\d{5}-\d{3}$/, { message: 'ZIP code must be in format XXXXX-XXX' })
  zipCode?: string;
}
