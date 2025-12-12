import { Module } from '@nestjs/common';
import { AccountsReceivableController } from './accounts-receivable.controller';
import { AccountsReceivableService } from './accounts-receivable.service';
import { PrismaService } from '../common/services/prisma.service';

@Module({
  controllers: [AccountsReceivableController],
  providers: [AccountsReceivableService, PrismaService],
  exports: [AccountsReceivableService],
})
export class AccountsReceivableModule {}
