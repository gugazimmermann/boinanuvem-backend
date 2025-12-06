import { ApiProperty } from '@nestjs/swagger';
import { BaseRegistrationCreateDto } from '../../common/dto/registration-base.dto';

export class CreateServiceProviderDto extends BaseRegistrationCreateDto {
  @ApiProperty({
    example: 'Serviços Agrícolas LTDA',
    description: 'Service provider name',
  })
  declare name: string;
}
