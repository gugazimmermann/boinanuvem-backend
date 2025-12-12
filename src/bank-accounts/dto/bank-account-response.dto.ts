import { ApiProperty } from '@nestjs/swagger';

export class BankAccountResponseDto {
  @ApiProperty({ example: '660e8400-e29b-41d4-a716-446655440010' })
  id: string;

  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  companyId: string;

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

  @ApiProperty({ example: '2025-01-20T00:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2025-01-20T00:00:00.000Z' })
  updatedAt: Date;
}
