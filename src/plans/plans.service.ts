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

    // Sort plans by monthly price (ascending)
    const sortedPlans = plans.sort((a, b) => {
      // Extract numeric value from price strings like "R$ 99,00"
      const priceA = this.extractPriceValue(a.monthlyPrice);
      const priceB = this.extractPriceValue(b.monthlyPrice);
      return priceA - priceB;
    });

    this.logger.log(`Found ${plans.length} plans, sorted by price`);
    return sortedPlans;
  }

  private extractPriceValue(priceString: string): number {
    // Remove "R$", spaces, and convert comma to dot for decimal parsing
    const numericString = priceString
      .replace(/R\$\s*/g, '')
      .replace(/\./g, '') // Remove thousands separator
      .replace(/,/g, '.'); // Convert decimal separator

    return parseFloat(numericString) || 0;
  }

  async onModuleDestroy() {
    await this.prisma.$disconnect();
  }
}
