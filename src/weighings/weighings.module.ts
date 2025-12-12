import { Module } from '@nestjs/common';
import { WeighingsController } from './weighings.controller';
import { WeighingsService } from './weighings.service';
import { PrismaService } from '../common/services/prisma.service';

@Module({
  controllers: [WeighingsController],
  providers: [WeighingsService, PrismaService],
  exports: [WeighingsService],
})
export class WeighingsModule {}
