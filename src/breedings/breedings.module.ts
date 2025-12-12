import { Module } from '@nestjs/common';
import { BreedingsController } from './breedings.controller';
import { BreedingsService } from './breedings.service';
import { PrismaService } from '../common/services/prisma.service';

@Module({
  controllers: [BreedingsController],
  providers: [BreedingsService, PrismaService],
  exports: [BreedingsService],
})
export class BreedingsModule {}
