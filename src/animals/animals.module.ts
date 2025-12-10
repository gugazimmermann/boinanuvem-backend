import { Module } from '@nestjs/common';
import { AnimalsController } from './animals.controller';
import { AnimalsService } from './animals.service';
import { PrismaService } from '../common/services/prisma.service';

@Module({
  controllers: [AnimalsController],
  providers: [AnimalsService, PrismaService],
  exports: [AnimalsService],
})
export class AnimalsModule {}
