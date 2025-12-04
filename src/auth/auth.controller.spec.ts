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
      expect(mockAuthService.login).toHaveBeenCalledWith(mockUser, false);
      expect(result).toEqual(mockLoginResult);
    });

    it('should login a user with rememberMe true', async () => {
      const loginDto = {
        email: 'test@example.com',
        password: 'password123',
        rememberMe: true,
      };
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

      expect(mockAuthService.login).toHaveBeenCalledWith(mockUser, true);
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

  describe('refresh', () => {
    it('should refresh access token successfully', async () => {
      const refreshTokenDto = { refresh_token: 'valid-refresh-token' };
      const expectedResult = {
        access_token: 'new-jwt-token',
        refresh_token: 'new-refresh-token',
      };

      mockAuthService.refreshToken.mockResolvedValue(expectedResult);

      const result = await controller.refresh(refreshTokenDto);

      expect(result).toEqual(expectedResult);
      expect(mockAuthService.refreshToken).toHaveBeenCalledWith(
        'valid-refresh-token',
      );
    });
  });

  describe('logout', () => {
    it('should logout user successfully', async () => {
      const user = {
        id: 'user-1',
        email: 'test@example.com',
        name: 'Test User',
      };
      const body = { refresh_token: 'refresh-token' };

      mockAuthService.logout.mockResolvedValue(undefined);

      const result = await controller.logout(user, body);

      expect(result).toEqual({ message: 'Logout successful' });
      expect(mockAuthService.logout).toHaveBeenCalledWith(
        'user-1',
        'refresh-token',
      );
    });

    it('should logout user without refresh token', async () => {
      const user = {
        id: 'user-1',
        email: 'test@example.com',
        name: 'Test User',
      };

      mockAuthService.logout.mockResolvedValue(undefined);

      const result = await controller.logout(user);

      expect(result).toEqual({ message: 'Logout successful' });
      expect(mockAuthService.logout).toHaveBeenCalledWith('user-1', undefined);
    });
  });

  describe('verifyEmail', () => {
    it('should verify email successfully', async () => {
      const verifyEmailDto = { token: 'valid-token' };
      const expectedResult = { message: 'Email verified successfully' };

      mockAuthService.verifyEmail.mockResolvedValue(expectedResult);

      const result = await controller.verifyEmail(verifyEmailDto);

      expect(result).toEqual(expectedResult);
      expect(mockAuthService.verifyEmail).toHaveBeenCalledWith('valid-token');
    });
  });

  describe('resendVerification', () => {
    it('should resend verification email successfully', async () => {
      const user = {
        id: 'user-1',
        email: 'test@example.com',
        name: 'Test User',
      };
      const token = 'verification-token';

      mockAuthService.generateEmailVerificationToken.mockResolvedValue(token);
      mockEmailService.sendEmailVerification.mockResolvedValue(undefined);

      const result = await controller.resendVerification(user);

      expect(result).toEqual({ message: 'Verification email sent' });
      expect(
        mockAuthService.generateEmailVerificationToken,
      ).toHaveBeenCalledWith('user-1', 'test@example.com');
      expect(mockEmailService.sendEmailVerification).toHaveBeenCalledWith(
        'test@example.com',
        'Test User',
        token,
      );
    });
  });

  describe('forgotPassword', () => {
    it('should send password reset email successfully', async () => {
      const forgotPasswordDto = { email: 'test@example.com' };
      const token = 'reset-token';

      mockAuthService.generatePasswordResetToken.mockResolvedValue(token);
      mockEmailService.sendPasswordReset.mockResolvedValue(undefined);

      const result = await controller.forgotPassword(forgotPasswordDto);

      expect(result).toEqual({ message: 'Password reset email sent' });
      expect(mockAuthService.generatePasswordResetToken).toHaveBeenCalledWith(
        'test@example.com',
      );
      expect(mockEmailService.sendPasswordReset).toHaveBeenCalledWith(
        'test@example.com',
        token,
      );
    });
  });

  describe('resetPassword', () => {
    it('should reset password successfully', async () => {
      const resetPasswordDto = {
        token: 'valid-token',
        password: 'newPassword123',
      };
      const expectedResult = { message: 'Password reset successfully' };

      mockAuthService.resetPassword.mockResolvedValue(expectedResult);

      const result = await controller.resetPassword(resetPasswordDto);

      expect(result).toEqual(expectedResult);
      expect(mockAuthService.resetPassword).toHaveBeenCalledWith(
        'valid-token',
        'newPassword123',
      );
    });
  });

  describe('changePassword', () => {
    it('should change password successfully', async () => {
      const user = {
        id: 'user-1',
        email: 'test@example.com',
        name: 'Test User',
      };
      const changePasswordDto = {
        currentPassword: 'oldPassword',
        newPassword: 'newPassword123',
      };
      const expectedResult = { message: 'Password changed successfully' };

      mockAuthService.changePassword.mockResolvedValue(expectedResult);

      const result = await controller.changePassword(user, changePasswordDto);

      expect(result).toEqual(expectedResult);
      expect(mockAuthService.changePassword).toHaveBeenCalledWith(
        'user-1',
        'oldPassword',
        'newPassword123',
      );
    });
  });
});
