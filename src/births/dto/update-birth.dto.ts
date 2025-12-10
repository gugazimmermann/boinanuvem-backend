import { PartialType } from '@nestjs/swagger';
import { CreateBirthDto } from './create-birth.dto';

export class UpdateBirthDto extends PartialType(CreateBirthDto) {}
