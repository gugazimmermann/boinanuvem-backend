import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { PlansService } from './plans.service';
import { GetPlansQueryDto } from './dto/plan.dto';

// Mock PrismaClient
const mockPrismaClient = {
  plan: {
    findMany: jest.fn(),
  },
  $disconnect: jest.fn(),
};

// Mock the PrismaClient constructor
jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => mockPrismaClient),
}));

describe('PlansService', () => {
  let service: PlansService;

  const mockPlans = [
    {
      id: 'plan1',
      name: 'Básico',
      description: 'Plano ideal para pequenas propriedades.',
      monthlyPrice: 'R$ 99,00',
      annualPrice: 'R$ 950,00',
      limits: {
        properties: '1 Propriedade',
        locations: '20 Localizações',
        animals: '100 Animais',
        members: '5 Membros',
      },
      features: ['Gestão de Animais', 'Controle de Localização'],
      popular: false,
      status: 'active',
      createdAt: new Date('2025-11-25T22:00:00.000Z'),
      updatedAt: new Date('2025-11-25T22:00:00.000Z'),
    },
    {
      id: 'plan2',
      name: 'Padrão',
      description: 'Plano completo para propriedades em crescimento.',
      monthlyPrice: 'R$ 149,90',
      annualPrice: 'R$ 1.439,00',
      limits: {
        properties: '1 Propriedade',
        locations: 'Ilimitadas',
        animals: '500 Animais',
        members: 'Ilimitados',
      },
      features: ['Gestão de Animais', 'Controle de Localização'],
      popular: true,
      status: 'active',
      createdAt: new Date('2025-11-25T22:00:00.000Z'),
      updatedAt: new Date('2025-11-25T22:00:00.000Z'),
    },
    {
      id: 'plan3',
      name: 'Deprecated Plan',
      description: 'Old plan no longer available.',
      monthlyPrice: 'R$ 50,00',
      annualPrice: 'R$ 500,00',
      limits: {
        properties: '1 Propriedade',
        locations: '5 Localizações',
        animals: '25 Animais',
        members: '1 Membro',
      },
      features: ['Basic Features'],
      popular: false,
      status: 'inactive',
      createdAt: new Date('2025-11-25T22:00:00.000Z'),
      updatedAt: new Date('2025-11-25T22:00:00.000Z'),
    },
  ];

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PlansService, Logger],
    }).compile();

    service = module.get<PlansService>(PlansService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return active plans by default', async () => {
      const query: GetPlansQueryDto = { status: 'active' };
      const activePlans = mockPlans.filter((plan) => plan.status === 'active');
      mockPrismaClient.plan.findMany.mockResolvedValue(activePlans);

      const result = await service.findAll(query);

      expect(mockPrismaClient.plan.findMany).toHaveBeenCalledWith({
        where: { status: 'active' },
        orderBy: [{ popular: 'desc' }, { name: 'asc' }],
      });
      expect(result).toEqual(activePlans);
    });

    it('should return inactive plans when status is inactive', async () => {
      const query: GetPlansQueryDto = { status: 'inactive' };
      const inactivePlans = mockPlans.filter(
        (plan) => plan.status === 'inactive',
      );
      mockPrismaClient.plan.findMany.mockResolvedValue(inactivePlans);

      const result = await service.findAll(query);

      expect(mockPrismaClient.plan.findMany).toHaveBeenCalledWith({
        where: { status: 'inactive' },
        orderBy: [{ popular: 'desc' }, { name: 'asc' }],
      });
      expect(result).toEqual(inactivePlans);
    });

    it('should return all plans when status is "all"', async () => {
      const query: GetPlansQueryDto = { status: 'all' };
      mockPrismaClient.plan.findMany.mockResolvedValue(mockPlans);

      const result = await service.findAll(query);

      expect(mockPrismaClient.plan.findMany).toHaveBeenCalledWith({
        where: {},
        orderBy: [{ popular: 'desc' }, { name: 'asc' }],
      });
      expect(result).toEqual(mockPlans);
    });

    it('should handle undefined status as active', async () => {
      const query: GetPlansQueryDto = {};
      const activePlans = mockPlans.filter((plan) => plan.status === 'active');
      mockPrismaClient.plan.findMany.mockResolvedValue(activePlans);

      const result = await service.findAll(query);

      expect(mockPrismaClient.plan.findMany).toHaveBeenCalledWith({
        where: { status: 'active' },
        orderBy: [{ popular: 'desc' }, { name: 'asc' }],
      });
      expect(result).toEqual(activePlans);
    });

    it('should order plans by popular first, then alphabetically', async () => {
      const query: GetPlansQueryDto = { status: 'active' };
      mockPrismaClient.plan.findMany.mockResolvedValue(mockPlans);

      await service.findAll(query);

      expect(mockPrismaClient.plan.findMany).toHaveBeenCalledWith({
        where: { status: 'active' },
        orderBy: [{ popular: 'desc' }, { name: 'asc' }],
      });
    });

    it('should return empty array when no plans found', async () => {
      const query: GetPlansQueryDto = { status: 'active' };
      mockPrismaClient.plan.findMany.mockResolvedValue([]);

      const result = await service.findAll(query);

      expect(result).toEqual([]);
    });

    it('should log the status filter and results count', async () => {
      const query: GetPlansQueryDto = { status: 'active' };
      const activePlans = mockPlans.filter((plan) => plan.status === 'active');
      mockPrismaClient.plan.findMany.mockResolvedValue(activePlans);

      // Spy on the logger
      const loggerSpy = jest.spyOn(service['logger'], 'log');

      await service.findAll(query);

      expect(loggerSpy).toHaveBeenCalledWith(
        'Fetching plans with status filter: active',
      );
      expect(loggerSpy).toHaveBeenCalledWith(
        `Found ${activePlans.length} plans`,
      );
    });

    it('should handle database errors', async () => {
      const query: GetPlansQueryDto = { status: 'active' };
      const error = new Error('Database connection failed');
      mockPrismaClient.plan.findMany.mockRejectedValue(error);

      await expect(service.findAll(query)).rejects.toThrow(error);
    });
  });

  describe('onModuleDestroy', () => {
    it('should disconnect from Prisma client', async () => {
      await service.onModuleDestroy();

      expect(mockPrismaClient.$disconnect).toHaveBeenCalled();
    });

    it('should handle disconnect errors gracefully', async () => {
      const error = new Error('Disconnect failed');
      mockPrismaClient.$disconnect.mockRejectedValue(error);

      await expect(service.onModuleDestroy()).rejects.toThrow(error);
    });
  });
});
