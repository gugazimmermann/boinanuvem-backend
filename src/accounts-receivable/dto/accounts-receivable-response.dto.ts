import { ApiProperty } from '@nestjs/swagger';
import { BaseTransactionResponseDto } from '../../common/dto/base-response.dto';

export class AccountsReceivableResponseDto extends BaseTransactionResponseDto {
  @ApiProperty({
    example: 'aa0e8400-e29b-41d4-a716-446655440010',
    required: false,
  })
  buyerId?: string;
}
