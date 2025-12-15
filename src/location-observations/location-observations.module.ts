import { Module } from '@nestjs/common';
import { LocationObservationsController } from './location-observations.controller';
import { LocationObservationsService } from './location-observations.service';
import { PrismaService } from '../common/services/prisma.service';

@Module({
  controllers: [LocationObservationsController],
  providers: [LocationObservationsService, PrismaService],
  exports: [LocationObservationsService],
})
export class LocationObservationsModule {}
