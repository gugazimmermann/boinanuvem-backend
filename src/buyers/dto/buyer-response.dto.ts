import { ApiProperty } from '@nestjs/swagger';
import { BaseRegistrationResponseDto } from '../../common/dto/registration-base.dto';

export class BuyerResponseDto extends BaseRegistrationResponseDto {
  @ApiProperty({ example: 'Comprador de Gado LTDA', description: 'Buyer name' })
  declare name: string;
}
