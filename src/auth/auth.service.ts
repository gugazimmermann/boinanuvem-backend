import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../common/services/prisma.service';
import * as bcrypt from 'bcrypt';
import { JwtPayload } from './strategies/jwt.strategy';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async validateUser(email: string, password: string) {
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: { company: true },
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
    return result;
  }

  async login(user: {
    id: string;
    email: string;
    name: string;
    companyId: string;
    mainUser: boolean;
    permissions: unknown;
    company: unknown;
  }) {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      companyId: user.companyId,
      mainUser: user.mainUser,
    };

    const accessToken = this.jwtService.sign(payload, {
      expiresIn: '7d',
    });

    const refreshToken = await this.generateRefreshToken(user.id);

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
        company: user.company,
      },
    };
  }

  async refreshToken(refreshToken: string) {
    const tokenRecord = await this.prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      include: { user: { include: { company: true } } },
    });

    if (!tokenRecord || tokenRecord.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    if (tokenRecord.user.status !== 'active') {
      throw new UnauthorizedException('User account is not active');
    }

    // Generate new tokens
    const payload: JwtPayload = {
      sub: tokenRecord.user.id,
      email: tokenRecord.user.email,
      companyId: tokenRecord.user.companyId,
      mainUser: tokenRecord.user.mainUser,
    };

    const accessToken = this.jwtService.sign(payload, {
      expiresIn: '7d',
    });

    const newRefreshToken = await this.generateRefreshToken(
      tokenRecord.user.id,
    );

    // Remove old refresh token
    await this.prisma.refreshToken.delete({
      where: { id: tokenRecord.id },
    });

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
        company: tokenRecord.user.company,
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

  async generateRefreshToken(userId: string): Promise<string> {
    const token = this.jwtService.sign(
      { sub: userId, type: 'refresh' },
      { expiresIn: '30d' },
    );

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    await this.prisma.refreshToken.create({
      data: {
        token,
        userId,
        expiresAt,
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
      include: { user: true },
    });

    if (
      !verification ||
      verification.expiresAt < new Date() ||
      verification.usedAt
    ) {
      throw new BadRequestException('Invalid or expired verification token');
    }

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

    return { message: 'Email verified successfully' };
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
}
