import { IsString, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreatePortalSessionDto {
  @ApiProperty({
    example: 'http://localhost:5173/dashboard/pagamentos',
    description: 'URL to return to after portal session',
    required: false,
  })
  @IsOptional()
  @IsString()
  returnUrl?: string;
}
