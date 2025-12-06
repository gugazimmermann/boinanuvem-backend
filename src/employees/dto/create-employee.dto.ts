import { ApiProperty } from '@nestjs/swagger';
import { BaseRegistrationCreateDto } from '../../common/dto/registration-base.dto';

export class CreateEmployeeDto extends BaseRegistrationCreateDto {
  @ApiProperty({ example: 'João Silva', description: 'Employee name' })
  declare name: string;
}
