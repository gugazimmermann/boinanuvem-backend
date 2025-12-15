import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../common/services/prisma.service';
import { BirthsService } from './births.service';

// Lightweight smoke test to ensure the BirthsService
// can be instantiated in a testing module. This keeps
// the integration spec meaningful without heavy setup.
describe('BirthsService (integration-lite)', () => {
  let module: TestingModule;
  let service: BirthsService;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      providers: [PrismaService, BirthsService],
    }).compile();

    service = module.get(BirthsService);
  });

  afterAll(async () => {
    await module.close();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
