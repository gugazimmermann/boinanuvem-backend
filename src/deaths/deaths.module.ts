import { Module } from '@nestjs/common';
import { DeathsController } from './deaths.controller';
import { DeathsService } from './deaths.service';
import { PrismaService } from '../common/services/prisma.service';

@Module({
  controllers: [DeathsController],
  providers: [DeathsService, PrismaService],
  exports: [DeathsService],
})
export class DeathsModule {}
