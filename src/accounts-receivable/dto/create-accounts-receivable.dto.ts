import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum } from 'class-validator';
import { BaseTransactionCreateDto } from '../../common/dto/base-transaction.dto';

export enum AccountsReceivableStatus {
  UNPAID = 'unpaid',
  PAID = 'paid',
  OVERDUE = 'overdue',
  PARTIAL = 'partial',
}

export class CreateAccountsReceivableDto extends BaseTransactionCreateDto {
  @ApiProperty({
    example: 'unpaid',
    enum: AccountsReceivableStatus,
    description: 'Status',
    default: 'unpaid',
  })
  @IsOptional()
  @IsEnum(AccountsReceivableStatus)
  declare status?: AccountsReceivableStatus;

  @ApiProperty({
    example: 'aa0e8400-e29b-41d4-a716-446655440010',
    description: 'Buyer ID',
    required: false,
  })
  @IsOptional()
  @IsString()
  buyerId?: string;
}
