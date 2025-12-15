import { Module, Logger } from '@nestjs/common';
import { APP_INTERCEPTOR, APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { HealthModule } from './health/health.module';
import { MetricsModule } from './metrics/metrics.module';
import { PlansModule } from './plans/plans.module';
import { AuthModule } from './auth/auth.module';
import { CompaniesModule } from './companies/companies.module';
import { UsersModule } from './users/users.module';
import { EmailModule } from './email/email.module';
import { PaymentsModule } from './payments/payments.module';
import { PropertiesModule } from './properties/properties.module';
import { LocationsModule } from './locations/locations.module';
import { EmployeesModule } from './employees/employees.module';
import { ServiceProvidersModule } from './service-providers/service-providers.module';
import { SuppliersModule } from './suppliers/suppliers.module';
import { BuyersModule } from './buyers/buyers.module';
import { AnimalsModule } from './animals/animals.module';
import { BirthsModule } from './births/births.module';
import { AcquisitionsModule } from './acquisitions/acquisitions.module';
import { SalesModule } from './sales/sales.module';
import { DeathsModule } from './deaths/deaths.module';
import { WeighingsModule } from './weighings/weighings.module';
import { InventoryItemsModule } from './inventory-items/inventory-items.module';
import { InventoryMovementsModule } from './inventory-movements/inventory-movements.module';
import { AnimalMovementsModule } from './animal-movements/animal-movements.module';
import { LocationMovementsModule } from './location-movements/location-movements.module';
import { BreedingsModule } from './breedings/breedings.module';
import { SanitaryControlsModule } from './sanitary-controls/sanitary-controls.module';
import { CashFlowModule } from './cash-flow/cash-flow.module';
import { AccountsPayableModule } from './accounts-payable/accounts-payable.module';
import { AccountsReceivableModule } from './accounts-receivable/accounts-receivable.module';
import { BankAccountsModule } from './bank-accounts/bank-accounts.module';
import { AnimalObservationsModule } from './animal-observations/animal-observations.module';
import { BuyerObservationsModule } from './buyer-observations/buyer-observations.module';
import { EmployeeObservationsModule } from './employee-observations/employee-observations.module';
import { InventoryObservationsModule } from './inventory-observations/inventory-observations.module';
import { LocationObservationsModule } from './location-observations/location-observations.module';
import { ServiceProviderObservationsModule } from './service-provider-observations/service-provider-observations.module';
import { SupplierObservationsModule } from './supplier-observations/supplier-observations.module';
import { CashFlowObservationsModule } from './cash-flow-observations/cash-flow-observations.module';
import { AccountsPayableObservationsModule } from './accounts-payable-observations/accounts-payable-observations.module';
import { AccountsReceivableObservationsModule } from './accounts-receivable-observations/accounts-receivable-observations.module';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { SecurityLoggingInterceptor } from './common/interceptors/security-logging.interceptor';
import { FileLoggerService } from './common/logger/file-logger.service';
import { validate } from './common/config/env.validation';
import securityConfig from './common/config/security.config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate,
      load: [securityConfig],
      envFilePath: [`.env.${process.env.NODE_ENV ?? 'development'}`, '.env'],
    }),
    ThrottlerModule.forRootAsync({
      useFactory: () => ({
        throttlers: [
          {
            ttl: parseInt(process.env.RATE_LIMIT_TTL ?? '60000', 10),
            limit: parseInt(process.env.RATE_LIMIT_MAX ?? '100', 10),
          },
        ],
      }),
    }),
    HealthModule,
    MetricsModule,
    PlansModule,
    AuthModule,
    CompaniesModule,
    UsersModule,
    EmailModule,
    PaymentsModule,
    PropertiesModule,
    LocationsModule,
    EmployeesModule,
    ServiceProvidersModule,
    SuppliersModule,
    BuyersModule,
    AnimalsModule,
    BirthsModule,
    AcquisitionsModule,
    SalesModule,
    DeathsModule,
    WeighingsModule,
    InventoryItemsModule,
    InventoryMovementsModule,
    AnimalMovementsModule,
    LocationMovementsModule,
    BreedingsModule,
    SanitaryControlsModule,
    CashFlowModule,
    AccountsPayableModule,
    AccountsReceivableModule,
    BankAccountsModule,
    AnimalObservationsModule,
    BuyerObservationsModule,
    EmployeeObservationsModule,
    InventoryObservationsModule,
    LocationObservationsModule,
    ServiceProviderObservationsModule,
    SupplierObservationsModule,
    CashFlowObservationsModule,
    AccountsPayableObservationsModule,
    AccountsReceivableObservationsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    Logger,
    FileLoggerService,
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: SecurityLoggingInterceptor,
    },
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
  exports: [Logger, FileLoggerService],
})
export class AppModule {}
