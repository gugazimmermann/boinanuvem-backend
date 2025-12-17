import { Module } from '@nestjs/common';
import { PropertiesController } from './properties.controller';
import { PropertiesService } from './properties.service';
import { PrismaService } from '../common/services/prisma.service';
import { GeocodingService } from '../common/services/geocoding.service';
import { PasturePlanningService } from './services/pasture-planning.service';

@Module({
  controllers: [PropertiesController],
  providers: [
    PropertiesService,
    PrismaService,
    GeocodingService,
    PasturePlanningService,
  ],
  exports: [PropertiesService],
})
export class PropertiesModule {}
