import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly transporter: nodemailer.Transporter<nodemailer.SentMessageInfo>;

  constructor(private configService: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false, // true for 465, false for other ports
      auth: {
        user: this.configService.get<string>('GMAIL_EMAIL'),
        pass: this.configService.get<string>('GMAIL_PASSWORD'),
      },
    });
  }

  private createEmailTemplate(
    title: string,
    content: string,
    buttonText?: string,
    buttonUrl?: string,
  ): { html: string; text: string } {
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${title}</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #007bff; color: white; padding: 20px; text-align: center; }
            .content { padding: 30px 20px; background-color: #f8f9fa; }
            .button { display: inline-block; padding: 12px 24px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { padding: 20px; text-align: center; color: #666; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Boi na Nuvem</h1>
            </div>
            <div class="content">
              <h2>${title}</h2>
              <p>${content}</p>
              ${buttonText && buttonUrl ? `<a href="${buttonUrl}" class="button">${buttonText}</a>` : ''}
            </div>
            <div class="footer">
              <p>© 2025 Boi na Nuvem. Todos os direitos reservados.</p>
              <p>Se você não solicitou este e-mail, pode ignorá-lo com segurança.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const text = `
${title}

${content}

${buttonText && buttonUrl ? `${buttonText}: ${buttonUrl}` : ''}

---
© 2025 Boi na Nuvem. Todos os direitos reservados.
Se você não solicitou este e-mail, pode ignorá-lo com segurança.
    `.trim();

    return { html, text };
  }

  private async sendEmail(
    to: string,
    subject: string,
    html: string,
    text: string,
  ): Promise<void> {
    try {
      const mailOptions: nodemailer.SendMailOptions = {
        from: `"Boi na Nuvem" <${this.configService.get<string>('GMAIL_EMAIL')}>`,
        to,
        subject,
        html,
        text,
      };

      const info = (await this.transporter.sendMail(mailOptions)) as {
        messageId?: string;
      };
      const messageId = info.messageId ?? 'unknown';

      this.logger.log(
        `Email sent successfully to ${to}. Message ID: ${messageId}`,
      );
    } catch (error: unknown) {
      this.logger.error(`Failed to send email to ${to}:`, error);
      throw new Error(
        `Failed to send email: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  async sendEmailVerification(
    email: string,
    name: string,
    token: string,
  ): Promise<void> {
    const verificationUrl = `${this.configService.get('FRONTEND_URL')}/verify-email?token=${token}`;

    const content = `
      Olá ${name},
      
      Obrigado por se cadastrar no Boi na Nuvem! Para completar seu cadastro, precisamos verificar seu endereço de e-mail.
      
      Clique no botão abaixo para verificar sua conta:
    `;

    const { html, text } = this.createEmailTemplate(
      'Verificação de E-mail',
      content,
      'Verificar E-mail',
      verificationUrl,
    );

    await this.sendEmail(
      email,
      'Verificação de E-mail - Boi na Nuvem',
      html,
      text,
    );
  }

  async sendPasswordReset(email: string, token: string): Promise<void> {
    const resetUrl = `${this.configService.get('FRONTEND_URL')}/reset-password?token=${token}`;

    const content = `
      Recebemos uma solicitação para redefinir a senha da sua conta no Boi na Nuvem.
      
      Se você fez esta solicitação, clique no botão abaixo para redefinir sua senha:
      
      Este link expirará em 24 horas por motivos de segurança.
      
      Se você não solicitou a redefinição de senha, pode ignorar este e-mail com segurança.
    `;

    const { html, text } = this.createEmailTemplate(
      'Redefinição de Senha',
      content,
      'Redefinir Senha',
      resetUrl,
    );

    await this.sendEmail(
      email,
      'Redefinição de Senha - Boi na Nuvem',
      html,
      text,
    );
  }

  async sendWelcomeEmail(
    email: string,
    name: string,
    companyName: string,
  ): Promise<void> {
    const frontendUrl = this.configService.get<string>('FRONTEND_URL');

    const content = `
      Olá ${name},
      
      Seja bem-vindo(a) ao Boi na Nuvem! Sua conta foi criada com sucesso para a empresa ${companyName}.
      
      Agora você pode acessar nossa plataforma e começar a gerenciar seu rebanho de forma inteligente e eficiente.
      
      Estamos aqui para ajudá-lo a revolucionar a gestão do seu agronegócio!
    `;

    const { html, text } = this.createEmailTemplate(
      'Bem-vindo ao Boi na Nuvem!',
      content,
      'Acessar Plataforma',
      frontendUrl ?? '',
    );

    await this.sendEmail(email, 'Bem-vindo ao Boi na Nuvem!', html, text);
  }

  async sendTeamMemberInvitation(
    email: string,
    inviterName: string,
    companyName: string,
    token: string,
  ): Promise<void> {
    const invitationUrl = `${this.configService.get('FRONTEND_URL')}/verify-email?token=${token}`;

    const content = `
      Olá!
      
      Você foi convidado(a) por ${inviterName} para fazer parte da equipe da empresa ${companyName} no Boi na Nuvem.
      
      O Boi na Nuvem é uma plataforma completa para gestão de rebanho bovino, oferecendo ferramentas modernas para otimizar seu agronegócio.
      
      Clique no botão abaixo para aceitar o convite e criar sua conta:
    `;

    const { html, text } = this.createEmailTemplate(
      'Convite para Equipe',
      content,
      'Aceitar Convite',
      invitationUrl,
    );

    await this.sendEmail(
      email,
      `Convite para ${companyName} - Boi na Nuvem`,
      html,
      text,
    );
  }
}
