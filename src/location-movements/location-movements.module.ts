import { Module } from '@nestjs/common';
import { LocationMovementsController } from './location-movements.controller';
import { LocationMovementsService } from './location-movements.service';
import { PrismaService } from '../common/services/prisma.service';
import { CompanyEntitiesValidationService } from '../common/services/company-entities-validation.service';

@Module({
  controllers: [LocationMovementsController],
  providers: [
    LocationMovementsService,
    PrismaService,
    CompanyEntitiesValidationService,
  ],
  exports: [LocationMovementsService],
})
export class LocationMovementsModule {}
