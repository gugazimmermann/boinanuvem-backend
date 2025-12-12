import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { BaseServiceHelper } from './base-service.helper';
import { PrismaService } from './prisma.service';

// Create a test class that extends BaseServiceHelper to test protected methods
class TestServiceHelper extends BaseServiceHelper {
  async testGetUserCompanyId(userId: string): Promise<string> {
    return this.getUserCompanyId(userId);
  }

  async testValidateAnimalBelongsToCompany(
    animalId: string,
    companyId: string,
  ): Promise<void> {
    return this.validateAnimalBelongsToCompany(animalId, companyId);
  }

  async testValidatePropertyBelongsToCompany(
    propertyId: string,
    companyId: string,
  ): Promise<void> {
    return this.validatePropertyBelongsToCompany(propertyId, companyId);
  }

  async testValidateBuyerBelongsToCompany(
    buyerId: string,
    companyId: string,
  ): Promise<void> {
    return this.validateBuyerBelongsToCompany(buyerId, companyId);
  }

  async testValidateEmployeeBelongsToCompany(
    employeeId: string,
    companyId: string,
  ): Promise<void> {
    return this.validateEmployeeBelongsToCompany(employeeId, companyId);
  }

  async testValidateEmployeesBelongToCompany(
    employeeIds: string[],
    companyId: string,
  ): Promise<void> {
    return this.validateEmployeesBelongToCompany(employeeIds, companyId);
  }

  async testValidateServiceProviderBelongsToCompany(
    serviceProviderId: string,
    companyId: string,
  ): Promise<void> {
    return this.validateServiceProviderBelongsToCompany(
      serviceProviderId,
      companyId,
    );
  }

  async testValidateServiceProvidersBelongToCompany(
    serviceProviderIds: string[],
    companyId: string,
  ): Promise<void> {
    return this.validateServiceProvidersBelongToCompany(
      serviceProviderIds,
      companyId,
    );
  }

  async testValidateSupplierBelongsToCompany(
    supplierId: string,
    companyId: string,
  ): Promise<void> {
    return this.validateSupplierBelongsToCompany(supplierId, companyId);
  }

  async testFindEntityByIdAndCompany<T>(
    model: string,
    id: string,
    companyId: string,
    include?: any,
    errorMessage?: string,
  ): Promise<T> {
    return this.findEntityByIdAndCompany<T>(
      model,
      id,
      companyId,
      include,
      errorMessage,
    );
  }

  testTransformDecimal(
    value: { toNumber(): number } | number | null | undefined,
  ): number | undefined {
    return this.transformDecimal(value);
  }
}

