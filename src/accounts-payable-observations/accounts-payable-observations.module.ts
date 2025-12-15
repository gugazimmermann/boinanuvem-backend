import { Module } from '@nestjs/common';
import { AccountsPayableObservationsController } from './accounts-payable-observations.controller';
import { AccountsPayableObservationsService } from './accounts-payable-observations.service';
import { PrismaService } from '../common/services/prisma.service';

@Module({
  controllers: [AccountsPayableObservationsController],
  providers: [AccountsPayableObservationsService, PrismaService],
  exports: [AccountsPayableObservationsService],
})
export class AccountsPayableObservationsModule {}
