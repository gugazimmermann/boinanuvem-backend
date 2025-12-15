import { ApiProperty } from '@nestjs/swagger';
import { LocationMovementType } from './location-movement-type.enum';

export class LocationMovementResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  companyId!: string;

  @ApiProperty()
  propertyId!: string;

  @ApiProperty({ type: [String] })
  locationIds!: string[];

  @ApiProperty({ type: [String], required: false })
  employeeIds!: string[];

  @ApiProperty({ type: [String], required: false })
  serviceProviderIds!: string[];

  @ApiProperty({ enum: LocationMovementType })
  type!: LocationMovementType;

  @ApiProperty()
  date!: string;

  @ApiProperty({ required: false, nullable: true })
  observation!: string | null;

  @ApiProperty({ type: [String], required: false })
  fileIds!: string[];

  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  updatedAt!: string;
}
