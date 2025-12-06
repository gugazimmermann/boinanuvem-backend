import { Module } from '@nestjs/common';
import { BuyersController } from './buyers.controller';
import { BuyersService } from './buyers.service';
import { PrismaService } from '../common/services/prisma.service';

@Module({
  controllers: [BuyersController],
  providers: [BuyersService, PrismaService],
  exports: [BuyersService],
})
export class BuyersModule {}
