import { Test, TestingModule } from '@nestjs/testing';
import { ThrottlerModule } from '@nestjs/throttler';
import { CompaniesController } from './companies.controller';
import { CompaniesService } from './companies.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RegisterCompanyDto, UpdateCompanyDto } from './dto';
import type { CurrentUser } from '../auth/decorators/current-user.decorator';

describe('CompaniesController', () => {
  let controller: CompaniesController;
  let companiesService: jest.Mocked<CompaniesService>;

  const mockCurrentUser: CurrentUser = {
    id: 'user-1',
    email: 'main@test.com',
    companyId: 'company-1',
    mainUser: true,
  };

  const mockTeamMember: CurrentUser = {
    id: 'user-2',
    email: 'team@test.com',
    companyId: 'company-1',
    mainUser: false,
  };

  const mockRegisterCompanyDto: RegisterCompanyDto = {
    cnpj: '12.345.678/0001-90',
    companyName: 'Test Company',
    email: 'company@test.com',
    phone: '(11) 99999-9999',
    street: 'Test Street',
    number: '123',
    complement: 'Suite 456',
    neighborhood: 'Test Neighborhood',
    city: 'Test City',
    state: 'SP',
    zipCode: '12345-678',
    latitude: -23.5505,
    longitude: -46.6333,
    userName: 'Main User',
    userEmail: 'user@test.com',
    userPhone: '(11) 88888-8888',
    userCpf: '123.456.789-00',
    userPassword: 'password123',
  };

  const mockUpdateCompanyDto: UpdateCompanyDto = {
    companyName: 'Updated Company Name',
    email: 'updated@test.com',
    phone: '(11) 77777-7777',
    street: 'Updated Street',
    number: '456',
    complement: 'Updated Suite',
    neighborhood: 'Updated Neighborhood',
    city: 'Updated City',
    state: 'RJ',
    zipCode: '54321-876',
    latitude: -22.9068,
    longitude: -43.1729,
  };

  const mockCompanyResponse = {
    id: 'company-1',
    cnpj: '12.345.678/0001-90',
    companyName: 'Test Company',
    email: 'company@test.com',
    phone: '(11) 99999-9999',
    street: 'Test Street',
    number: '123',
    complement: 'Suite 456',
    neighborhood: 'Test Neighborhood',
    city: 'Test City',
    state: 'SP',
    zipCode: '12345-678',
    latitude: -23.5505,
    longitude: -46.6333,
    status: 'active',
    trialStartDate: new Date(),
    trialEndDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
    trialStatus: 'active',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockRegistrationResponse = {
    company: mockCompanyResponse,
    user: {
      id: 'user-1',
      email: 'user@test.com',
      name: 'Main User',
      phone: '(11) 88888-8888',
      cpf: '123.456.789-00',
      companyId: 'company-1',
      mainUser: true,
      status: 'pending',
      emailVerifiedAt: null,
      permissions: null,
      lastAccess: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    message:
      'Company registered successfully. Please check your email to verify your account.',
  };

  beforeEach(async () => {
    const mockCompaniesService = {
      registerCompany: jest.fn(),
      getCompany: jest.fn(),
      updateCompany: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ThrottlerModule.forRoot([
          {
            ttl: 60000,
            limit: 10,
          },
        ]),
      ],
      controllers: [CompaniesController],
      providers: [
        {
          provide: CompaniesService,
          useValue: mockCompaniesService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .overrideGuard(PermissionsGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .compile();

    controller = module.get<CompaniesController>(CompaniesController);
    companiesService = module.get(CompaniesService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('registerCompany', () => {
    it('should register a company successfully', async () => {
      companiesService.registerCompany.mockResolvedValue(
        mockRegistrationResponse,
      );

      const result = await controller.registerCompany(mockRegisterCompanyDto);

      expect(result).toEqual(mockRegistrationResponse);
      expect(companiesService.registerCompany).toHaveBeenCalledWith(
        mockRegisterCompanyDto,
      );
    });

    it('should handle CNPJ already exists error', async () => {
      const error = new Error('Company with this CNPJ already exists');
      companiesService.registerCompany.mockRejectedValue(error);

      await expect(
        controller.registerCompany(mockRegisterCompanyDto),
      ).rejects.toThrow('Company with this CNPJ already exists');
    });

    it('should handle user email already exists error', async () => {
      const error = new Error('User with this email already exists');
      companiesService.registerCompany.mockRejectedValue(error);

      await expect(
        controller.registerCompany(mockRegisterCompanyDto),
      ).rejects.toThrow('User with this email already exists');
    });

    it('should handle invalid CNPJ format', async () => {
      const invalidDto = {
        ...mockRegisterCompanyDto,
        cnpj: 'invalid-cnpj',
      };
      const error = new Error('Invalid CNPJ format');
      companiesService.registerCompany.mockRejectedValue(error);

      await expect(controller.registerCompany(invalidDto)).rejects.toThrow(
        'Invalid CNPJ format',
      );
    });

    it('should handle invalid CPF format', async () => {
      const invalidDto = {
        ...mockRegisterCompanyDto,
        userCpf: 'invalid-cpf',
      };
      const error = new Error('Invalid CPF format');
      companiesService.registerCompany.mockRejectedValue(error);

      await expect(controller.registerCompany(invalidDto)).rejects.toThrow(
        'Invalid CPF format',
      );
    });

    it('should handle missing required fields', async () => {
      const incompleteDto = {
        cnpj: '12.345.678/0001-90',
        companyName: 'Test Company',
      } as RegisterCompanyDto;
      const error = new Error('Missing required fields');
      companiesService.registerCompany.mockRejectedValue(error);

      await expect(controller.registerCompany(incompleteDto)).rejects.toThrow(
        'Missing required fields',
      );
    });

    it('should handle weak password error', async () => {
      const weakPasswordDto = {
        ...mockRegisterCompanyDto,
        userPassword: '123',
      };
      const error = new Error('Password must be at least 6 characters long');
      companiesService.registerCompany.mockRejectedValue(error);

      await expect(controller.registerCompany(weakPasswordDto)).rejects.toThrow(
        'Password must be at least 6 characters long',
      );
    });

    it('should handle invalid email format', async () => {
      const invalidEmailDto = {
        ...mockRegisterCompanyDto,
        email: 'invalid-email',
      };
      const error = new Error('Invalid email format');
      companiesService.registerCompany.mockRejectedValue(error);

      await expect(controller.registerCompany(invalidEmailDto)).rejects.toThrow(
        'Invalid email format',
      );
    });

    it('should handle database connection errors', async () => {
      const error = new Error('Database connection failed');
      companiesService.registerCompany.mockRejectedValue(error);

      await expect(
        controller.registerCompany(mockRegisterCompanyDto),
      ).rejects.toThrow('Database connection failed');
    });
  });

  describe('getCompany', () => {
    it('should get company details successfully', async () => {
      companiesService.getCompany.mockResolvedValue(mockCompanyResponse);

      const result = await controller.getCompany('company-1', mockCurrentUser);

      expect(result).toEqual(mockCompanyResponse);
      expect(companiesService.getCompany).toHaveBeenCalledWith(
        'company-1',
        'user-1',
      );
    });

    it('should handle company not found', async () => {
      const error = new Error('Company not found');
      companiesService.getCompany.mockRejectedValue(error);

      await expect(
        controller.getCompany('nonexistent-id', mockCurrentUser),
      ).rejects.toThrow('Company not found');
    });

    it('should handle access denied for different company', async () => {
      const error = new Error('Access denied');
      companiesService.getCompany.mockRejectedValue(error);

      await expect(
        controller.getCompany('other-company-id', mockCurrentUser),
      ).rejects.toThrow('Access denied');
    });

    it('should allow team members to view company details', async () => {
      companiesService.getCompany.mockResolvedValue(mockCompanyResponse);

      const result = await controller.getCompany('company-1', mockTeamMember);

      expect(result).toEqual(mockCompanyResponse);
      expect(companiesService.getCompany).toHaveBeenCalledWith(
        'company-1',
        'user-2',
      );
    });

    it('should handle invalid company ID format', async () => {
      const error = new Error('Invalid company ID format');
      companiesService.getCompany.mockRejectedValue(error);

      await expect(
        controller.getCompany('invalid-id', mockCurrentUser),
      ).rejects.toThrow('Invalid company ID format');
    });

    it('should handle service unavailable error', async () => {
      const error = new Error('Service temporarily unavailable');
      companiesService.getCompany.mockRejectedValue(error);

      await expect(
        controller.getCompany('company-1', mockCurrentUser),
      ).rejects.toThrow('Service temporarily unavailable');
    });
  });

  describe('updateCompany', () => {
    it('should update company successfully as main user', async () => {
      const updatedCompany = {
        ...mockCompanyResponse,
        ...mockUpdateCompanyDto,
      };
      companiesService.updateCompany.mockResolvedValue(updatedCompany);

      const result = await controller.updateCompany(
        'company-1',
        mockUpdateCompanyDto,
        mockCurrentUser,
      );

      expect(result).toEqual(updatedCompany);
      expect(companiesService.updateCompany).toHaveBeenCalledWith(
        'company-1',
        mockUpdateCompanyDto,
        'user-1',
      );
    });

    it('should handle company not found during update', async () => {
      const error = new Error('Company not found');
      companiesService.updateCompany.mockRejectedValue(error);

      await expect(
        controller.updateCompany(
          'nonexistent-id',
          mockUpdateCompanyDto,
          mockCurrentUser,
        ),
      ).rejects.toThrow('Company not found');
    });

    it('should handle email conflict during update', async () => {
      const error = new Error('Email already exists');
      companiesService.updateCompany.mockRejectedValue(error);

      await expect(
        controller.updateCompany(
          'company-1',
          { email: 'existing@test.com' },
          mockCurrentUser,
        ),
      ).rejects.toThrow('Email already exists');
    });

    it('should handle access denied for non-main user', async () => {
      const error = new Error('Access denied - main user required');
      companiesService.updateCompany.mockRejectedValue(error);

      await expect(
        controller.updateCompany(
          'company-1',
          mockUpdateCompanyDto,
          mockTeamMember,
        ),
      ).rejects.toThrow('Access denied - main user required');
    });

    it('should handle access denied for different company', async () => {
      const error = new Error('Access denied');
      companiesService.updateCompany.mockRejectedValue(error);

      await expect(
        controller.updateCompany(
          'other-company-id',
          mockUpdateCompanyDto,
          mockCurrentUser,
        ),
      ).rejects.toThrow('Access denied');
    });

    it('should handle invalid email format in update', async () => {
      const invalidUpdate = {
        email: 'invalid-email-format',
      };
      const error = new Error('Invalid email format');
      companiesService.updateCompany.mockRejectedValue(error);

      await expect(
        controller.updateCompany('company-1', invalidUpdate, mockCurrentUser),
      ).rejects.toThrow('Invalid email format');
    });

    it('should handle invalid phone format in update', async () => {
      const invalidUpdate = {
        phone: 'invalid-phone',
      };
      const error = new Error('Invalid phone format');
      companiesService.updateCompany.mockRejectedValue(error);

      await expect(
        controller.updateCompany('company-1', invalidUpdate, mockCurrentUser),
      ).rejects.toThrow('Invalid phone format');
    });

    it('should handle empty update data', async () => {
      const emptyUpdate = {};
      companiesService.updateCompany.mockResolvedValue(mockCompanyResponse);

      const result = await controller.updateCompany(
        'company-1',
        emptyUpdate,
        mockCurrentUser,
      );

      expect(result).toEqual(mockCompanyResponse);
      expect(companiesService.updateCompany).toHaveBeenCalledWith(
        'company-1',
        emptyUpdate,
        'user-1',
      );
    });

    it('should handle partial update data', async () => {
      const partialUpdate = {
        companyName: 'New Company Name',
      };
      const updatedCompany = {
        ...mockCompanyResponse,
        companyName: 'New Company Name',
      };
      companiesService.updateCompany.mockResolvedValue(updatedCompany);

      const result = await controller.updateCompany(
        'company-1',
        partialUpdate,
        mockCurrentUser,
      );

      expect(result).toEqual(updatedCompany);
      expect(companiesService.updateCompany).toHaveBeenCalledWith(
        'company-1',
        partialUpdate,
        'user-1',
      );
    });

    it('should handle database constraint violations', async () => {
      const error = new Error('Database constraint violation');
      companiesService.updateCompany.mockRejectedValue(error);

      await expect(
        controller.updateCompany(
          'company-1',
          mockUpdateCompanyDto,
          mockCurrentUser,
        ),
      ).rejects.toThrow('Database constraint violation');
    });
  });

  describe('error handling', () => {
    it('should handle service timeout errors', async () => {
      const error = new Error('Request timeout');
      error.name = 'TimeoutError';
      companiesService.getCompany.mockRejectedValue(error);

      await expect(
        controller.getCompany('company-1', mockCurrentUser),
      ).rejects.toThrow('Request timeout');
    });

    it('should handle validation errors', async () => {
      const error = new Error('Validation failed');
      companiesService.registerCompany.mockRejectedValue(error);

      await expect(
        controller.registerCompany(mockRegisterCompanyDto),
      ).rejects.toThrow('Validation failed');
    });

    it('should handle network errors', async () => {
      const error = new Error('Network error');
      companiesService.updateCompany.mockRejectedValue(error);

      await expect(
        controller.updateCompany(
          'company-1',
          mockUpdateCompanyDto,
          mockCurrentUser,
        ),
      ).rejects.toThrow('Network error');
    });
  });

  describe('edge cases', () => {
    it('should handle very long company names', async () => {
      const longNameDto = {
        ...mockRegisterCompanyDto,
        companyName: 'A'.repeat(1000),
      };
      const error = new Error('Company name too long');
      companiesService.registerCompany.mockRejectedValue(error);

      await expect(controller.registerCompany(longNameDto)).rejects.toThrow(
        'Company name too long',
      );
    });

    it('should handle special characters in company data', async () => {
      const specialCharsDto = {
        ...mockRegisterCompanyDto,
        companyName: 'Company & Co. - Ltda.',
        street: 'Rua José da Silva, 123 - Apto. 45',
      };
      companiesService.registerCompany.mockResolvedValue(
        mockRegistrationResponse,
      );

      const result = await controller.registerCompany(specialCharsDto);

      expect(result).toEqual(mockRegistrationResponse);
      expect(companiesService.registerCompany).toHaveBeenCalledWith(
        specialCharsDto,
      );
    });

    it('should handle null/undefined coordinates', async () => {
      const noCoordinatesDto = {
        ...mockRegisterCompanyDto,
        latitude: undefined,
        longitude: undefined,
      };
      companiesService.registerCompany.mockResolvedValue(
        mockRegistrationResponse,
      );

      const result = await controller.registerCompany(noCoordinatesDto);

      expect(result).toEqual(mockRegistrationResponse);
    });

    it('should handle very long user IDs', async () => {
      const longId = 'a'.repeat(100);
      const error = new Error('Invalid user ID format');
      companiesService.getCompany.mockRejectedValue(error);

      await expect(
        controller.getCompany(longId, mockCurrentUser),
      ).rejects.toThrow('Invalid user ID format');
    });
  });
});
