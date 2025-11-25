import { Injectable, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { GetPlansQueryDto } from './dto/plan.dto';

@Injectable()
export class PlansService {
  private readonly logger = new Logger(PlansService.name);
  private readonly prisma = new PrismaClient();

  async findAll(query: GetPlansQueryDto) {
    const status = query.status || 'active';
    this.logger.log(`Fetching plans with status filter: ${status}`);

    const plans = await this.prisma.plan.findMany({
      where: status === 'all' ? {} : { status },
      orderBy: [
        { popular: 'desc' }, // Popular plans first
        { name: 'asc' }, // Then alphabetically
      ],
    });

    this.logger.log(`Found ${plans.length} plans`);
    return plans;
  }

  async onModuleDestroy() {
    await this.prisma.$disconnect();
  }
}
