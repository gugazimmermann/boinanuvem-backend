import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsOptional, IsString } from 'class-validator';
import { BaseMovementCreateDto } from '../../common/dto/base-movement.dto';

export class CreateAnimalMovementDto extends BaseMovementCreateDto {
  @ApiProperty({
    example: 'location-id-1',
    description: 'Location ID where the animals are moved to',
    required: false,
  })
  @IsOptional()
  @IsString()
  locationId?: string;

  @ApiProperty({
    example: ['animal-id-1', 'animal-id-2'],
    description: 'List of animal IDs involved in the movement',
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  animalIds!: string[];
}
