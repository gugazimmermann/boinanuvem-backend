import { Controller, Get, Query, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { PlansService } from './plans.service';
import { GetPlansQueryDto, PlanResponseDto } from './dto/plan.dto';

@ApiTags('plans')
@Controller('plans')
export class PlansController {
  private readonly logger = new Logger(PlansController.name);

  constructor(private readonly plansService: PlansService) {}

  @Get()
  @ApiOperation({
    summary: 'Get all plans',
    description:
      'Retrieve all pricing plans. By default, only active plans are returned. Use status=all to get all plans including inactive ones.',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['active', 'inactive', 'all'],
    description: 'Filter plans by status (default: active)',
  })
  @ApiResponse({
    status: 200,
    description: 'List of plans retrieved successfully',
    type: [PlanResponseDto],
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid query parameters',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
  })
  async findAll(@Query() query: GetPlansQueryDto) {
    this.logger.log(`GET /plans called with query: ${JSON.stringify(query)}`);
    return this.plansService.findAll(query);
  }
}
