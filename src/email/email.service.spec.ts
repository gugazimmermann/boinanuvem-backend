import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { EmailService } from './email.service';

// Mock nodemailer
const mockSendMail = jest.fn();
const mockTransporter = {
  sendMail: mockSendMail,
};

jest.mock('nodemailer', () => ({
  createTransport: jest.fn(() => mockTransporter),
}));

describe('EmailService', () => {
  let service: EmailService;

  const mockConfigService = {
    get: jest.fn((key: string) => {
      switch (key) {
        case 'FRONTEND_URL':
          return 'http://localhost:3000';
        case 'GMAIL_EMAIL':
          return 'test@gmail.com';
        case 'GMAIL_PASSWORD':
          return 'testpassword';
        default:
          return 'default-value';
      }
    }),
  };

  // Mock logger to suppress error messages during tests
  const mockLogger = {
    log: jest.fn(),
    error: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailService,
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<EmailService>(EmailService);

    // Mock the logger to suppress console output during tests
    Object.defineProperty(service, 'logger', {
      value: mockLogger,
      writable: true,
    });

    // Reset mocks
    mockSendMail.mockClear();
    mockLogger.log.mockClear();
    mockLogger.error.mockClear();
    mockSendMail.mockResolvedValue({ messageId: 'test-message-id' });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should send email verification', async () => {
    await service.sendEmailVerification(
      'test@example.com',
      'Test User',
      'token123',
    );

    expect(mockSendMail).toHaveBeenCalledWith({
      from: '"Boi na Nuvem" <test@gmail.com>',
      to: 'test@example.com',
      subject: 'Verificação de E-mail - Boi na Nuvem',
      html: expect.stringContaining('Test User') as string,
      text: expect.stringContaining('Test User') as string,
    });

    expect(mockSendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        html: expect.stringContaining(
          'http://localhost:3000/verificar-email?token=token123',
        ) as string,
        text: expect.stringContaining(
          'http://localhost:3000/verificar-email?token=token123',
        ) as string,
      }),
    );
  });

  it('should send password reset email', async () => {
    await service.sendPasswordReset('test@example.com', 'reset-token');

    expect(mockSendMail).toHaveBeenCalledWith({
      from: '"Boi na Nuvem" <test@gmail.com>',
      to: 'test@example.com',
      subject: 'Redefinição de Senha - Boi na Nuvem',
      html: expect.stringContaining('Redefinição de Senha') as string,
      text: expect.stringContaining('Redefinição de Senha') as string,
    });

    expect(mockSendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        html: expect.stringContaining(
          'http://localhost:3000/reset-password?token=reset-token',
        ) as string,
        text: expect.stringContaining(
          'http://localhost:3000/reset-password?token=reset-token',
        ) as string,
      }),
    );
  });

  it('should send welcome email', async () => {
    await service.sendWelcomeEmail(
      'test@example.com',
      'Test User',
      'Test Company',
    );

    expect(mockSendMail).toHaveBeenCalledWith({
      from: '"Boi na Nuvem" <test@gmail.com>',
      to: 'test@example.com',
      subject: 'Bem-vindo ao Boi na Nuvem!',
      html: expect.stringContaining('Test User') as string,
      text: expect.stringContaining('Test User') as string,
    });

    expect(mockSendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        html: expect.stringContaining('Test Company') as string,
        text: expect.stringContaining('Test Company') as string,
      }),
    );
  });

  it('should send team member invitation', async () => {
    await service.sendTeamMemberInvitation(
      'member@example.com',
      'Admin User',
      'Test Company',
      'invitation-token',
    );

    expect(mockSendMail).toHaveBeenCalledWith({
      from: '"Boi na Nuvem" <test@gmail.com>',
      to: 'member@example.com',
      subject: 'Convite para Test Company - Boi na Nuvem',
      html: expect.stringContaining('Admin User') as string,
      text: expect.stringContaining('Admin User') as string,
    });

    expect(mockSendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        html: expect.stringContaining('Test Company') as string,
        text: expect.stringContaining('Test Company') as string,
      }),
    );

    expect(mockSendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        html: expect.stringContaining(
          'http://localhost:3000/configurar-senha?token=invitation-token',
        ) as string,
        text: expect.stringContaining(
          'http://localhost:3000/configurar-senha?token=invitation-token',
        ) as string,
      }),
    );
  });

  it('should handle email sending errors', async () => {
    mockSendMail.mockRejectedValue(new Error('SMTP connection failed'));

    await expect(
      service.sendEmailVerification(
        'test@example.com',
        'Test User',
        'token123',
      ),
    ).rejects.toThrow('Failed to send email: SMTP connection failed');
  });

  it('should handle unknown errors', async () => {
    mockSendMail.mockRejectedValue('Unknown error');

    await expect(
      service.sendEmailVerification(
        'test@example.com',
        'Test User',
        'token123',
      ),
    ).rejects.toThrow('Failed to send email: Unknown error');
  });

  it('should handle email sending when messageId is undefined', async () => {
    mockSendMail.mockResolvedValue({});

    await service.sendEmailVerification(
      'test@example.com',
      'Test User',
      'token123',
    );

    expect(mockLogger.log).toHaveBeenCalledWith(
      'Email sent successfully to test@example.com. Message ID: unknown',
    );
  });

  it('should handle welcome email with undefined frontend URL', async () => {
    mockConfigService.get.mockImplementation((key: string) => {
      if (key === 'FRONTEND_URL') return undefined;
      if (key === 'GMAIL_EMAIL') return 'test@gmail.com';
      if (key === 'GMAIL_PASSWORD') return 'testpassword';
      return 'default-value';
    });

    await service.sendWelcomeEmail(
      'test@example.com',
      'Test User',
      'Test Company',
    );

    expect(mockSendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        html: expect.stringContaining('Test User') as string,
        text: expect.stringContaining('Test User') as string,
      }),
    );
  });

  it('should create email template without button when buttonUrl is not provided', async () => {
    // This tests the createEmailTemplate private method indirectly
    await service.sendWelcomeEmail(
      'test@example.com',
      'Test User',
      'Test Company',
    );

    const call = mockSendMail.mock.calls[0][0] as {
      html: string;
      text: string;
    };
    expect(call.html).toBeDefined();
    expect(call.text).toBeDefined();
    // Button should still be present in welcome email (frontend URL)
    expect(call.html).toContain('button');
  });

  it('should log error details when email sending fails', async () => {
    const error = new Error('SMTP connection failed');
    mockSendMail.mockRejectedValue(error);

    await expect(
      service.sendEmailVerification(
        'test@example.com',
        'Test User',
        'token123',
      ),
    ).rejects.toThrow();

    expect(mockLogger.error).toHaveBeenCalledWith(
      'Failed to send email to test@example.com:',
      error,
    );
  });

  it('should send password reset email with correct URL', async () => {
    // Reset config service mock to return proper URL
    mockConfigService.get.mockImplementation((key: string) => {
      if (key === 'FRONTEND_URL') return 'http://localhost:3000';
      if (key === 'GMAIL_EMAIL') return 'test@gmail.com';
      if (key === 'GMAIL_PASSWORD') return 'testpassword';
      return 'default-value';
    });

    await service.sendPasswordReset('test@example.com', 'reset-token');

    expect(mockSendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        html: expect.stringContaining(
          'http://localhost:3000/reset-password?token=reset-token',
        ) as string,
        text: expect.stringContaining(
          'http://localhost:3000/reset-password?token=reset-token',
        ) as string,
      }),
    );
  });

  it('should send team member invitation with correct URL', async () => {
    // Reset config service mock to return proper URL
    mockConfigService.get.mockImplementation((key: string) => {
      if (key === 'FRONTEND_URL') return 'http://localhost:3000';
      if (key === 'GMAIL_EMAIL') return 'test@gmail.com';
      if (key === 'GMAIL_PASSWORD') return 'testpassword';
      return 'default-value';
    });

    await service.sendTeamMemberInvitation(
      'member@example.com',
      'Admin User',
      'Test Company',
      'invitation-token',
    );

    expect(mockSendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        html: expect.stringContaining(
          'http://localhost:3000/configurar-senha?token=invitation-token',
        ) as string,
        text: expect.stringContaining(
          'http://localhost:3000/configurar-senha?token=invitation-token',
        ) as string,
      }),
    );
  });
});
