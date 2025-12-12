import { Module } from '@nestjs/common';
import { SanitaryControlsController } from './sanitary-controls.controller';
import { SanitaryControlsService } from './sanitary-controls.service';
import { PrismaService } from '../common/services/prisma.service';

@Module({
  controllers: [SanitaryControlsController],
  providers: [SanitaryControlsService, PrismaService],
  exports: [SanitaryControlsService],
})
export class SanitaryControlsModule {}
