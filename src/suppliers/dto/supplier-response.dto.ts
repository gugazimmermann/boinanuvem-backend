import { ApiProperty } from '@nestjs/swagger';
import { BaseRegistrationResponseDto } from '../../common/dto/registration-base.dto';

export class SupplierResponseDto extends BaseRegistrationResponseDto {
  @ApiProperty({
    example: 'Fornecedor de Ração LTDA',
    description: 'Supplier name',
  })
  declare name: string;
}
