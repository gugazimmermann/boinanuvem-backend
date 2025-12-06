import { ApiProperty } from '@nestjs/swagger';
import { BaseRegistrationCreateDto } from '../../common/dto/registration-base.dto';

export class CreateBuyerDto extends BaseRegistrationCreateDto {
  @ApiProperty({ example: 'Comprador de Gado LTDA', description: 'Buyer name' })
  declare name: string;
}
