import { Module } from '@nestjs/common';
import { CashFlowController } from './cash-flow.controller';
import { CashFlowService } from './cash-flow.service';
import { PrismaService } from '../common/services/prisma.service';

@Module({
  controllers: [CashFlowController],
  providers: [CashFlowService, PrismaService],
  exports: [CashFlowService],
})
export class CashFlowModule {}
