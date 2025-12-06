import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  MinLength,
  IsEnum,
  IsArray,
  ArrayMinSize,
  IsEmail,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { formatCPF, formatCNPJ } from '../utils/format-utils';
import { AddressDto } from './address.dto';

type OptionalString = string | null | undefined;

export class BaseRegistrationCreateDto extends AddressDto {
  @ApiProperty({ example: '001' })
  @IsString()
  @MinLength(1)
  code: string;

  @ApiProperty({ example: 'Name Example' })
  @IsString()
  @MinLength(2)
  name: string;

  @ApiProperty({ example: '123.456.789-00', required: false })
  @IsOptional()
  @IsString()
  @Transform(({ value }: { value: unknown }) =>
    formatCPF(value as OptionalString),
  )
  cpf?: string;

  @ApiProperty({ example: '12.345.678/0001-90', required: false })
  @IsOptional()
  @IsString()
  @Transform(({ value }: { value: unknown }) =>
    formatCNPJ(value as string | null | undefined),
  )
  cnpj?: string;

  @ApiProperty({ example: 'contato@example.com', required: false })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({ example: '(47) 99999-9999', required: false })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ example: 'active', enum: ['active', 'inactive'] })
  @IsEnum(['active', 'inactive'])
  status: 'active' | 'inactive';

  @ApiProperty({
    example: ['550e8400-e29b-41d4-a716-446655440010'],
    type: [String],
    description: 'Array of property IDs',
  })
  @IsArray()
  @ArrayMinSize(1, { message: 'At least one property must be selected' })
  @IsString({ each: true })
  propertyIds: string[];
}

export class BaseRegistrationResponseDto {
  @ApiProperty({ example: '660e8400-e29b-41d4-a716-446655440010' })
  id: string;

  @ApiProperty({ example: '001' })
  code: string;

  @ApiProperty({ example: 'Name Example' })
  name: string;

  @ApiProperty({ example: '123.456.789-00', required: false })
  cpf?: string;

  @ApiProperty({ example: '12.345.678/0001-90', required: false })
  cnpj?: string;

  @ApiProperty({ example: 'contato@example.com', required: false })
  email?: string;

  @ApiProperty({ example: '(47) 99999-9999', required: false })
  phone?: string;

  @ApiProperty({ example: 'active' })
  status: string;

  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  companyId: string;

  @ApiProperty({
    example: ['550e8400-e29b-41d4-a716-446655440010'],
    type: [String],
  })
  propertyIds: string[];

  @ApiProperty({ example: 'Rua das Flores', required: false })
  street?: string;

  @ApiProperty({ example: '123', required: false })
  number?: string;

  @ApiProperty({ example: 'Escritório 1', required: false })
  complement?: string;

  @ApiProperty({ example: 'Centro', required: false })
  neighborhood?: string;

  @ApiProperty({ example: 'São Paulo', required: false })
  city?: string;

  @ApiProperty({ example: 'SP', required: false })
  state?: string;

  @ApiProperty({ example: '01310-100', required: false })
  zipCode?: string;

  @ApiProperty({ example: '2025-01-20T00:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2025-01-20T00:00:00.000Z' })
  updatedAt: Date;
}
