import {
  IsEmail,
  IsString,
  MinLength,
  IsBoolean,
  IsOptional,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'password123' })
  @IsString()
  @MinLength(6)
  password: string;

  @ApiProperty({
    example: false,
    required: false,
    description: 'Remember me for extended session',
  })
  @IsBoolean()
  @IsOptional()
  rememberMe?: boolean;
}
