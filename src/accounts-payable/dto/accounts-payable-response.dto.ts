import { ApiProperty } from '@nestjs/swagger';
import { BaseTransactionResponseDto } from '../../common/dto/base-response.dto';

export class AccountsPayableResponseDto extends BaseTransactionResponseDto {
  @ApiProperty({
    example: '990e8400-e29b-41d4-a716-446655440010',
    required: false,
  })
  supplierId?: string;

  @ApiProperty({
    example: '770e8400-e29b-41d4-a716-446655440010',
    required: false,
  })
  employeeId?: string;

  @ApiProperty({
    example: '880e8400-e29b-41d4-a716-446655440010',
    required: false,
  })
  serviceProviderId?: string;
}
