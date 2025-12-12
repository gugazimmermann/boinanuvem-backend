import { Module } from '@nestjs/common';
import { InventoryItemsController } from './inventory-items.controller';
import { InventoryItemsService } from './inventory-items.service';
import { PrismaService } from '../common/services/prisma.service';

@Module({
  controllers: [InventoryItemsController],
  providers: [InventoryItemsService, PrismaService],
  exports: [InventoryItemsService],
})
export class InventoryItemsModule {}
