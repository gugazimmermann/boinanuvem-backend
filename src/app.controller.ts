import { Controller, Get, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AppService } from './app.service';

@ApiTags('app')
@Controller()
export class AppController {
  private readonly logger = new Logger(AppController.name);

  constructor(private readonly appService: AppService) {}

  @Get()
  @ApiOperation({
    summary: 'Get welcome message',
    description: 'Returns a simple welcome message from the application',
  })
  @ApiResponse({
    status: 200,
    description: 'Welcome message returned successfully',
    schema: {
      type: 'string',
      example: 'Hello World!',
    },
  })
  getHello(): string {
    this.logger.debug('Processing getHello request');
    const result = this.appService.getHello();
    this.logger.debug('Successfully processed getHello request');
    return result;
  }
}
