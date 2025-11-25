import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { PlansController } from './plans.controller';
import { PlansService } from './plans.service';
import { GetPlansQueryDto } from './dto/plan.dto';

describe('PlansController', () => {
  let controller: PlansController;
  let service: PlansService;

  const mockPlansService = {
    findAll: jest.fn(),
  };

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
  ];

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PlansController],
      providers: [
        {
          provide: PlansService,
          useValue: mockPlansService,
        },
        Logger,
      ],
    }).compile();

    controller = module.get<PlansController>(PlansController);
    service = module.get<PlansService>(PlansService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll', () => {
    it('should return all active plans by default', async () => {
      const query: GetPlansQueryDto = {};
      mockPlansService.findAll.mockResolvedValue(mockPlans);

      const result = await controller.findAll(query);

      expect(service.findAll).toHaveBeenCalledWith(query);
      expect(result).toEqual(mockPlans);
    });

    it('should return plans filtered by active status', async () => {
      const query: GetPlansQueryDto = { status: 'active' };
      const activePlans = mockPlans.filter((plan) => plan.status === 'active');
      mockPlansService.findAll.mockResolvedValue(activePlans);

      const result = await controller.findAll(query);

      expect(service.findAll).toHaveBeenCalledWith(query);
      expect(result).toEqual(activePlans);
    });

    it('should return plans filtered by inactive status', async () => {
      const query: GetPlansQueryDto = { status: 'inactive' };
      const inactivePlans = [
        {
          ...mockPlans[0],
          id: 'plan3',
          name: 'Deprecated Plan',
          status: 'inactive',
        },
      ];
      mockPlansService.findAll.mockResolvedValue(inactivePlans);

      const result = await controller.findAll(query);

      expect(service.findAll).toHaveBeenCalledWith(query);
      expect(result).toEqual(inactivePlans);
    });

    it('should return all plans when status is "all"', async () => {
      const query: GetPlansQueryDto = { status: 'all' };
      const allPlans = [
        ...mockPlans,
        { ...mockPlans[0], id: 'plan3', status: 'inactive' },
      ];
      mockPlansService.findAll.mockResolvedValue(allPlans);

      const result = await controller.findAll(query);

      expect(service.findAll).toHaveBeenCalledWith(query);
      expect(result).toEqual(allPlans);
    });

    it('should handle service errors gracefully', async () => {
      const query: GetPlansQueryDto = { status: 'active' };
      const error = new Error('Database connection failed');
      mockPlansService.findAll.mockRejectedValue(error);

      await expect(controller.findAll(query)).rejects.toThrow(error);
      expect(service.findAll).toHaveBeenCalledWith(query);
    });

    it('should log the query parameters', async () => {
      const query: GetPlansQueryDto = { status: 'active' };
      mockPlansService.findAll.mockResolvedValue(mockPlans);

      // Spy on the logger
      const loggerSpy = jest.spyOn(controller['logger'], 'log');

      await controller.findAll(query);

      expect(loggerSpy).toHaveBeenCalledWith(
        `GET /plans called with query: ${JSON.stringify(query)}`,
      );
    });

    it('should return empty array when no plans found', async () => {
      const query: GetPlansQueryDto = { status: 'inactive' };
      mockPlansService.findAll.mockResolvedValue([]);

      const result = await controller.findAll(query);

      expect(service.findAll).toHaveBeenCalledWith(query);
      expect(result).toEqual([]);
    });
  });
});
