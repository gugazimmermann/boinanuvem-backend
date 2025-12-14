import { PartialType } from '@nestjs/swagger';
import { CreateInventoryMovementDto } from './create-inventory-movement.dto';

export class UpdateInventoryMovementDto extends PartialType(
  CreateInventoryMovementDto,
) {
  // All fields are optional via PartialType
  // The ValidateIf decorator on supplierId in CreateInventoryMovementDto
  // will still work correctly - if supplierId is provided and type is PURCHASE,
  // it will be validated as required
}
