import {
  Injectable,
  ConflictException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../common/services/prisma.service';
import { TrialService } from '../common/services/trial.service';
import { AuthService } from '../auth/auth.service';
import { EmailService } from '../email/email.service';
import { RegisterCompanyDto, UpdateCompanyDto } from './dto';

@Injectable()
export class CompaniesService {
  constructor(
    private prisma: PrismaService,
    private authService: AuthService,
    private emailService: EmailService,
    private trialService: TrialService,
  ) {}

  async registerCompany(
    registerCompanyDto: RegisterCompanyDto,
  ): Promise<unknown> {
    // Check if company with CNPJ already exists
    const existingCompany = await this.prisma.company.findUnique({
      where: { cnpj: registerCompanyDto.cnpj },
    });

    if (existingCompany) {
      throw new ConflictException('Company with this CNPJ already exists');
    }

    // Check if company email already exists
    const existingCompanyEmail = await this.prisma.company.findUnique({
      where: { email: registerCompanyDto.email },
    });

    if (existingCompanyEmail) {
      throw new ConflictException('Company with this email already exists');
    }

    // Check if user email already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email: registerCompanyDto.userEmail },
    });

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    // Create company and main user in a transaction
    const result = await this.prisma.$transaction(async (tx) => {
      // Find the "Avançado" plan for trial
      const advancedPlan = await tx.plan.findUnique({
        where: { name: 'Avançado' },
      });

      if (!advancedPlan) {
        throw new Error(
          'Avançado plan not found. Please run database seeding.',
        );
      }

      // Initialize trial data
      const trialData = this.trialService.initializeTrial();

      // Create company
      const company = await tx.company.create({
        data: {
          cnpj: registerCompanyDto.cnpj,
          companyName: registerCompanyDto.companyName,
          email: registerCompanyDto.email,
          phone: registerCompanyDto.phone,
          street: registerCompanyDto.street,
          number: registerCompanyDto.number,
          complement: registerCompanyDto.complement || null,
          neighborhood: registerCompanyDto.neighborhood,
          city: registerCompanyDto.city,
          state: registerCompanyDto.state,
          zipCode: registerCompanyDto.zipCode,
          latitude: registerCompanyDto.latitude || null,
          longitude: registerCompanyDto.longitude || null,
          trialStartDate: trialData.trialStartDate,
          trialEndDate: trialData.trialEndDate,
          trialStatus: trialData.trialStatus,
        },
      });

      // Create trial subscription with "Avançado" plan
      const trialSubscriptionData = this.trialService.createTrialSubscription(
        company.id,
        advancedPlan.id,
        company.createdAt,
      );

      await tx.companySubscription.create({
        data: trialSubscriptionData,
      });

      // Hash password
      const hashedPassword = await this.authService.hashPassword(
        registerCompanyDto.userPassword,
      );

      // Create main user with full permissions
      const mainUser = await tx.user.create({
        data: {
          name: registerCompanyDto.userName,
          cpf: registerCompanyDto.userCpf || null,
          email: registerCompanyDto.userEmail,
          phone: registerCompanyDto.userPhone,
          password: hashedPassword,
          street:
            registerCompanyDto.userStreet || registerCompanyDto.street || null,
          number:
            registerCompanyDto.userNumber || registerCompanyDto.number || null,
          complement:
            registerCompanyDto.userComplement ||
            registerCompanyDto.complement ||
            null,
          neighborhood:
            registerCompanyDto.userNeighborhood ||
            registerCompanyDto.neighborhood ||
            null,
          city: registerCompanyDto.userCity || registerCompanyDto.city || null,
          state:
            registerCompanyDto.userState || registerCompanyDto.state || null,
          zipCode:
            registerCompanyDto.userZipCode ||
            registerCompanyDto.zipCode ||
            null,
          mainUser: true,
          status: 'pending', // Will be activated after email verification
          companyId: company.id,
          permissions: this.getFullPermissions(),
        },
      });

      return { company, mainUser };
    });

    // Generate email verification token
    const verificationToken =
      await this.authService.generateEmailVerificationToken(
        result.mainUser.id,
        result.mainUser.email,
      );

    // Send verification email
    await this.emailService.sendEmailVerification(
      result.mainUser.email,
      result.mainUser.name,
      verificationToken,
    );

    // Send welcome email to company
    await this.emailService.sendWelcomeEmail(
      result.company.email,
      result.mainUser.name,
      result.company.companyName,
    );

    return {
      message:
        'Company registered successfully. Please check your email to verify your account.',
      company: {
        id: result.company.id,
        cnpj: result.company.cnpj,
        companyName: result.company.companyName,
        email: result.company.email,
      },
      mainUser: {
        id: result.mainUser.id,
        name: result.mainUser.name,
        email: result.mainUser.email,
        status: result.mainUser.status,
      },
    };
  }

  async getCompany(id: string, userId: string): Promise<unknown> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.companyId !== id) {
      throw new ForbiddenException('Access denied to this company');
    }

    const company = await this.prisma.company.findUnique({
      where: { id },
      include: {
        users: {
          select: {
            id: true,
            name: true,
            email: true,
            mainUser: true,
            status: true,
            createdAt: true,
            lastAccess: true,
          },
        },
        subscriptions: {
          include: {
            plan: true,
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
        payments: {
          orderBy: {
            createdAt: 'desc',
          },
          take: 10, // Last 10 payments
        },
      },
    });

    if (!company) {
      throw new NotFoundException('Company not found');
    }

    // Enhance company data with trial information
    const enhancedCompany = await this.enhanceCompanyWithTrialInfo(company);

    return enhancedCompany;
  }

  async updateCompany(
    id: string,
    updateCompanyDto: UpdateCompanyDto,
    userId: string,
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.companyId !== id) {
      throw new ForbiddenException('Access denied to this company');
    }

    if (!user.mainUser) {
      throw new ForbiddenException(
        'Only main users can update company information',
      );
    }

    // Check if email is being changed and if it already exists
    if (updateCompanyDto.email) {
      const existingCompany = await this.prisma.company.findFirst({
        where: {
          email: updateCompanyDto.email,
          id: { not: id },
        },
      });

      if (existingCompany) {
        throw new ConflictException('Company with this email already exists');
      }
    }

    const updatedCompany = await this.prisma.company.update({
      where: { id },
      data: updateCompanyDto,
    });

    return updatedCompany;
  }

  private getFullPermissions() {
    return {
      registration: {
        property: { view: true, add: true, edit: true, remove: true },
        location: { view: true, add: true, edit: true, remove: true },
        employee: { view: true, add: true, edit: true, remove: true },
        serviceProvider: { view: true, add: true, edit: true, remove: true },
        supplier: { view: true, add: true, edit: true, remove: true },
        buyer: { view: true, add: true, edit: true, remove: true },
        inventory: { view: true, add: true, edit: true, remove: true },
        animals: { view: true, add: true, edit: true, remove: true },
      },
      records: {
        births: { view: true, add: true, edit: true, remove: true },
        acquisitions: { view: true, add: true, edit: true, remove: true },
        weighings: { view: true, add: true, edit: true, remove: true },
        sales: { view: true, add: true, edit: true, remove: true },
        deaths: { view: true, add: true, edit: true, remove: true },
        sanitaryControls: { view: true, add: true, edit: true, remove: true },
        locationMovements: { view: true, add: true, edit: true, remove: true },
        animalMovements: { view: true, add: true, edit: true, remove: true },
        inventoryMovements: { view: true, add: true, edit: true, remove: true },
      },
      breedings: {
        breedings: { view: true, add: true, edit: true, remove: true },
        unconfirmedBreedings: {
          view: true,
          add: true,
          edit: true,
          remove: true,
        },
        pregnantCows: { view: true, add: true, edit: true, remove: true },
        reproductiveIndexes: {
          view: true,
          add: true,
          edit: true,
          remove: true,
        },
        birthForecast: { view: true, add: true, edit: true, remove: true },
      },
      finances: {
        cashFlow: { view: true, add: true, edit: true, remove: true },
        accountsPayable: { view: true, add: true, edit: true, remove: true },
        accountsReceivable: { view: true, add: true, edit: true, remove: true },
        bankAccounts: { view: true, add: true, edit: true, remove: true },
      },
      reports: {
        analytics: { view: true, add: true, edit: true, remove: true },
        financialReports: { view: true, add: true, edit: true, remove: true },
        animalReports: { view: true, add: true, edit: true, remove: true },
        productionReports: { view: true, add: true, edit: true, remove: true },
        inventoryReports: { view: true, add: true, edit: true, remove: true },
      },
    };
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

    const companyData = company as Record<string, unknown>;
    const subscriptions = companyData.subscriptions as unknown[] | undefined;

    // Get current active subscription
    const activeSubscription = subscriptions?.find((sub: unknown) => {
      const subscription = sub as Record<string, unknown>;
      return (
        (subscription.isActive && subscription.status === 'active') ||
        subscription.status === 'trial'
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
