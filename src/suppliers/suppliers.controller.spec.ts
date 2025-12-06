import { Test, TestingModule } from '@nestjs/testing';
import { ThrottlerModule } from '@nestjs/throttler';
import { SuppliersController } from './suppliers.controller';
import { SuppliersService } from './suppliers.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { CreateSupplierDto, UpdateSupplierDto } from './dto';
import type { CurrentUser } from '../auth/decorators/current-user.decorator';

describe('SuppliersController', () => {
  let controller: SuppliersController;
  let suppliersService: jest.Mocked<SuppliersService>;

  const mockCurrentUser: CurrentUser = {
    id: 'user-1',
    email: 'test@example.com',
    companyId: 'company-1',
    mainUser: false,
  };

  const mockSupplier = {
    id: 'supplier-1',
    code: '001',
    name: 'Fornecedor de Ração LTDA',
    cpf: '123.456.789-00',
    cnpj: '12.345.678/0001-90',
    email: 'contato@fornecedor.com',
    phone: '(47) 99999-9999',
    status: 'active',
    companyId: 'company-1',
    propertyIds: ['property-1'],
    createdAt: new Date('2025-01-15'),
    updatedAt: new Date('2025-01-15'),
  };

  const mockCreateSupplierDto: CreateSupplierDto = {
    code: '001',
    name: 'Fornecedor de Ração LTDA',
    cpf: '123.456.789-00',
    cnpj: '12.345.678/0001-90',
    email: 'contato@fornecedor.com',
    phone: '(47) 99999-9999',
    status: 'active',
    propertyIds: ['property-1'],
  };

  beforeEach(async () => {
    const mockSuppliersService = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      imports: [ThrottlerModule.forRoot()],
      controllers: [SuppliersController],
      providers: [
        {
          provide: SuppliersService,
          useValue: mockSuppliersService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(PermissionsGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<SuppliersController>(SuppliersController);
    suppliersService = module.get(SuppliersService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create a supplier', async () => {
      suppliersService.create.mockResolvedValue(mockSupplier);

      const result = await controller.create(
        mockCurrentUser,
        mockCreateSupplierDto,
      );

      expect(suppliersService.create).toHaveBeenCalledWith(
        mockCurrentUser.id,
        mockCreateSupplierDto,
      );
      expect(result).toEqual(mockSupplier);
    });
  });

  describe('findAll', () => {
    it('should return all suppliers', async () => {
      suppliersService.findAll.mockResolvedValue([mockSupplier]);

      const result = await controller.findAll(mockCurrentUser);

      expect(suppliersService.findAll).toHaveBeenCalledWith(mockCurrentUser.id);
      expect(result).toEqual([mockSupplier]);
    });
  });

  describe('findOne', () => {
    it('should return a supplier by id', async () => {
      suppliersService.findOne.mockResolvedValue(mockSupplier);

      const result = await controller.findOne(mockCurrentUser, mockSupplier.id);

      expect(suppliersService.findOne).toHaveBeenCalledWith(
        mockCurrentUser.id,
        mockSupplier.id,
      );
      expect(result).toEqual(mockSupplier);
    });
  });

  describe('update', () => {
    it('should update a supplier', async () => {
      const updateDto: UpdateSupplierDto = {
        name: 'Updated Name',
      };
      const updatedSupplier = { ...mockSupplier, ...updateDto };

      suppliersService.update.mockResolvedValue(updatedSupplier);

      const result = await controller.update(
        mockCurrentUser,
        mockSupplier.id,
        updateDto,
      );

      expect(suppliersService.update).toHaveBeenCalledWith(
        mockCurrentUser.id,
        mockSupplier.id,
        updateDto,
      );
      expect(result).toEqual(updatedSupplier);
    });
  });

  describe('remove', () => {
    it('should soft delete a supplier', async () => {
      suppliersService.remove.mockResolvedValue({
        message: 'Supplier deleted successfully',
      });

      const result = await controller.remove(mockCurrentUser, mockSupplier.id);

      expect(suppliersService.remove).toHaveBeenCalledWith(
        mockCurrentUser.id,
        mockSupplier.id,
      );
      expect(result).toEqual({ message: 'Supplier deleted successfully' });
    });
  });
});
