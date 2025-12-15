import { Module } from '@nestjs/common';
import { AnimalMovementsController } from './animal-movements.controller';
import { AnimalMovementsService } from './animal-movements.service';
import { PrismaService } from '../common/services/prisma.service';
import { CompanyEntitiesValidationService } from '../common/services/company-entities-validation.service';

@Module({
  controllers: [AnimalMovementsController],
  providers: [
    AnimalMovementsService,
    PrismaService,
    CompanyEntitiesValidationService,
  ],
  exports: [AnimalMovementsService],
})
export class AnimalMovementsModule {}
