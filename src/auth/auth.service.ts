import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../common/services/prisma.service';
import { TrialService } from '../common/services/trial.service';
import { EmailService } from '../email/email.service';

interface ValidatedUser {
  id: string;
  email: string;
  name: string;
  companyId: string;
  mainUser: boolean;
  permissions: unknown;
  company: unknown;
}
import * as bcrypt from 'bcrypt';
import { JwtPayload } from './strategies/jwt.strategy';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private trialService: TrialService,
    private emailService: EmailService,
  ) {}

  async validateUser(
    email: string,
    password: string,
  ): Promise<ValidatedUser | null> {
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: {
        company: {
          include: {
            subscriptions: {
              include: {
                plan: true,
              },
              orderBy: {
                createdAt: 'desc',
              },
            },
          },
        },
      },
    });

    if (!user) {
      return null;
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return null;
    }

    if (user.status !== 'active') {
      throw new UnauthorizedException(
        'Account is not active. Please verify your email.',
      );
    }

    // Update last access
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastAccess: new Date() },
    });

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: userPassword, ...result } = user;
    return result as ValidatedUser;
  }

  async login(
    user: ValidatedUser,
    rememberMe: boolean = false,
  ): Promise<unknown> {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      companyId: user.companyId,
      mainUser: user.mainUser,
    };

    // Set access token expiration based on rememberMe
    // Remember Me ON: 30 days, Remember Me OFF: 7 days
    const accessTokenExpiration = rememberMe ? '30d' : '7d';

    const accessToken = this.jwtService.sign(payload, {
      expiresIn: accessTokenExpiration,
    });

    const refreshToken = await this.generateRefreshToken(user.id, rememberMe);

    // Enhance company data with trial information
    const enhancedCompany = (await this.enhanceCompanyWithTrialInfo(
      user.company,
    )) as Record<string, unknown>;

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        mainUser: user.mainUser,
        companyId: user.companyId,
        permissions: user.permissions,
        company: enhancedCompany,
      },
    };
  }

  async refreshToken(refreshToken: string): Promise<unknown> {
    const tokenRecord = await this.prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      include: {
        user: {
          include: {
            company: {
              include: {
                subscriptions: {
                  include: {
                    plan: true,
                  },
                  orderBy: {
                    createdAt: 'desc',
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!tokenRecord || tokenRecord.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    if (tokenRecord.user.status !== 'active') {
      throw new UnauthorizedException('User account is not active');
    }

    // Read rememberMe from the existing token record to maintain expiration times
    const rememberMe = tokenRecord.rememberMe;

    // Generate new tokens
    const payload: JwtPayload = {
      sub: tokenRecord.user.id,
      email: tokenRecord.user.email,
      companyId: tokenRecord.user.companyId,
      mainUser: tokenRecord.user.mainUser,
    };

    // Set access token expiration based on rememberMe
    // Remember Me ON: 30 days, Remember Me OFF: 7 days
    const accessTokenExpiration = rememberMe ? '30d' : '7d';

    const accessToken = this.jwtService.sign(payload, {
      expiresIn: accessTokenExpiration,
    });

    const newRefreshToken = await this.generateRefreshToken(
      tokenRecord.user.id,
      rememberMe,
    );

    // Remove old refresh token
    await this.prisma.refreshToken.delete({
      where: { id: tokenRecord.id },
    });

    // Enhance company data with trial information
    const enhancedCompany = (await this.enhanceCompanyWithTrialInfo(
      tokenRecord.user.company,
    )) as Record<string, unknown>;

    return {
      access_token: accessToken,
      refresh_token: newRefreshToken,
      user: {
        id: tokenRecord.user.id,
        email: tokenRecord.user.email,
        name: tokenRecord.user.name,
        mainUser: tokenRecord.user.mainUser,
        companyId: tokenRecord.user.companyId,
        permissions: tokenRecord.user.permissions,
        company: enhancedCompany,
      },
    };
  }

  async logout(userId: string, refreshToken?: string) {
    if (refreshToken) {
      await this.prisma.refreshToken.deleteMany({
        where: {
          userId,
          token: refreshToken,
        },
      });
    } else {
      // Logout from all devices
      await this.prisma.refreshToken.deleteMany({
        where: { userId },
      });
    }
  }

  async generateRefreshToken(
    userId: string,
    rememberMe: boolean = false,
  ): Promise<string> {
    // Set refresh token expiration based on rememberMe
    // Remember Me ON: 90 days, Remember Me OFF: 30 days
    const refreshTokenExpiration = rememberMe ? '90d' : '30d';
    const expiresInDays = rememberMe ? 90 : 30;

    const token = this.jwtService.sign(
      { sub: userId, type: 'refresh', iat: Date.now() },
      { expiresIn: refreshTokenExpiration },
    );

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiresInDays);

    await this.prisma.refreshToken.create({
      data: {
        token,
        userId,
        expiresAt,
        rememberMe,
      },
    });

    return token;
  }

  async hashPassword(password: string): Promise<string> {
    const saltRounds = 12;
    return bcrypt.hash(password, saltRounds);
  }

  async generateEmailVerificationToken(
    userId: string,
    email: string,
  ): Promise<string> {
    const token = this.jwtService.sign(
      { sub: userId, email, type: 'email_verification' },
      { expiresIn: '24h' },
    );

    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    // Remove any existing verification tokens for this user
    await this.prisma.emailVerification.deleteMany({
      where: { userId },
    });

    await this.prisma.emailVerification.create({
      data: {
        token,
        email,
        userId,
        expiresAt,
      },
    });

    return token;
  }

  async verifyEmail(token: string) {
    const verification = await this.prisma.emailVerification.findUnique({
      where: { token },
      include: {
        user: {
          include: {
            company: true,
          },
        },
      },
    });

    if (
      !verification ||
      verification.expiresAt < new Date() ||
      verification.usedAt
    ) {
      throw new BadRequestException('Invalid or expired verification token');
    }

    // Check if this is the first email verification (emailVerifiedAt is null)
    const isFirstVerification = !verification.user.emailVerifiedAt;
    const isMainUser = verification.user.mainUser;

    // Mark token as used
    await this.prisma.emailVerification.update({
      where: { id: verification.id },
      data: { usedAt: new Date() },
    });

    // Update user status and email verification
    await this.prisma.user.update({
      where: { id: verification.userId },
      data: {
        status: 'active',
        emailVerifiedAt: new Date(),
        email: verification.email, // In case email was changed
      },
    });

    // Send welcome email only for main users on their first email verification
    if (isFirstVerification && isMainUser && verification.user.company) {
      await this.emailService.sendWelcomeEmail(
        verification.user.company.email,
        verification.user.name,
        verification.user.company.companyName,
      );
    }

    return { message: 'Email verified successfully' };
  }

  async setupPassword(token: string, password: string) {
    const verification = await this.prisma.emailVerification.findUnique({
      where: { token },
      include: {
        user: {
          include: {
            company: true,
          },
        },
      },
    });

    if (
      !verification ||
      verification.expiresAt < new Date() ||
      verification.usedAt
    ) {
      throw new BadRequestException('Invalid or expired verification token');
    }

    // Check if this is the first email verification (emailVerifiedAt is null)
    const isFirstVerification = !verification.user.emailVerifiedAt;
    const isMainUser = verification.user.mainUser;

    // Mark token as used
    await this.prisma.emailVerification.update({
      where: { id: verification.id },
      data: { usedAt: new Date() },
    });

    // Hash the new password
    const hashedPassword = await this.hashPassword(password);

    // Update user: verify email, set password, and activate account
    await this.prisma.user.update({
      where: { id: verification.userId },
      data: {
        status: 'active',
        emailVerifiedAt: new Date(),
        email: verification.email, // In case email was changed
        password: hashedPassword,
      },
    });

    // Invalidate all refresh tokens for security
    await this.prisma.refreshToken.deleteMany({
      where: { userId: verification.userId },
    });

    // Send welcome email only for main users on their first email verification
    if (isFirstVerification && isMainUser && verification.user.company) {
      await this.emailService.sendWelcomeEmail(
        verification.user.company.email,
        verification.user.name,
        verification.user.company.companyName,
      );
    }

    return { message: 'Password set and email verified successfully' };
  }

  async generatePasswordResetToken(email: string): Promise<string> {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new BadRequestException('User with this email does not exist');
    }

    const token = this.jwtService.sign(
      { sub: user.id, email, type: 'password_reset' },
      { expiresIn: '1h' },
    );

    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1);

    // Remove any existing reset tokens for this user
    await this.prisma.passwordReset.deleteMany({
      where: { userId: user.id },
    });

    await this.prisma.passwordReset.create({
      data: {
        token,
        email,
        userId: user.id,
        expiresAt,
      },
    });

    return token;
  }

  async resetPassword(token: string, newPassword: string) {
    const reset = await this.prisma.passwordReset.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!reset || reset.expiresAt < new Date() || reset.usedAt) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    const hashedPassword = await this.hashPassword(newPassword);

    // Mark token as used
    await this.prisma.passwordReset.update({
      where: { id: reset.id },
      data: { usedAt: new Date() },
    });

    // Update user password
    await this.prisma.user.update({
      where: { id: reset.userId },
      data: { password: hashedPassword },
    });

    // Invalidate all refresh tokens for security
    await this.prisma.refreshToken.deleteMany({
      where: { userId: reset.userId },
    });

    return { message: 'Password reset successfully' };
  }

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const isCurrentPasswordValid = await bcrypt.compare(
      currentPassword,
      user.password,
    );
    if (!isCurrentPasswordValid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    const hashedPassword = await this.hashPassword(newPassword);

    await this.prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

    // Invalidate all refresh tokens for security
    await this.prisma.refreshToken.deleteMany({
      where: { userId },
    });

    return { message: 'Password changed successfully' };
  }

  /**
   * Enhance company data with trial information and plan details
   */
  private async enhanceCompanyWithTrialInfo(
    company: unknown,
  ): Promise<unknown> {
    if (!company) {
      return company;
    }

    // Get current active subscription
    const companyData = company as Record<string, unknown>;
    const subscriptions = companyData.subscriptions as unknown[] | undefined;
    const activeSubscription = subscriptions?.find((sub: unknown) => {
      const subscription = sub as Record<string, unknown>;
      return (
        subscription.isActive &&
        (subscription.status === 'active' || subscription.status === 'trial')
      );
    });

    // Calculate trial information
    const trialInfo = this.trialService.calculateTrialInfo({
      trialStartDate: companyData.trialStartDate as Date | null,
      trialEndDate: companyData.trialEndDate as Date | null,
      trialStatus: companyData.trialStatus as string | null,
      createdAt: companyData.createdAt as Date,
      subscriptions: subscriptions,
    });

    // Update trial status in database if needed
    if (
      this.trialService.shouldUpdateTrialStatus({
        trialStatus: companyData.trialStatus as string | null,
        trialEndDate: companyData.trialEndDate as Date | null,
        createdAt: companyData.createdAt as Date,
        subscriptions: subscriptions,
      })
    ) {
      await this.prisma.company.update({
        where: { id: companyData.id as string },
        data: { trialStatus: 'expired' },
      });

      // Also update trial subscription status if it exists
      const trialSubscription = subscriptions?.find((sub: unknown) => {
        const subscription = sub as Record<string, unknown>;
        return subscription.isTrial && subscription.isActive;
      });
      if (trialSubscription) {
        const trialSub = trialSubscription as Record<string, unknown>;
        await this.prisma.companySubscription.update({
          where: { id: trialSub.id as string },
          data: { status: 'expired', isActive: false },
        });
      }
    }

    const activeSubscriptionData = activeSubscription as
      | Record<string, unknown>
      | undefined;
    return {
      ...companyData,
      trial: trialInfo,
      currentPlan: activeSubscriptionData?.plan || null,
      currentSubscription: activeSubscription || null,
    };
  }
}
