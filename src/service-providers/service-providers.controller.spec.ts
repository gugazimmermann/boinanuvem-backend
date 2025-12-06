import { Test, TestingModule } from '@nestjs/testing';
import { ThrottlerModule } from '@nestjs/throttler';
import { ServiceProvidersController } from './service-providers.controller';
import { ServiceProvidersService } from './service-providers.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { CreateServiceProviderDto, UpdateServiceProviderDto } from './dto';
import type { CurrentUser } from '../auth/decorators/current-user.decorator';

describe('ServiceProvidersController', () => {
  let controller: ServiceProvidersController;
  let serviceProvidersService: jest.Mocked<ServiceProvidersService>;

  const mockCurrentUser: CurrentUser = {
    id: 'user-1',
    email: 'test@example.com',
    companyId: 'company-1',
    mainUser: false,
  };

  const mockServiceProvider = {
    id: 'service-provider-1',
    code: '001',
    name: 'Serviços Agrícolas LTDA',
    cpf: '123.456.789-00',
    cnpj: '12.345.678/0001-90',
    email: 'contato@servicosagricolas.com',
    phone: '(47) 99999-9999',
    status: 'active',
    companyId: 'company-1',
    propertyIds: ['property-1'],
    createdAt: new Date('2025-01-15'),
    updatedAt: new Date('2025-01-15'),
  };

  const mockCreateServiceProviderDto: CreateServiceProviderDto = {
    code: '001',
    name: 'Serviços Agrícolas LTDA',
    cpf: '123.456.789-00',
    cnpj: '12.345.678/0001-90',
    email: 'contato@servicosagricolas.com',
    phone: '(47) 99999-9999',
    status: 'active',
    propertyIds: ['property-1'],
  };

  beforeEach(async () => {
    const mockServiceProvidersService = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      imports: [ThrottlerModule.forRoot()],
      controllers: [ServiceProvidersController],
      providers: [
        {
          provide: ServiceProvidersService,
          useValue: mockServiceProvidersService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(PermissionsGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<ServiceProvidersController>(
      ServiceProvidersController,
    );
    serviceProvidersService = module.get(ServiceProvidersService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create a service provider', async () => {
      serviceProvidersService.create.mockResolvedValue(mockServiceProvider);

      const result = await controller.create(
        mockCurrentUser,
        mockCreateServiceProviderDto,
      );

      expect(serviceProvidersService.create).toHaveBeenCalledWith(
        mockCurrentUser.id,
        mockCreateServiceProviderDto,
      );
      expect(result).toEqual(mockServiceProvider);
    });
  });

  describe('findAll', () => {
    it('should return all service providers', async () => {
      serviceProvidersService.findAll.mockResolvedValue([mockServiceProvider]);

      const result = await controller.findAll(mockCurrentUser);

      expect(serviceProvidersService.findAll).toHaveBeenCalledWith(
        mockCurrentUser.id,
      );
      expect(result).toEqual([mockServiceProvider]);
    });
  });

  describe('findOne', () => {
    it('should return a service provider by id', async () => {
      serviceProvidersService.findOne.mockResolvedValue(mockServiceProvider);

      const result = await controller.findOne(
        mockCurrentUser,
        mockServiceProvider.id,
      );

      expect(serviceProvidersService.findOne).toHaveBeenCalledWith(
        mockCurrentUser.id,
        mockServiceProvider.id,
      );
      expect(result).toEqual(mockServiceProvider);
    });
  });

  describe('update', () => {
    it('should update a service provider', async () => {
      const updateDto: UpdateServiceProviderDto = {
        name: 'Updated Name',
      };
      const updatedServiceProvider = {
        ...mockServiceProvider,
        ...updateDto,
      };

      serviceProvidersService.update.mockResolvedValue(updatedServiceProvider);

      const result = await controller.update(
        mockCurrentUser,
        mockServiceProvider.id,
        updateDto,
      );

      expect(serviceProvidersService.update).toHaveBeenCalledWith(
        mockCurrentUser.id,
        mockServiceProvider.id,
        updateDto,
      );
      expect(result).toEqual(updatedServiceProvider);
    });
  });

  describe('remove', () => {
    it('should soft delete a service provider', async () => {
      serviceProvidersService.remove.mockResolvedValue({
        message: 'Service provider deleted successfully',
      });

      const result = await controller.remove(
        mockCurrentUser,
        mockServiceProvider.id,
      );

      expect(serviceProvidersService.remove).toHaveBeenCalledWith(
        mockCurrentUser.id,
        mockServiceProvider.id,
      );
      expect(result).toEqual({
        message: 'Service provider deleted successfully',
      });
    });
  });
});