describe('BaseServiceHelper', () => {
  let service: TestServiceHelper;
  let prismaService: jest.Mocked<PrismaService>;

  beforeEach(async () => {
    const mockPrismaService = {
      user: {
        findUnique: jest.fn(),
      },
      animal: {
        findFirst: jest.fn(),
      },
      property: {
        findFirst: jest.fn(),
      },
      buyer: {
        findFirst: jest.fn(),
      },
      employee: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
      },
      serviceProvider: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
      },
      supplier: {
        findFirst: jest.fn(),
      },
      sale: {
        findFirst: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TestServiceHelper,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<TestServiceHelper>(TestServiceHelper);
    prismaService = module.get(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getUserCompanyId', () => {
    it('should return company ID for user', async () => {
      prismaService.user.findUnique.mockResolvedValue({
        companyId: 'company-1',
      });

      const result = await service.testGetUserCompanyId('user-1');

      expect(result).toBe('company-1');
      expect(prismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        select: { companyId: true },
      });
    });

    it('should throw NotFoundException if user not found', async () => {
      prismaService.user.findUnique.mockResolvedValue(null);

      await expect(
        service.testGetUserCompanyId('invalid-user'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('validateAnimalBelongsToCompany', () => {
    it('should not throw if animal belongs to company', async () => {
      prismaService.animal.findFirst.mockResolvedValue({ id: 'animal-1' });

      await expect(
        service.testValidateAnimalBelongsToCompany('animal-1', 'company-1'),
      ).resolves.not.toThrow();
    });

    it('should throw NotFoundException if animal not found', async () => {
      prismaService.animal.findFirst.mockResolvedValue(null);

      await expect(
        service.testValidateAnimalBelongsToCompany('animal-1', 'company-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('validatePropertyBelongsToCompany', () => {
    it('should not throw if property belongs to company', async () => {
      prismaService.property.findFirst.mockResolvedValue({ id: 'property-1' });

      await expect(
        service.testValidatePropertyBelongsToCompany('property-1', 'company-1'),
      ).resolves.not.toThrow();
    });

    it('should throw NotFoundException if property not found', async () => {
      prismaService.property.findFirst.mockResolvedValue(null);

      await expect(
        service.testValidatePropertyBelongsToCompany('property-1', 'company-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('validateBuyerBelongsToCompany', () => {
    it('should not throw if buyer belongs to company', async () => {
      prismaService.buyer.findFirst.mockResolvedValue({ id: 'buyer-1' });

      await expect(
        service.testValidateBuyerBelongsToCompany('buyer-1', 'company-1'),
      ).resolves.not.toThrow();
    });

    it('should throw NotFoundException if buyer not found', async () => {
      prismaService.buyer.findFirst.mockResolvedValue(null);

      await expect(
        service.testValidateBuyerBelongsToCompany('buyer-1', 'company-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('validateEmployeeBelongsToCompany', () => {
    it('should not throw if employee belongs to company', async () => {
      prismaService.employee.findFirst.mockResolvedValue({ id: 'employee-1' });

      await expect(
        service.testValidateEmployeeBelongsToCompany('employee-1', 'company-1'),
      ).resolves.not.toThrow();
    });

    it('should throw NotFoundException if employee not found', async () => {
      prismaService.employee.findFirst.mockResolvedValue(null);

      await expect(
        service.testValidateEmployeeBelongsToCompany('employee-1', 'company-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('validateEmployeesBelongToCompany', () => {
    it('should not throw if all employees belong to company', async () => {
      prismaService.employee.findMany.mockResolvedValue([
        { id: 'employee-1' },
        { id: 'employee-2' },
      ]);

      await expect(
        service.testValidateEmployeesBelongToCompany(
          ['employee-1', 'employee-2'],
          'company-1',
        ),
      ).resolves.not.toThrow();
    });

    it('should throw NotFoundException if not all employees found', async () => {
      prismaService.employee.findMany.mockResolvedValue([{ id: 'employee-1' }]);

      await expect(
        service.testValidateEmployeesBelongToCompany(
          ['employee-1', 'employee-2'],
          'company-1',
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('validateServiceProviderBelongsToCompany', () => {
    it('should not throw if service provider belongs to company', async () => {
      prismaService.serviceProvider.findFirst.mockResolvedValue({
        id: 'sp-1',
      });

      await expect(
        service.testValidateServiceProviderBelongsToCompany(
          'sp-1',
          'company-1',
        ),
      ).resolves.not.toThrow();
    });

    it('should throw NotFoundException if service provider not found', async () => {
      prismaService.serviceProvider.findFirst.mockResolvedValue(null);

      await expect(
        service.testValidateServiceProviderBelongsToCompany(
          'sp-1',
          'company-1',
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('validateServiceProvidersBelongToCompany', () => {
    it('should not throw if all service providers belong to company', async () => {
      prismaService.serviceProvider.findMany.mockResolvedValue([
        { id: 'sp-1' },
        { id: 'sp-2' },
      ]);

      await expect(
        service.testValidateServiceProvidersBelongToCompany(
          ['sp-1', 'sp-2'],
          'company-1',
        ),
      ).resolves.not.toThrow();
    });

    it('should throw NotFoundException if not all service providers found', async () => {
      prismaService.serviceProvider.findMany.mockResolvedValue([
        { id: 'sp-1' },
      ]);

      await expect(
        service.testValidateServiceProvidersBelongToCompany(
          ['sp-1', 'sp-2'],
          'company-1',
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('validateSupplierBelongsToCompany', () => {
    it('should not throw if supplier belongs to company', async () => {
      prismaService.supplier.findFirst.mockResolvedValue({ id: 'supplier-1' });

      await expect(
        service.testValidateSupplierBelongsToCompany('supplier-1', 'company-1'),
      ).resolves.not.toThrow();
    });

    it('should throw NotFoundException if supplier not found', async () => {
      prismaService.supplier.findFirst.mockResolvedValue(null);

      await expect(
        service.testValidateSupplierBelongsToCompany('supplier-1', 'company-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('findEntityByIdAndCompany', () => {
    it('should find entity by ID and company', async () => {
      const mockEntity = { id: 'sale-1', companyId: 'company-1' };
      prismaService.sale.findFirst = jest.fn().mockResolvedValue(mockEntity);

      const result = await service.testFindEntityByIdAndCompany(
        'sale',
        'sale-1',
        'company-1',
      );

      expect(result).toEqual(mockEntity);
      expect(prismaService.sale.findFirst).toHaveBeenCalled();
    });

    it('should find entity with include', async () => {
      const mockEntity = {
        id: 'sale-1',
        companyId: 'company-1',
        saleItems: [{ id: 'item-1' }],
      };
      prismaService.sale.findFirst = jest.fn().mockResolvedValue(mockEntity);

      const result = await service.testFindEntityByIdAndCompany(
        'sale',
        'sale-1',
        'company-1',
        { saleItems: true },
      );

      expect(result).toEqual(mockEntity);
    });

    it('should throw NotFoundException if entity not found', async () => {
      prismaService.sale.findFirst = jest.fn().mockResolvedValue(null);

      await expect(
        service.testFindEntityByIdAndCompany('sale', 'sale-1', 'company-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should use custom error message if provided', async () => {
      prismaService.sale.findFirst = jest.fn().mockResolvedValue(null);

      await expect(
        service.testFindEntityByIdAndCompany(
          'sale',
          'sale-1',
          'company-1',
          undefined,
          'Custom error message',
        ),
      ).rejects.toThrow('Custom error message');
    });
  });

  describe('transformDecimal', () => {
    it('should transform Decimal object to number', () => {
      const decimalValue = { toNumber: () => 100.5 };
      const result = service.testTransformDecimal(decimalValue);
      expect(result).toBe(100.5);
    });

    it('should return number as is', () => {
      const result = service.testTransformDecimal(100.5);
      expect(result).toBe(100.5);
    });

    it('should return undefined for null', () => {
      const result = service.testTransformDecimal(null);
      expect(result).toBeUndefined();
    });

    it('should return undefined for undefined', () => {
      const result = service.testTransformDecimal(undefined);
      expect(result).toBeUndefined();
    });
  });
});
