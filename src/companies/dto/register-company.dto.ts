import {
  IsString,
  IsEmail,
  IsOptional,
  MinLength,
  Matches,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterCompanyDto {
  @ApiProperty({ example: '12.345.678/0001-90' })
  @IsString()
  @Matches(/^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/, {
    message: 'CNPJ must be in format XX.XXX.XXX/XXXX-XX',
  })
  cnpj: string;

  @ApiProperty({ example: 'Fazenda Boi na Nuvem Ltda' })
  @IsString()
  @MinLength(2)
  companyName: string;

  @ApiProperty({ example: 'contato@fazenda.com.br' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: '(47) 99999-9999' })
  @IsString()
  phone: string;

  @ApiProperty({ example: 'Rua das Fazendas' })
  @IsString()
  street: string;

  @ApiProperty({ example: '123' })
  @IsString()
  number: string;

  @ApiProperty({ example: 'Sala 1', required: false })
  @IsOptional()
  @IsString()
  complement?: string;

  @ApiProperty({ example: 'Centro' })
  @IsString()
  neighborhood: string;

  @ApiProperty({ example: 'Itajaí' })
  @IsString()
  city: string;

  @ApiProperty({ example: 'SC' })
  @IsString()
  @Matches(/^[A-Z]{2}$/, { message: 'State must be 2 uppercase letters' })
  state: string;

  @ApiProperty({ example: '88303-030' })
  @IsString()
  @Matches(/^\d{5}-\d{3}$/, { message: 'ZIP code must be in format XXXXX-XXX' })
  zipCode: string;

  @ApiProperty({ example: -26.9056, required: false })
  @IsOptional()
  latitude?: number;

  @ApiProperty({ example: -48.6556, required: false })
  @IsOptional()
  longitude?: number;

  // Main user data
  @ApiProperty({ example: 'João Silva' })
  @IsString()
  @MinLength(2)
  userName: string;

  @ApiProperty({ example: '123.456.789-00', required: false })
  @IsOptional()
  @IsString()
  @Matches(/^\d{3}\.\d{3}\.\d{3}-\d{2}$/, {
    message: 'CPF must be in format XXX.XXX.XXX-XX',
  })
  userCpf?: string;

  @ApiProperty({ example: 'joao@fazenda.com.br' })
  @IsEmail()
  userEmail: string;

  @ApiProperty({ example: '(47) 99999-8888' })
  @IsString()
  userPhone: string;

  @ApiProperty({ example: 'password123' })
  @IsString()
  @MinLength(6)
  userPassword: string;

  // User address (optional, can inherit from company)
  @ApiProperty({ example: 'Rua do João', required: false })
  @IsOptional()
  @IsString()
  userStreet?: string;

  @ApiProperty({ example: '456', required: false })
  @IsOptional()
  @IsString()
  userNumber?: string;

  @ApiProperty({ example: 'Apt 2', required: false })
  @IsOptional()
  @IsString()
  userComplement?: string;

  @ApiProperty({ example: 'Bairro Novo', required: false })
  @IsOptional()
  @IsString()
  userNeighborhood?: string;

  @ApiProperty({ example: 'Itajaí', required: false })
  @IsOptional()
  @IsString()
  userCity?: string;

  @ApiProperty({ example: 'SC', required: false })
  @IsOptional()
  @IsString()
  @Matches(/^[A-Z]{2}$/, { message: 'State must be 2 uppercase letters' })
  userState?: string;

  @ApiProperty({ example: '88303-040', required: false })
  @IsOptional()
  @IsString()
  @Matches(/^\d{5}-\d{3}$/, { message: 'ZIP code must be in format XXXXX-XXX' })
  userZipCode?: string;
}
