import { Module } from '@nestjs/common';
import { BirthsController } from './births.controller';
import { BirthsService } from './births.service';
import { PrismaService } from '../common/services/prisma.service';

@Module({
  controllers: [BirthsController],
  providers: [BirthsService, PrismaService],
  exports: [BirthsService],
})
export class BirthsModule {}
