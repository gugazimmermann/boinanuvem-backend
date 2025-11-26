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
    });

    // Sort plans by popular first, then alphabetically by name
    const sortedPlans = plans.sort((a, b) => {
      // First, sort by popular (popular plans come first)
      if (a.popular !== b.popular) {
        return b.popular ? 1 : -1; // popular plans (true) come first
      }

      // Then sort alphabetically by name
      return a.name.localeCompare(b.name);
    });

    this.logger.log(
      `Found ${plans.length} plans, sorted by popularity then alphabetically`,
    );
    return sortedPlans;
  }

  async onModuleDestroy() {
    await this.prisma.$disconnect();
  }
}
