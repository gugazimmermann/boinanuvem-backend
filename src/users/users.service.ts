import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../common/services/prisma.service';
import type { InputJsonValue } from '@prisma/client/runtime/library';
import { AuthService } from '../auth/auth.service';
import { EmailService } from '../email/email.service';
import { CreateUserDto, UpdateUserDto, UpdatePermissionsDto } from './dto';

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private authService: AuthService,
    private emailService: EmailService,
  ) {}

  async getCurrentUser(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        company: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async updateCurrentUser(userId: string, updateUserDto: UpdateUserDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check if email is being changed and if it already exists
    if (updateUserDto.email && updateUserDto.email !== user.email) {
      const existingUser = await this.prisma.user.findUnique({
        where: { email: updateUserDto.email },
      });

      if (existingUser) {
        throw new ConflictException('User with this email already exists');
      }

      // If email is being changed, generate verification token and set status to pending
      const verificationToken =
        await this.authService.generateEmailVerificationToken(
          userId,
          updateUserDto.email,
        );

      await this.emailService.sendEmailVerification(
        updateUserDto.email,
        updateUserDto.name || user.name,
        verificationToken,
      );

      // Update user with new email but set status to pending
      const updatedUser = await this.prisma.user.update({
        where: { id: userId },
        data: {
          ...updateUserDto,
          status: 'pending',
          emailVerifiedAt: null,
        },
        select: {
          id: true,
          name: true,
          email: true,
          status: true,
        },
      });

      return {
        ...updatedUser,
        message: 'Profile updated. Please verify your new email address.',
      };
    }

    // Update user without email change
    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: updateUserDto,
      include: {
        company: true,
      },
    });

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, ...result } = updatedUser;
    return result;
  }

  async getTeamMembers(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (!user.mainUser) {
      throw new ForbiddenException('Only main users can view team members');
    }

    const teamMembers = await this.prisma.user.findMany({
      where: {
        companyId: user.companyId,
      },
      select: {
        id: true,
        name: true,
        cpf: true,
        email: true,
        phone: true,
        mainUser: true,
        status: true,
        permissions: true,
        lastAccess: true,
        emailVerifiedAt: true,
        createdAt: true,
      },
      orderBy: [{ mainUser: 'desc' }, { createdAt: 'asc' }],
    });

    return teamMembers;
  }

  async createTeamMember(userId: string, createUserDto: CreateUserDto) {
    const mainUser = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { company: true },
    });

    if (!mainUser) {
      throw new NotFoundException('User not found');
    }

    if (!mainUser.mainUser) {
      throw new ForbiddenException('Only main users can create team members');
    }

    // Check if user with email already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email: createUserDto.email },
    });

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    // Hash password
    const hashedPassword = await this.authService.hashPassword(
      createUserDto.password,
    );

    // Create team member with default permissions (no permissions)
    const newUser = await this.prisma.user.create({
      data: {
        ...createUserDto,
        password: hashedPassword,
        mainUser: false,
        status: 'pending',
        companyId: mainUser.companyId,
        permissions: this.getDefaultPermissions(),
      },
      select: {
        id: true,
        name: true,
        email: true,
        status: true,
        mainUser: true,
        createdAt: true,
      },
    });

    // Generate email verification token
    const verificationToken =
      await this.authService.generateEmailVerificationToken(
        newUser.id,
        newUser.email,
      );

    // Send team invitation email
    await this.emailService.sendTeamMemberInvitation(
      newUser.email,
      mainUser.name,
      mainUser.company.companyName,
      verificationToken,
    );

    return {
      ...newUser,
      message: 'Team member created successfully. Invitation email sent.',
    };
  }

  async updateTeamMember(
    userId: string,
    targetUserId: string,
    updateUserDto: UpdateUserDto,
  ) {
    const mainUser = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!mainUser) {
      throw new NotFoundException('User not found');
    }

    if (!mainUser.mainUser) {
      throw new ForbiddenException('Only main users can update team members');
    }

    const targetUser = await this.prisma.user.findUnique({
      where: { id: targetUserId },
    });

    if (!targetUser) {
      throw new NotFoundException('Target user not found');
    }

    if (targetUser.companyId !== mainUser.companyId) {
      throw new ForbiddenException(
        'Cannot update users from different companies',
      );
    }

    if (targetUser.mainUser) {
      throw new ForbiddenException(
        'Cannot update main user through this endpoint',
      );
    }

    // Check if email is being changed and if it already exists
    if (updateUserDto.email && updateUserDto.email !== targetUser.email) {
      const existingUser = await this.prisma.user.findUnique({
        where: { email: updateUserDto.email },
      });

      if (existingUser) {
        throw new ConflictException('User with this email already exists');
      }

      // If email is being changed, generate verification token
      const verificationToken =
        await this.authService.generateEmailVerificationToken(
          targetUserId,
          updateUserDto.email,
        );

      await this.emailService.sendEmailVerification(
        updateUserDto.email,
        updateUserDto.name || targetUser.name,
        verificationToken,
      );

      // Update user with new email but set status to pending
      const updatedUser = await this.prisma.user.update({
        where: { id: targetUserId },
        data: {
          ...updateUserDto,
          status: 'pending',
          emailVerifiedAt: null,
        },
        select: {
          id: true,
          name: true,
          email: true,
          status: true,
          mainUser: true,
        },
      });

      return {
        ...updatedUser,
        message: 'User updated. Email verification sent to new address.',
      };
    }

    // Update user without email change
    const updatedUser = await this.prisma.user.update({
      where: { id: targetUserId },
      data: updateUserDto,
      select: {
        id: true,
        name: true,
        cpf: true,
        email: true,
        phone: true,
        street: true,
        number: true,
        complement: true,
        neighborhood: true,
        city: true,
        state: true,
        zipCode: true,
        mainUser: true,
        status: true,
        permissions: true,
        lastAccess: true,
        emailVerifiedAt: true,
        createdAt: true,
      },
    });

    return updatedUser;
  }

  async updateUserPermissions(
    userId: string,
    targetUserId: string,
    permissions: UpdatePermissionsDto,
  ) {
    const mainUser = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!mainUser) {
      throw new NotFoundException('User not found');
    }

    if (!mainUser.mainUser) {
      throw new ForbiddenException('Only main users can update permissions');
    }

    const targetUser = await this.prisma.user.findUnique({
      where: { id: targetUserId },
    });

    if (!targetUser) {
      throw new NotFoundException('Target user not found');
    }

    if (targetUser.companyId !== mainUser.companyId) {
      throw new ForbiddenException(
        'Cannot update permissions for users from different companies',
      );
    }

    if (targetUser.mainUser) {
      throw new ForbiddenException('Cannot update permissions for main user');
    }

    const updatedUser = await this.prisma.user.update({
      where: { id: targetUserId },
      data: {
        permissions: JSON.parse(JSON.stringify(permissions)) as InputJsonValue,
      },
      select: {
        id: true,
        name: true,
        email: true,
        permissions: true,
      },
    });

    return {
      ...updatedUser,
      message: 'Permissions updated successfully',
    };
  }

  async deactivateUser(userId: string, targetUserId: string) {
    const mainUser = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!mainUser) {
      throw new NotFoundException('User not found');
    }

    if (!mainUser.mainUser) {
      throw new ForbiddenException(
        'Only main users can deactivate team members',
      );
    }

    const targetUser = await this.prisma.user.findUnique({
      where: { id: targetUserId },
    });

    if (!targetUser) {
      throw new NotFoundException('Target user not found');
    }

    if (targetUser.companyId !== mainUser.companyId) {
      throw new ForbiddenException(
        'Cannot deactivate users from different companies',
      );
    }

    if (targetUser.mainUser) {
      throw new ForbiddenException('Cannot deactivate main user');
    }

    // Deactivate user and invalidate all refresh tokens
    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: targetUserId },
        data: { status: 'inactive' },
      });

      await tx.refreshToken.deleteMany({
        where: { userId: targetUserId },
      });
    });

    return { message: 'User deactivated successfully' };
  }

  private getDefaultPermissions() {
    return {
      registration: {
        property: { view: false, add: false, edit: false, remove: false },
        location: { view: false, add: false, edit: false, remove: false },
        employee: { view: false, add: false, edit: false, remove: false },
        serviceProvider: {
          view: false,
          add: false,
          edit: false,
          remove: false,
        },
        supplier: { view: false, add: false, edit: false, remove: false },
        buyer: { view: false, add: false, edit: false, remove: false },
        inventory: { view: false, add: false, edit: false, remove: false },
        animals: { view: false, add: false, edit: false, remove: false },
      },
      records: {
        births: { view: false, add: false, edit: false, remove: false },
        acquisitions: { view: false, add: false, edit: false, remove: false },
        weighings: { view: false, add: false, edit: false, remove: false },
        sales: { view: false, add: false, edit: false, remove: false },
        deaths: { view: false, add: false, edit: false, remove: false },
        sanitaryControls: {
          view: false,
          add: false,
          edit: false,
          remove: false,
        },
        locationMovements: {
          view: false,
          add: false,
          edit: false,
          remove: false,
        },
        animalMovements: {
          view: false,
          add: false,
          edit: false,
          remove: false,
        },
      },
      breedings: {
        breedings: { view: false, add: false, edit: false, remove: false },
        unconfirmedBreedings: {
          view: false,
          add: false,
          edit: false,
          remove: false,
        },
        pregnantCows: { view: false, add: false, edit: false, remove: false },
        reproductiveIndexes: {
          view: false,
          add: false,
          edit: false,
          remove: false,
        },
        birthForecast: { view: false, add: false, edit: false, remove: false },
      },
      finances: {
        cashFlow: { view: false, add: false, edit: false, remove: false },
        accountsPayable: {
          view: false,
          add: false,
          edit: false,
          remove: false,
        },
        accountsReceivable: {
          view: false,
          add: false,
          edit: false,
          remove: false,
        },
        bankAccounts: { view: false, add: false, edit: false, remove: false },
      },
    };
  }
}
