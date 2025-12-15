import { Module } from '@nestjs/common';
import { SupplierObservationsController } from './supplier-observations.controller';
import { SupplierObservationsService } from './supplier-observations.service';
import { PrismaService } from '../common/services/prisma.service';

@Module({
  controllers: [SupplierObservationsController],
  providers: [SupplierObservationsService, PrismaService],
  exports: [SupplierObservationsService],
})
export class SupplierObservationsModule {}
