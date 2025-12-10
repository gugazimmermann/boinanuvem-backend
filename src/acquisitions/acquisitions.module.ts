import { Module } from '@nestjs/common';
import { AcquisitionsController } from './acquisitions.controller';
import { AcquisitionsService } from './acquisitions.service';
import { PrismaService } from '../common/services/prisma.service';

@Module({
  controllers: [AcquisitionsController],
  providers: [AcquisitionsService, PrismaService],
  exports: [AcquisitionsService],
})
export class AcquisitionsModule {}
