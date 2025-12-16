import { plainToInstance, Transform } from 'class-transformer';
import {
  IsEnum,
  IsNumber,
  IsString,
  IsBoolean,
  IsOptional,
  validateSync,
  Min,
  Max,
} from 'class-validator';

export enum Environment {
  Development = 'development',
  Production = 'production',
  Test = 'test',
}

export class EnvironmentVariables {
  @IsEnum(Environment)
  NODE_ENV: Environment = Environment.Development;

  @IsNumber()
  @Min(1)
  @Max(65535)
  @Transform(({ value }) => parseInt(value as string, 10))
  PORT: number = 3000;

  @IsBoolean()
  @Transform(({ value }) => value === 'true')
  ENABLE_SWAGGER: boolean = true;

  @IsString()
  @IsOptional()
  CORS_ORIGIN: string = 'http://localhost:3000';

  @IsNumber()
  @Min(1000)
  @Transform(({ value }) => parseInt(value as string, 10))
  RATE_LIMIT_TTL: number = 60000;

  @IsNumber()
  @Min(1)
  @Max(1000)
  @Transform(({ value }) => parseInt(value as string, 10))
  RATE_LIMIT_MAX: number = 100;

  @IsString()
  @IsOptional()
  LOG_LEVEL: string = 'debug';

  @IsBoolean()
  @Transform(({ value }) => value === 'true')
  LOG_FILE_ENABLED: boolean = true;

  @IsString()
  @IsOptional()
  API_PREFIX: string = 'api';

  @IsNumber()
  @Min(1000)
  @Max(300000)
  @Transform(({ value }) => parseInt(value as string, 10))
  REQUEST_TIMEOUT: number = 30000;

  @IsString()
  @IsOptional()
  MAX_REQUEST_SIZE: string = '10mb';

  @IsNumber()
  @Min(0)
  @Transform(({ value }) => parseInt(value as string, 10))
  @IsOptional()
  HSTS_MAX_AGE: number = 31536000;

  @IsString()
  @IsOptional()
  CSP_DIRECTIVES: string = "default-src 'self'";

  @IsString()
  DATABASE_URL!: string;

  @IsString()
  JWT_SECRET!: string;

  @IsString()
  FRONTEND_URL!: string;

  @IsString()
  GMAIL_EMAIL!: string;

  @IsString()
  GMAIL_PASSWORD!: string;

  @IsString()
  @IsOptional()
  STRIPE_SECRET_KEY?: string;
}

export function validate(config: Record<string, unknown>) {
  const validatedConfig = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    throw new Error(`Configuration validation error: ${errors.toString()}`);
  }

  return validatedConfig;
}
