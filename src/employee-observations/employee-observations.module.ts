import { Module } from '@nestjs/common';
import { EmployeeObservationsController } from './employee-observations.controller';
import { EmployeeObservationsService } from './employee-observations.service';
import { PrismaService } from '../common/services/prisma.service';

@Module({
  controllers: [EmployeeObservationsController],
  providers: [EmployeeObservationsService, PrismaService],
  exports: [EmployeeObservationsService],
})
export class EmployeeObservationsModule {}
