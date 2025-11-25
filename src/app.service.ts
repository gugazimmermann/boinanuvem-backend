import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class AppService {
  private readonly logger = new Logger(AppService.name);

  getHello(): string {
    this.logger.debug('Generating hello message');
    const message = 'Hello World!';
    this.logger.debug(`Generated message: ${message}`);
    return message;
  }
}
