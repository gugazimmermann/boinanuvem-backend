import { PartialType } from '@nestjs/swagger';
import { CreateLocationMovementDto } from './create-location-movement.dto';

export class UpdateLocationMovementDto extends PartialType(
  CreateLocationMovementDto,
) {}
