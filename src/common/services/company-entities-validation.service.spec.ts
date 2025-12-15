import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { CompanyEntitiesValidationService } from './company-entities-validation.service';
import { PrismaService } from './prisma.service';

describe('CompanyEntitiesValidationService', () => {
  let service: CompanyEntitiesValidationService;
  let prisma: jest.Mocked<PrismaService>;

  beforeEach(async () => {
    const mockPrisma: Partial<jest.Mocked<PrismaService>> = {
      user: { findUnique: jest.fn() } as any,
      property: { findFirst: jest.fn() } as any,
      location: { findFirst: jest.fn(), findMany: jest.fn() } as any,
      employee: { findFirst: jest.fn(), findMany: jest.fn() } as any,
      serviceProvider: { findFirst: jest.fn(), findMany: jest.fn() } as any,
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CompanyEntitiesValidationService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get(CompanyEntitiesValidationService);
    prisma = module.get(PrismaService) as jest.Mocked<PrismaService>;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getUserCompanyId', () => {
    it('returns companyId when user exists', async () => {
      prisma.user.findUnique.mockResolvedValue({
        companyId: 'company-1',
      } as any);

      const result = await service.getUserCompanyId('user-1');

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        select: { companyId: true },
      });
      expect(result).toBe('company-1');
    });

    it('throws NotFoundException when user does not exist', async () => {
      prisma.user.findUnique.mockResolvedValue(null as any);

      await expect(service.getUserCompanyId('user-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  it('validates property belongs to company', async () => {
    prisma.property.findFirst.mockResolvedValue({ id: 'prop-1' } as any);

    await service.validatePropertyBelongsToCompany('prop-1', 'company-1');

    expect(prisma.property.findFirst).toHaveBeenCalled();
  });

  it('throws when property does not belong to company', async () => {
    prisma.property.findFirst.mockResolvedValue(null as any);

    await expect(
      service.validatePropertyBelongsToCompany('prop-1', 'company-1'),
    ).rejects.toThrow(NotFoundException);
  });

  it('validates location belongs to company', async () => {
    prisma.location.findFirst.mockResolvedValue({ id: 'loc-1' } as any);

    await service.validateLocationBelongsToCompany('loc-1', 'company-1');

    expect(prisma.location.findFirst).toHaveBeenCalled();
  });

  it('throws when location does not belong to company', async () => {
    prisma.location.findFirst.mockResolvedValue(null as any);

    await expect(
      service.validateLocationBelongsToCompany('loc-1', 'company-1'),
    ).rejects.toThrow(NotFoundException);
  });

  it('validates location belongs to company and property', async () => {
    prisma.location.findFirst.mockResolvedValue({ id: 'loc-1' } as any);

    await service.validateLocationBelongsToCompanyAndProperty(
      'loc-1',
      'prop-1',
      'company-1',
    );

    expect(prisma.location.findFirst).toHaveBeenCalled();
  });

  it('throws when location does not belong to company/property', async () => {
    prisma.location.findFirst.mockResolvedValue(null as any);

    await expect(
      service.validateLocationBelongsToCompanyAndProperty(
        'loc-1',
        'prop-1',
        'company-1',
      ),
    ).rejects.toThrow(NotFoundException);
  });

  it('validates employees belong to company', async () => {
    prisma.employee.findMany.mockResolvedValue([
      { id: 'emp-1' } as any,
      { id: 'emp-2' } as any,
    ]);

    await service.validateEmployeesBelongToCompany(
      ['emp-1', 'emp-2'],
      'company-1',
    );

    expect(prisma.employee.findMany).toHaveBeenCalled();
  });

  it('throws when any employee does not belong to company', async () => {
    prisma.employee.findMany.mockResolvedValue([{ id: 'emp-1' } as any]);

    await expect(
      service.validateEmployeesBelongToCompany(['emp-1', 'emp-2'], 'company-1'),
    ).rejects.toThrow(NotFoundException);
  });

  it('validates single employee belongs to company', async () => {
    prisma.employee.findFirst.mockResolvedValue({ id: 'emp-1' } as any);

    await service.validateEmployeeBelongsToCompany('emp-1', 'company-1');

    expect(prisma.employee.findFirst).toHaveBeenCalled();
  });

  it('throws when employee does not belong to company', async () => {
    prisma.employee.findFirst.mockResolvedValue(null as any);

    await expect(
      service.validateEmployeeBelongsToCompany('emp-1', 'company-1'),
    ).rejects.toThrow(NotFoundException);
  });

  it('validates service providers belong to company', async () => {
    prisma.serviceProvider.findMany.mockResolvedValue([
      { id: 'sp-1' } as any,
      { id: 'sp-2' } as any,
    ]);

    await service.validateServiceProvidersBelongToCompany(
      ['sp-1', 'sp-2'],
      'company-1',
    );

    expect(prisma.serviceProvider.findMany).toHaveBeenCalled();
  });

  it('throws when any service provider does not belong to company', async () => {
    prisma.serviceProvider.findMany.mockResolvedValue([{ id: 'sp-1' } as any]);

    await expect(
      service.validateServiceProvidersBelongToCompany(
        ['sp-1', 'sp-2'],
        'company-1',
      ),
    ).rejects.toThrow(NotFoundException);
  });

  it('validates single service provider belongs to company', async () => {
    prisma.serviceProvider.findFirst.mockResolvedValue({ id: 'sp-1' } as any);

    await service.validateServiceProviderBelongsToCompany('sp-1', 'company-1');

    expect(prisma.serviceProvider.findFirst).toHaveBeenCalled();
  });

  it('throws when service provider does not belong to company', async () => {
    prisma.serviceProvider.findFirst.mockResolvedValue(null as any);

    await expect(
      service.validateServiceProviderBelongsToCompany('sp-1', 'company-1'),
    ).rejects.toThrow(NotFoundException);
  });
});
