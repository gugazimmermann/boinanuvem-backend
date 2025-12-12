import { PartialType } from '@nestjs/swagger';
import { CreateSanitaryControlDto } from './create-sanitary-control.dto';

export class UpdateSanitaryControlDto extends PartialType(
  CreateSanitaryControlDto,
) {}
