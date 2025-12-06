import { ApiProperty } from '@nestjs/swagger';
import { BaseRegistrationCreateDto } from '../../common/dto/registration-base.dto';

export class CreateSupplierDto extends BaseRegistrationCreateDto {
  @ApiProperty({
    example: 'Fornecedor de Ração LTDA',
    description: 'Supplier name',
  })
  declare name: string;
}
