import { ApiProperty } from '@nestjs/swagger';
import { BaseRegistrationResponseDto } from '../../common/dto/registration-base.dto';

export class ServiceProviderResponseDto extends BaseRegistrationResponseDto {
  @ApiProperty({
    example: 'Serviços Agrícolas LTDA',
    description: 'Service provider name',
  })
  declare name: string;
}
