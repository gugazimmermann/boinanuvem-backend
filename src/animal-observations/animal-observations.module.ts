import { Module } from '@nestjs/common';
import { AnimalObservationsController } from './animal-observations.controller';
import { AnimalObservationsService } from './animal-observations.service';
import { PrismaService } from '../common/services/prisma.service';

@Module({
  controllers: [AnimalObservationsController],
  providers: [AnimalObservationsService, PrismaService],
  exports: [AnimalObservationsService],
})
export class AnimalObservationsModule {}
