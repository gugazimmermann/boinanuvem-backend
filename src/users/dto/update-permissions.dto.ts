import { IsObject, ValidateNested, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

class ResourcePermissions {
  @ApiProperty({ example: true })
  @IsBoolean()
  view: boolean;

  @ApiProperty({ example: true })
  @IsBoolean()
  add: boolean;

  @ApiProperty({ example: false })
  @IsBoolean()
  edit: boolean;

  @ApiProperty({ example: false })
  @IsBoolean()
  remove: boolean;
}

class RegistrationPermissions {
  @ApiProperty({ type: ResourcePermissions })
  @ValidateNested()
  @Type(() => ResourcePermissions)
  property: ResourcePermissions;

  @ApiProperty({ type: ResourcePermissions })
  @ValidateNested()
  @Type(() => ResourcePermissions)
  location: ResourcePermissions;

  @ApiProperty({ type: ResourcePermissions })
  @ValidateNested()
  @Type(() => ResourcePermissions)
  employee: ResourcePermissions;

  @ApiProperty({ type: ResourcePermissions })
  @ValidateNested()
  @Type(() => ResourcePermissions)
  serviceProvider: ResourcePermissions;

  @ApiProperty({ type: ResourcePermissions })
  @ValidateNested()
  @Type(() => ResourcePermissions)
  supplier: ResourcePermissions;

  @ApiProperty({ type: ResourcePermissions })
  @ValidateNested()
  @Type(() => ResourcePermissions)
  buyer: ResourcePermissions;

  @ApiProperty({ type: ResourcePermissions })
  @ValidateNested()
  @Type(() => ResourcePermissions)
  inventory: ResourcePermissions;

  @ApiProperty({ type: ResourcePermissions })
  @ValidateNested()
  @Type(() => ResourcePermissions)
  animals: ResourcePermissions;
}

class RecordsPermissions {
  @ApiProperty({ type: ResourcePermissions })
  @ValidateNested()
  @Type(() => ResourcePermissions)
  births: ResourcePermissions;

  @ApiProperty({ type: ResourcePermissions })
  @ValidateNested()
  @Type(() => ResourcePermissions)
  acquisitions: ResourcePermissions;

  @ApiProperty({ type: ResourcePermissions })
  @ValidateNested()
  @Type(() => ResourcePermissions)
  weighings: ResourcePermissions;

  @ApiProperty({ type: ResourcePermissions })
  @ValidateNested()
  @Type(() => ResourcePermissions)
  sales: ResourcePermissions;

  @ApiProperty({ type: ResourcePermissions })
  @ValidateNested()
  @Type(() => ResourcePermissions)
  deaths: ResourcePermissions;

  @ApiProperty({ type: ResourcePermissions })
  @ValidateNested()
  @Type(() => ResourcePermissions)
  sanitaryControls: ResourcePermissions;

  @ApiProperty({ type: ResourcePermissions })
  @ValidateNested()
  @Type(() => ResourcePermissions)
  locationMovements: ResourcePermissions;

  @ApiProperty({ type: ResourcePermissions })
  @ValidateNested()
  @Type(() => ResourcePermissions)
  animalMovements: ResourcePermissions;
}

class BreedingsPermissions {
  @ApiProperty({ type: ResourcePermissions })
  @ValidateNested()
  @Type(() => ResourcePermissions)
  breedings: ResourcePermissions;

  @ApiProperty({ type: ResourcePermissions })
  @ValidateNested()
  @Type(() => ResourcePermissions)
  unconfirmedBreedings: ResourcePermissions;

  @ApiProperty({ type: ResourcePermissions })
  @ValidateNested()
  @Type(() => ResourcePermissions)
  pregnantCows: ResourcePermissions;

  @ApiProperty({ type: ResourcePermissions })
  @ValidateNested()
  @Type(() => ResourcePermissions)
  reproductiveIndexes: ResourcePermissions;

  @ApiProperty({ type: ResourcePermissions })
  @ValidateNested()
  @Type(() => ResourcePermissions)
  birthForecast: ResourcePermissions;
}

class FinancesPermissions {
  @ApiProperty({ type: ResourcePermissions })
  @ValidateNested()
  @Type(() => ResourcePermissions)
  cashFlow: ResourcePermissions;

  @ApiProperty({ type: ResourcePermissions })
  @ValidateNested()
  @Type(() => ResourcePermissions)
  accountsPayable: ResourcePermissions;

  @ApiProperty({ type: ResourcePermissions })
  @ValidateNested()
  @Type(() => ResourcePermissions)
  accountsReceivable: ResourcePermissions;

  @ApiProperty({ type: ResourcePermissions })
  @ValidateNested()
  @Type(() => ResourcePermissions)
  bankAccounts: ResourcePermissions;
}

export class UpdatePermissionsDto {
  @ApiProperty({ type: RegistrationPermissions })
  @IsObject()
  @ValidateNested()
  @Type(() => RegistrationPermissions)
  registration: RegistrationPermissions;

  @ApiProperty({ type: RecordsPermissions })
  @IsObject()
  @ValidateNested()
  @Type(() => RecordsPermissions)
  records: RecordsPermissions;

  @ApiProperty({ type: BreedingsPermissions })
  @IsObject()
  @ValidateNested()
  @Type(() => BreedingsPermissions)
  breedings: BreedingsPermissions;

  @ApiProperty({ type: FinancesPermissions })
  @IsObject()
  @ValidateNested()
  @Type(() => FinancesPermissions)
  finances: FinancesPermissions;
}
