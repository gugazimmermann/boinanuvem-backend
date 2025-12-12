import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

/**
 * Test data factories for creating common test entities
 */

export interface CreateAnimalOptions {
  code?: string;
  registrationNumber?: string;
  status?: string;
  propertyId: string;
  companyId: string;
  [key: string]: any;
}

export interface CreatePropertyOptions {
  code?: string;
  name?: string;
  companyId: string;
  [key: string]: any;
}

export interface CreateBuyerOptions {
  code?: string;
  name?: string;
  companyId: string;
  propertyIds?: string[];
  [key: string]: any;
}

export interface CreateEmployeeOptions {
  code?: string;
  name?: string;
  companyId: string;
  [key: string]: any;
}

export interface CreateServiceProviderOptions {
  code?: string;
  name?: string;
  companyId: string;
  [key: string]: any;
}

export interface CreateSupplierOptions {
  code?: string;
  name?: string;
  companyId: string;
  [key: string]: any;
}

export interface CreateInventoryItemOptions {
  code?: string;
  name?: string;
  category?: string;
  unit?: string;
  minimumStock?: number;
  hasExpiration?: boolean;
  companyId: string;
  [key: string]: any;
}

export interface CreateUserOptions {
  name?: string;
  email: string;
  companyId: string;
  password?: string;
  mainUser?: boolean;
  status?: string;
  permissions?: any;
  [key: string]: any;
}

/**
 * Create a test animal
 */
export async function createTestAnimal(
  prisma: PrismaClient,
  options: CreateAnimalOptions,
): Promise<any> {
  return prisma.animal.create({
    data: {
      code: options.code || 'TEST-001',
      registrationNumber: options.registrationNumber || 'BR-2020-T0001',
      status: options.status || 'active',
      propertyId: options.propertyId,
      companyId: options.companyId,
      ...Object.fromEntries(
        Object.entries(options).filter(
          ([key]) =>
            ![
              'code',
              'registrationNumber',
              'status',
              'propertyId',
              'companyId',
            ].includes(key),
        ),
      ),
    },
  });
}

/**
 * Create multiple test animals
 */
export async function createTestAnimals(
  prisma: PrismaClient,
  count: number,
  baseOptions: Omit<CreateAnimalOptions, 'code' | 'registrationNumber'>,
): Promise<any[]> {
  return Promise.all(
    Array.from({ length: count }, (_, i) =>
      createTestAnimal(prisma, {
        ...baseOptions,
        code: baseOptions.code || `TEST-${String(i + 1).padStart(3, '0')}`,
        registrationNumber:
          baseOptions.registrationNumber ||
          `BR-2020-T${String(i + 1).padStart(4, '0')}`,
      }),
    ),
  );
}

/**
 * Create a test property
 */
export async function createTestProperty(
  prisma: PrismaClient,
  options: CreatePropertyOptions,
): Promise<any> {
  return prisma.property.create({
    data: {
      code: options.code || '001',
      name: options.name || 'Test Property',
      area: { value: 100, type: 'hectares' },
      status: 'active',
      companyId: options.companyId,
      street: 'Test Street',
      number: '123',
      neighborhood: 'Test Neighborhood',
      city: 'Test City',
      state: 'SC',
      zipCode: '88395-000',
      ...Object.fromEntries(
        Object.entries(options).filter(
          ([key]) => !['code', 'name', 'companyId'].includes(key),
        ),
      ),
    },
  });
}

/**
 * Create a test buyer
 */
export async function createTestBuyer(
  prisma: PrismaClient,
  options: CreateBuyerOptions,
): Promise<any> {
  const propertyConnections =
    options.propertyIds?.map((propertyId) => ({
      propertyId,
    })) || [];

  return prisma.buyer.create({
    data: {
      code: options.code || '001',
      name: options.name || 'Test Buyer',
      companyId: options.companyId,
      ...(propertyConnections.length > 0
        ? {
            properties: {
              create: propertyConnections,
            },
          }
        : {}),
      ...Object.fromEntries(
        Object.entries(options).filter(
          ([key]) =>
            !['code', 'name', 'companyId', 'propertyIds'].includes(key),
        ),
      ),
    },
  });
}

/**
 * Create a test employee
 */
