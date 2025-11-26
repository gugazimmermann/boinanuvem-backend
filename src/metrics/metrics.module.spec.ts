import { Test, TestingModule } from '@nestjs/testing';
import { MetricsModule } from './metrics.module';
import { MetricsController } from './metrics.controller';
import { MetricsService } from './metrics.service';

describe('MetricsModule', () => {
  let module: TestingModule;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [MetricsModule],
    }).compile();
  });

  afterEach(async () => {
    await module.close();
  });

  it('should be defined', () => {
    expect(module).toBeDefined();
  });

  it('should have MetricsController', () => {
    const controller = module.get<MetricsController>(MetricsController);
    expect(controller).toBeDefined();
  });

  it('should have MetricsService', () => {
    const service = module.get<MetricsService>(MetricsService);
    expect(service).toBeDefined();
  });
});
