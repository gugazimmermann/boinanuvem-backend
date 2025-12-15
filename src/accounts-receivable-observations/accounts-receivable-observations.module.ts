import { Module } from '@nestjs/common';
import { AccountsReceivableObservationsController } from './accounts-receivable-observations.controller';
import { AccountsReceivableObservationsService } from './accounts-receivable-observations.service';
import { PrismaService } from '../common/services/prisma.service';

@Module({
  controllers: [AccountsReceivableObservationsController],
  providers: [AccountsReceivableObservationsService, PrismaService],
  exports: [AccountsReceivableObservationsService],
})
export class AccountsReceivableObservationsModule {}
