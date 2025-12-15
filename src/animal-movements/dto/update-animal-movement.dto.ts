import { PartialType } from '@nestjs/swagger';
import { CreateAnimalMovementDto } from './create-animal-movement.dto';

export class UpdateAnimalMovementDto extends PartialType(
  CreateAnimalMovementDto,
) {}
