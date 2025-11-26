import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  constructor(private configService: ConfigService) {}

  async sendEmailVerification(
    email: string,
    name: string,
    token: string,
  ): Promise<void> {
    // Mock email sending - in production, integrate with SendGrid, AWS SES, etc.
    const verificationUrl = `${this.configService.get('FRONTEND_URL')}/verify-email?token=${token}`;

    this.logger.log(`[MOCK EMAIL] Email verification sent to: ${email}`);
    this.logger.log(`[MOCK EMAIL] Recipient: ${name}`);
    this.logger.log(`[MOCK EMAIL] Verification URL: ${verificationUrl}`);
    this.logger.log(`[MOCK EMAIL] Token: ${token}`);

    // Simulate email sending delay
    await new Promise((resolve) => setTimeout(resolve, 100));

    this.logger.log(
      `[MOCK EMAIL] Email verification sent successfully to ${email}`,
    );
  }

  async sendPasswordReset(email: string, token: string): Promise<void> {
    // Mock email sending
    const resetUrl = `${this.configService.get('FRONTEND_URL')}/reset-password?token=${token}`;

    this.logger.log(`[MOCK EMAIL] Password reset sent to: ${email}`);
    this.logger.log(`[MOCK EMAIL] Reset URL: ${resetUrl}`);
    this.logger.log(`[MOCK EMAIL] Token: ${token}`);

    // Simulate email sending delay
    await new Promise((resolve) => setTimeout(resolve, 100));

    this.logger.log(
      `[MOCK EMAIL] Password reset email sent successfully to ${email}`,
    );
  }

  async sendWelcomeEmail(
    email: string,
    name: string,
    companyName: string,
  ): Promise<void> {
    // Mock welcome email
    this.logger.log(`[MOCK EMAIL] Welcome email sent to: ${email}`);
    this.logger.log(`[MOCK EMAIL] Recipient: ${name}`);
    this.logger.log(`[MOCK EMAIL] Company: ${companyName}`);

    // Simulate email sending delay
    await new Promise((resolve) => setTimeout(resolve, 100));

    this.logger.log(`[MOCK EMAIL] Welcome email sent successfully to ${email}`);
  }

  async sendTeamMemberInvitation(
    email: string,
    inviterName: string,
    companyName: string,
    token: string,
  ): Promise<void> {
    // Mock team member invitation
    const invitationUrl = `${this.configService.get('FRONTEND_URL')}/verify-email?token=${token}`;

    this.logger.log(`[MOCK EMAIL] Team invitation sent to: ${email}`);
    this.logger.log(`[MOCK EMAIL] Inviter: ${inviterName}`);
    this.logger.log(`[MOCK EMAIL] Company: ${companyName}`);
    this.logger.log(`[MOCK EMAIL] Invitation URL: ${invitationUrl}`);
    this.logger.log(`[MOCK EMAIL] Token: ${token}`);

    // Simulate email sending delay
    await new Promise((resolve) => setTimeout(resolve, 100));

    this.logger.log(
      `[MOCK EMAIL] Team invitation sent successfully to ${email}`,
    );
  }
}
