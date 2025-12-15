import { Module } from '@nestjs/common';
import { BuyerObservationsController } from './buyer-observations.controller';
import { BuyerObservationsService } from './buyer-observations.service';
import { PrismaService } from '../common/services/prisma.service';

@Module({
  controllers: [BuyerObservationsController],
  providers: [BuyerObservationsService, PrismaService],
  exports: [BuyerObservationsService],
})
export class BuyerObservationsModule {}
