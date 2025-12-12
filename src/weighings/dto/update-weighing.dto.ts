import { PartialType } from '@nestjs/swagger';
import { CreateWeighingDto } from './create-weighing.dto';

export class UpdateWeighingDto extends PartialType(CreateWeighingDto) {}
