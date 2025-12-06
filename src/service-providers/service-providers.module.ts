import { Module } from '@nestjs/common';
import { ServiceProvidersController } from './service-providers.controller';
import { ServiceProvidersService } from './service-providers.service';
import { PrismaService } from '../common/services/prisma.service';

@Module({
  controllers: [ServiceProvidersController],
  providers: [ServiceProvidersService, PrismaService],
  exports: [ServiceProvidersService],
})
export class ServiceProvidersModule {}
