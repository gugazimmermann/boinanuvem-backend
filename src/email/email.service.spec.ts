import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';
import { EmailService } from './email.service';

describe('EmailService', () => {
  let service: EmailService;

  const mockConfigService = {
    get: jest.fn().mockReturnValue('http://localhost:3000'),
  };

  const mockLogger = {
    log: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailService,
        { provide: ConfigService, useValue: mockConfigService },
        { provide: Logger, useValue: mockLogger },
      ],
    }).compile();

    service = module.get<EmailService>(EmailService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should send email verification', async () => {
    const loggerSpy = jest.spyOn(service['logger'], 'log');

    await service.sendEmailVerification(
      'test@example.com',
      'Test User',
      'token123',
    );

    expect(loggerSpy).toHaveBeenCalledWith(
      '[MOCK EMAIL] Email verification sent to: test@example.com',
    );
    expect(loggerSpy).toHaveBeenCalledWith('[MOCK EMAIL] Recipient: Test User');
    expect(loggerSpy).toHaveBeenCalledWith(
      '[MOCK EMAIL] Verification URL: http://localhost:3000/verify-email?token=token123',
    );

    loggerSpy.mockRestore();
  });

  it('should send password reset email', async () => {
    const loggerSpy = jest.spyOn(service['logger'], 'log');

    await service.sendPasswordReset('test@example.com', 'reset-token');

    expect(loggerSpy).toHaveBeenCalledWith(
      '[MOCK EMAIL] Password reset sent to: test@example.com',
    );
    expect(loggerSpy).toHaveBeenCalledWith(
      '[MOCK EMAIL] Reset URL: http://localhost:3000/reset-password?token=reset-token',
    );
    expect(loggerSpy).toHaveBeenCalledWith('[MOCK EMAIL] Token: reset-token');

    loggerSpy.mockRestore();
  });

  it('should send welcome email', async () => {
    const loggerSpy = jest.spyOn(service['logger'], 'log');

    await service.sendWelcomeEmail(
      'test@example.com',
      'Test User',
      'Test Company',
    );

    expect(loggerSpy).toHaveBeenCalledWith(
      '[MOCK EMAIL] Welcome email sent to: test@example.com',
    );
    expect(loggerSpy).toHaveBeenCalledWith('[MOCK EMAIL] Recipient: Test User');
    expect(loggerSpy).toHaveBeenCalledWith(
      '[MOCK EMAIL] Company: Test Company',
    );

    loggerSpy.mockRestore();
  });

  it('should send team member invitation', async () => {
    const loggerSpy = jest.spyOn(service['logger'], 'log');

    await service.sendTeamMemberInvitation(
      'member@example.com',
      'Admin User',
      'Test Company',
      'invitation-token',
    );

    expect(loggerSpy).toHaveBeenCalledWith(
      '[MOCK EMAIL] Team invitation sent to: member@example.com',
    );
    expect(loggerSpy).toHaveBeenCalledWith('[MOCK EMAIL] Inviter: Admin User');
    expect(loggerSpy).toHaveBeenCalledWith(
      '[MOCK EMAIL] Company: Test Company',
    );
    expect(loggerSpy).toHaveBeenCalledWith(
      '[MOCK EMAIL] Invitation URL: http://localhost:3000/verify-email?token=invitation-token',
    );

    loggerSpy.mockRestore();
  });
});
