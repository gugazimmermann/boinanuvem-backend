import { ApiProperty } from '@nestjs/swagger';

export class AnimalMovementResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  companyId!: string;

  @ApiProperty()
  propertyId!: string;

  @ApiProperty({ required: false, nullable: true })
  locationId!: string | null;

  @ApiProperty({ type: [String] })
  animalIds!: string[];

  @ApiProperty({ type: [String], required: false })
  employeeIds!: string[];

  @ApiProperty({ type: [String], required: false })
  serviceProviderIds!: string[];

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
