import { PartialType } from '@nestjs/swagger';
import { CreateSanitaryControlDto } from './create-sanitary-control.dto';

export class UpdateSanitaryControlDto extends PartialType(
  CreateSanitaryControlDto,
) {
  // All fields are optional via PartialType
  // appliedMedicines, itemId, quantity, calculatedDosage are inherited from CreateSanitaryControlDto
}
