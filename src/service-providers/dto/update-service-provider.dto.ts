import { PartialType } from '@nestjs/swagger';
import { CreateServiceProviderDto } from './create-service-provider.dto';
import { IsArray, IsOptional, IsString } from 'class-validator';

export class UpdateServiceProviderDto extends PartialType(
  CreateServiceProviderDto,
) {
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  propertyIds?: string[];
}
