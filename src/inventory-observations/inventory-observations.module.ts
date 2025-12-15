import { Module } from '@nestjs/common';
import { InventoryObservationsController } from './inventory-observations.controller';
import { InventoryObservationsService } from './inventory-observations.service';
import { PrismaService } from '../common/services/prisma.service';

@Module({
  controllers: [InventoryObservationsController],
  providers: [InventoryObservationsService, PrismaService],
  exports: [InventoryObservationsService],
})
export class InventoryObservationsModule {}
