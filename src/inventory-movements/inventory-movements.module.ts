import { Module } from '@nestjs/common';
import { InventoryMovementsController } from './inventory-movements.controller';
import { InventoryMovementsService } from './inventory-movements.service';
import { PrismaService } from '../common/services/prisma.service';

@Module({
  controllers: [InventoryMovementsController],
  providers: [InventoryMovementsService, PrismaService],
  exports: [InventoryMovementsService],
})
export class InventoryMovementsModule {}
