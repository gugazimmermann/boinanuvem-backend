import { ApiProperty } from '@nestjs/swagger';
import { BaseResponseDto } from '../../common/dto/base-response.dto';

export class BankAccountResponseDto extends BaseResponseDto {
  @ApiProperty({ example: 'Banco do Brasil' })
  bankName: string;

  @ApiProperty({ example: '001' })
  bankCode: string;

  @ApiProperty({ example: '1234' })
  branch: string;

  @ApiProperty({ example: '12345-6' })
  accountNumber: string;

  @ApiProperty({ example: 'checking' })
  accountType: string;

  @ApiProperty({ example: 'John Doe', required: false })
  accountHolderName?: string;

  @ApiProperty({ example: 'active' })
  status: string;
}
