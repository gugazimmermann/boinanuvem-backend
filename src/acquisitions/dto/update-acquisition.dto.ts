import { PartialType } from '@nestjs/swagger';
import { CreateAcquisitionDto } from './create-acquisition.dto';

export class UpdateAcquisitionDto extends PartialType(CreateAcquisitionDto) {}
