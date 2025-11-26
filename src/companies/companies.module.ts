import { Module } from '@nestjs/common';
import { CompaniesService } from './companies.service';
import { CompaniesController } from './companies.controller';
import { PrismaService } from '../common/services/prisma.service';
import { AuthModule } from '../auth/auth.module';
import { EmailModule } from '../email/email.module';

@Module({
  imports: [AuthModule, EmailModule],
  controllers: [CompaniesController],
  providers: [CompaniesService, PrismaService],
  exports: [CompaniesService],
})
export class CompaniesModule {}
