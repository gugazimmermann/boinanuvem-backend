import { PartialType } from '@nestjs/swagger';
import { CreateBuyerDto } from './create-buyer.dto';
import { IsArray, IsOptional, IsString } from 'class-validator';

export class UpdateBuyerDto extends PartialType(CreateBuyerDto) {
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  propertyIds?: string[];
}
