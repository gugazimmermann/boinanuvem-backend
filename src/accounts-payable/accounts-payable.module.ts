import { Module } from '@nestjs/common';
import { AccountsPayableController } from './accounts-payable.controller';
import { AccountsPayableService } from './accounts-payable.service';
import { PrismaService } from '../common/services/prisma.service';

@Module({
  controllers: [AccountsPayableController],
  providers: [AccountsPayableService, PrismaService],
  exports: [AccountsPayableService],
})
export class AccountsPayableModule {}