export async function createTestEmployee(
  prisma: PrismaClient,
  options: CreateEmployeeOptions,
): Promise<any> {
  return prisma.employee.create({
    data: {
      code: options.code || 'EMP-001',
      name: options.name || 'Test Employee',
      companyId: options.companyId,
      ...Object.fromEntries(
        Object.entries(options).filter(
          ([key]) => !['code', 'name', 'companyId'].includes(key),
        ),
      ),
    },
  });
}

/**
 * Create multiple test employees
 */
export async function createTestEmployees(
  prisma: PrismaClient,
  count: number,
  baseOptions: Omit<CreateEmployeeOptions, 'code' | 'name'>,
): Promise<any[]> {
  return Promise.all(
    Array.from({ length: count }, (_, i) =>
      createTestEmployee(prisma, {
        ...baseOptions,
        code: baseOptions.code || `EMP-${String(i + 1).padStart(3, '0')}`,
        name: baseOptions.name || `Employee ${i + 1}`,
      }),
    ),
  );
}

/**
 * Create a test service provider
 */
export async function createTestServiceProvider(
  prisma: PrismaClient,
  options: CreateServiceProviderOptions,
): Promise<any> {
  return prisma.serviceProvider.create({
    data: {
      code: options.code || 'SP-001',
      name: options.name || 'Test Service Provider',
      companyId: options.companyId,
      ...Object.fromEntries(
        Object.entries(options).filter(
          ([key]) => !['code', 'name', 'companyId'].includes(key),
        ),
      ),
    },
  });
}

/**
 * Create multiple test service providers
 */
export async function createTestServiceProviders(
  prisma: PrismaClient,
  count: number,
  baseOptions: Omit<CreateServiceProviderOptions, 'code' | 'name'>,
): Promise<any[]> {
  return Promise.all(
    Array.from({ length: count }, (_, i) =>
      createTestServiceProvider(prisma, {
        ...baseOptions,
        code: baseOptions.code || `SP-${String(i + 1).padStart(3, '0')}`,
        name: baseOptions.name || `Service Provider ${i + 1}`,
      }),
    ),
  );
}

/**
 * Create a test supplier
 */
export async function createTestSupplier(
  prisma: PrismaClient,
  options: CreateSupplierOptions,
): Promise<any> {
  return prisma.supplier.create({
    data: {
      code: options.code || '001',
      name: options.name || 'Test Supplier',
      companyId: options.companyId,
      ...Object.fromEntries(
        Object.entries(options).filter(
          ([key]) => !['code', 'name', 'companyId'].includes(key),
        ),
      ),
    },
  });
}

/**
 * Create a test inventory item
 */
export async function createTestInventoryItem(
  prisma: PrismaClient,
  options: CreateInventoryItemOptions,
): Promise<any> {
  return prisma.inventoryItem.create({
    data: {
      code: options.code || 'INV-001',
      name: options.name || 'Test Inventory Item',
      category: options.category || 'medicines',
      unit: options.unit || 'ml',
      minimumStock: options.minimumStock ?? 10,
      hasExpiration: options.hasExpiration ?? false,
      companyId: options.companyId,
      ...Object.fromEntries(
        Object.entries(options).filter(
          ([key]) =>
            ![
              'code',
              'name',
              'category',
              'unit',
              'minimumStock',
              'hasExpiration',
              'companyId',
            ].includes(key),
        ),
      ),
    },
  });
}

/**
 * Create a test user
 */
export async function createTestUser(
  prisma: PrismaClient,
  options: CreateUserOptions,
): Promise<any> {
  const hashedPassword = options.password
    ? await bcrypt.hash(options.password, 10)
    : await bcrypt.hash('password123', 10);

  return prisma.user.create({
    data: {
      name: options.name || 'Test User',
      email: options.email,
      phone: '(47) 99999-8888',
      password: hashedPassword,
      companyId: options.companyId,
      mainUser: options.mainUser !== undefined ? options.mainUser : true,
      status: options.status || 'active',
      emailVerifiedAt: new Date(),
      permissions: options.permissions || {},
      ...Object.fromEntries(
        Object.entries(options).filter(
          ([key]) =>
            ![
              'name',
              'email',
              'companyId',
              'password',
              'mainUser',
              'status',
              'permissions',
            ].includes(key),
        ),
      ),
    },
  });
}
