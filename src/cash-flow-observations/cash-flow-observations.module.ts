import { Module } from '@nestjs/common';
import { CashFlowObservationsController } from './cash-flow-observations.controller';
import { CashFlowObservationsService } from './cash-flow-observations.service';
import { PrismaService } from '../common/services/prisma.service';

@Module({
  controllers: [CashFlowObservationsController],
  providers: [CashFlowObservationsService, PrismaService],
  exports: [CashFlowObservationsService],
})
export class CashFlowObservationsModule {}
