import {
  IsString,
  IsEmail,
  IsOptional,
  MinLength,
  Matches,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateUserDto {
  @ApiProperty({ example: 'Maria Santos Silva', required: false })
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;

  @ApiProperty({ example: '234.567.890-11', required: false })
  @IsOptional()
  @IsString()
  @Matches(/^\d{3}\.\d{3}\.\d{3}-\d{2}$/, {
    message: 'CPF must be in format XXX.XXX.XXX-XX',
  })
  cpf?: string;

  @ApiProperty({ example: 'maria.nova@fazenda.com.br', required: false })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({ example: '(47) 99999-6666', required: false })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ example: 'Rua da Maria Nova', required: false })
  @IsOptional()
  @IsString()
  street?: string;

  @ApiProperty({ example: '999', required: false })
  @IsOptional()
  @IsString()
  number?: string;

  @ApiProperty({ example: 'Casa 3', required: false })
  @IsOptional()
  @IsString()
  complement?: string;

  @ApiProperty({ example: 'Bairro Central', required: false })
  @IsOptional()
  @IsString()
  neighborhood?: string;

  @ApiProperty({ example: 'Balneário Camboriú', required: false })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiProperty({ example: 'SC', required: false })
  @IsOptional()
  @IsString()
  @Matches(/^[A-Z]{2}$/, { message: 'State must be 2 uppercase letters' })
  state?: string;

  @ApiProperty({ example: '88330-000', required: false })
  @IsOptional()
  @IsString()
  @Matches(/^\d{5}-\d{3}$/, { message: 'ZIP code must be in format XXXXX-XXX' })
  zipCode?: string;
}
