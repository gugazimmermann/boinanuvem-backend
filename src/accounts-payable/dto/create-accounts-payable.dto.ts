import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum } from 'class-validator';
import { BaseTransactionCreateDto } from '../../common/dto/base-transaction.dto';

export enum AccountsPayableStatus {
  UNPAID = 'unpaid',
  PAID = 'paid',
  OVERDUE = 'overdue',
  CANCELLED = 'cancelled',
}

export class CreateAccountsPayableDto extends BaseTransactionCreateDto {
  @ApiProperty({
    example: 'unpaid',
    enum: AccountsPayableStatus,
    description: 'Status',
    default: 'unpaid',
  })
  @IsOptional()
  @IsEnum(AccountsPayableStatus)
  declare status?: AccountsPayableStatus;

  @ApiProperty({
    example: '990e8400-e29b-41d4-a716-446655440010',
    description: 'Supplier ID',
    required: false,
  })
  @IsOptional()
  @IsString()
  supplierId?: string;

  @ApiProperty({
    example: '770e8400-e29b-41d4-a716-446655440010',
    description: 'Employee ID',
    required: false,
  })
  @IsOptional()
  @IsString()
  employeeId?: string;

  @ApiProperty({
    example: '880e8400-e29b-41d4-a716-446655440010',
    description: 'Service provider ID',
    required: false,
  })
  @IsOptional()
  @IsString()
  serviceProviderId?: string;
}
