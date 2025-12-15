import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsEnum, IsString } from 'class-validator';
import { LocationMovementType } from './location-movement-type.enum';
import { BaseMovementCreateDto } from '../../common/dto/base-movement.dto';

export class CreateLocationMovementDto extends BaseMovementCreateDto {
  @ApiProperty({
    example: ['location-id-1', 'location-id-2'],
    description: 'List of location IDs involved in the movement',
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  locationIds!: string[];

  @ApiProperty({
    example: LocationMovementType.FEED_DELIVERY,
    enum: LocationMovementType,
    description: 'Movement type',
  })
  @IsEnum(LocationMovementType, {
    message: 'Type must be a valid location movement type',
  })
  type!: LocationMovementType;
}
