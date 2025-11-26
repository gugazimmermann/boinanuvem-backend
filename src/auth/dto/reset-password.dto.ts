import { IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ResetPasswordDto {
  @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' })
  @IsString()
  token: string;

  @ApiProperty({ example: 'newpassword123' })
  @IsString()
  @MinLength(6)
  password: string;
}
