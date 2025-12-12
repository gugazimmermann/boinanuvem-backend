import { PartialType } from '@nestjs/swagger';
import { CreateDeathDto } from './create-death.dto';

export class UpdateDeathDto extends PartialType(CreateDeathDto) {}
