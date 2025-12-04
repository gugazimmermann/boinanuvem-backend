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

type PrismaTransaction = Parameters<
  Parameters<PrismaService['$transaction']>[0]
>[0];

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
    await this.validateCompanyRegistration(registerCompanyDto);

    const result = await this.createCompanyAndUser(registerCompanyDto);

    await this.sendVerificationEmail(result.mainUser);

    return this.buildRegistrationResponse(result);
  }

  private async validateCompanyRegistration(
    dto: RegisterCompanyDto,
  ): Promise<void> {
    const existingCompany = await this.prisma.company.findUnique({
      where: { cnpj: dto.cnpj },
    });

    if (existingCompany) {
      throw new ConflictException('Company with this CNPJ already exists');
    }

    if (dto.email) {
      const existingCompanyEmail = await this.prisma.company.findUnique({
        where: { email: dto.email },
      });

      if (existingCompanyEmail) {
        throw new ConflictException('Company with this email already exists');
      }
    }

    if (dto.userEmail) {
      const existingUser = await this.prisma.user.findUnique({
        where: { email: dto.userEmail },
      });

      if (existingUser) {
        throw new ConflictException('User with this email already exists');
      }
    }
  }

  private async createCompanyAndUser(dto: RegisterCompanyDto): Promise<{
    company: { id: string; cnpj: string; companyName: string; email: string };
    mainUser: { id: string; name: string; email: string; status: string };
  }> {
    return this.prisma.$transaction(async (tx) => {
      const advancedPlan = await this.findAdvancedPlan(tx);
      const trialData = this.trialService.initializeTrial();
      const company = await this.createCompanyInTransaction(tx, dto, trialData);
      await this.createTrialSubscription(tx, company, advancedPlan);
      const mainUser = await this.createMainUserInTransaction(tx, dto, company);

      return {
        company: {
          id: company.id,
          cnpj: company.cnpj,
          companyName: company.companyName,
          email: company.email,
        },
        mainUser: {
          id: mainUser.id,
          name: mainUser.name,
          email: mainUser.email,
          status: mainUser.status,
        },
      };
    });
  }

  private async findAdvancedPlan(
    tx: PrismaTransaction,
  ): Promise<{ id: string }> {
    const advancedPlan = await tx.plan.findUnique({
      where: { name: 'Avançado' },
    });

    if (!advancedPlan) {
      throw new Error('Avançado plan not found. Please run database seeding.');
    }

    return advancedPlan;
  }

  private async createCompanyInTransaction(
    tx: PrismaTransaction,
    dto: RegisterCompanyDto,
    trialData: {
      trialStartDate: Date;
      trialEndDate: Date;
      trialStatus: string;
    },
  ): Promise<{
    id: string;
    cnpj: string;
    companyName: string;
    email: string;
    createdAt: Date;
  }> {
    return tx.company.create({
      data: {
        cnpj: dto.cnpj,
        companyName: dto.companyName,
        email: dto.email,
        phone: dto.phone,
        street: dto.street,
        number: dto.number,
        complement: dto.complement ?? null,
        neighborhood: dto.neighborhood,
        city: dto.city,
        state: dto.state,
        zipCode: dto.zipCode,
        latitude: dto.latitude ?? null,
        longitude: dto.longitude ?? null,
        trialStartDate: trialData.trialStartDate,
        trialEndDate: trialData.trialEndDate,
        trialStatus: trialData.trialStatus,
      },
    });
  }

  private async createTrialSubscription(
    tx: PrismaTransaction,
    company: { id: string; createdAt: Date },
    advancedPlan: { id: string },
  ): Promise<void> {
    const trialSubscriptionData = this.trialService.createTrialSubscription(
      company.id,
      advancedPlan.id,
      company.createdAt,
    );

    await tx.companySubscription.create({
      data: trialSubscriptionData,
    });
  }

  private async createMainUserInTransaction(
    tx: PrismaTransaction,
    dto: RegisterCompanyDto,
    company: { id: string },
  ): Promise<{ id: string; email: string; name: string; status: string }> {
    const hashedPassword = await this.authService.hashPassword(
      dto.userPassword,
    );

    return tx.user.create({
      data: {
        name: dto.userName,
        cpf: dto.userCpf,
        email: dto.userEmail,
        phone: dto.userPhone,
        password: hashedPassword,
        street: dto.userStreet ?? dto.street ?? null,
        number: dto.userNumber ?? dto.number ?? null,
        complement: dto.userComplement ?? dto.complement ?? null,
        neighborhood: dto.userNeighborhood ?? dto.neighborhood ?? null,
        city: dto.userCity ?? dto.city ?? null,
        state: dto.userState ?? dto.state ?? null,
        zipCode: dto.userZipCode ?? dto.zipCode ?? null,
        mainUser: true,
        status: 'pending',
        companyId: company.id,
        permissions: this.getFullPermissions(),
      },
    });
  }

  private async sendVerificationEmail(mainUser: {
    id: string;
    email: string;
    name: string;
    status: string;
  }): Promise<void> {
    const verificationToken =
      await this.authService.generateEmailVerificationToken(
        mainUser.id,
        mainUser.email,
      );

    await this.emailService.sendEmailVerification(
      mainUser.email,
      mainUser.name,
      verificationToken,
    );
  }

  private buildRegistrationResponse(result: {
    company: { id: string; cnpj: string; companyName: string; email: string };
    mainUser: { id: string; name: string; email: string; status: string };
  }): unknown {
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
