import { Test, TestingModule } from '@nestjs/testing';
import { ThrottlerModule } from '@nestjs/throttler';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { EmailService } from '../email/email.service';
import { CompaniesService } from '../companies/companies.service';

describe('AuthController', () => {
  let controller: AuthController;

  const mockAuthService = {
    validateUser: jest.fn(),
    login: jest.fn(),
    refreshToken: jest.fn(),
    logout: jest.fn(),
    verifyEmail: jest.fn(),
    generateEmailVerificationToken: jest.fn(),
    generatePasswordResetToken: jest.fn(),
    resetPassword: jest.fn(),
    changePassword: jest.fn(),
  };

  const mockEmailService = {
    sendEmailVerification: jest.fn(),
    sendPasswordReset: jest.fn(),
  };

  const mockCompaniesService = {
    registerCompany: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ThrottlerModule.forRoot([
          {
            ttl: 60000,
            limit: 10,
          },
        ]),
      ],
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        { provide: EmailService, useValue: mockEmailService },
        { provide: CompaniesService, useValue: mockCompaniesService },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('login', () => {
    it('should login a user successfully', async () => {
      const loginDto = { email: 'test@example.com', password: 'password123' };
      const mockUser = {
        id: '1',
        email: 'test@example.com',
        name: 'Test User',
      };
      const mockLoginResult = {
        access_token: 'token',
        refresh_token: 'refresh',
        user: mockUser,
      };

      mockAuthService.validateUser.mockResolvedValue(mockUser);
      mockAuthService.login.mockResolvedValue(mockLoginResult);

      const result = await controller.login(loginDto);

      expect(mockAuthService.validateUser).toHaveBeenCalledWith(
        loginDto.email,
        loginDto.password,
      );
      expect(mockAuthService.login).toHaveBeenCalledWith(mockUser);
      expect(result).toEqual(mockLoginResult);
    });

    it('should throw UnauthorizedException for invalid credentials', async () => {
      const loginDto = { email: 'test@example.com', password: 'wrong' };

      mockAuthService.validateUser.mockResolvedValue(null);

      await expect(controller.login(loginDto)).rejects.toThrow(
        'Invalid credentials',
      );
    });
  });

  describe('registerCompany', () => {
    it('should register a company successfully', async () => {
      const registerDto = {
        cnpj: '12.345.678/0001-90',
        companyName: 'Test Company',
        email: 'company@test.com',
        phone: '(11) 99999-9999',
        street: 'Test Street',
        number: '123',
        neighborhood: 'Test Neighborhood',
        city: 'Test City',
        state: 'SP',
        zipCode: '12345-678',
        userName: 'Test User',
        userEmail: 'user@test.com',
        userPhone: '(11) 88888-8888',
        userPassword: 'password123',
      };

      const mockResult = {
        message: 'Company registered successfully',
        company: { id: '1', name: 'Test Company' },
        mainUser: { id: '1', name: 'Test User' },
      };

      mockCompaniesService.registerCompany.mockResolvedValue(mockResult);

      const result = await controller.registerCompany(registerDto);

      expect(mockCompaniesService.registerCompany).toHaveBeenCalledWith(
        registerDto,
      );
      expect(result).toEqual(mockResult);
    });
  });
});
