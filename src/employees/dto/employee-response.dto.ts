import { ApiProperty } from '@nestjs/swagger';
import { BaseRegistrationResponseDto } from '../../common/dto/registration-base.dto';

export class EmployeeResponseDto extends BaseRegistrationResponseDto {
  @ApiProperty({ example: 'João Silva', description: 'Employee name' })
  declare name: string;
}
