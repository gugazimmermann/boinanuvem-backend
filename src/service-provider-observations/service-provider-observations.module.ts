import { Module } from '@nestjs/common';
import { ServiceProviderObservationsController } from './service-provider-observations.controller';
import { ServiceProviderObservationsService } from './service-provider-observations.service';
import { PrismaService } from '../common/services/prisma.service';

@Module({
  controllers: [ServiceProviderObservationsController],
  providers: [ServiceProviderObservationsService, PrismaService],
  exports: [ServiceProviderObservationsService],
})
export class ServiceProviderObservationsModule {}
