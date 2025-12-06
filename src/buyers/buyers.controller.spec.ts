import { Test, TestingModule } from '@nestjs/testing';
import { ThrottlerModule } from '@nestjs/throttler';
import { BuyersController } from './buyers.controller';
import { BuyersService } from './buyers.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { CreateBuyerDto, UpdateBuyerDto } from './dto';
import type { CurrentUser } from '../auth/decorators/current-user.decorator';

describe('BuyersController', () => {
  let controller: BuyersController;
  let buyersService: jest.Mocked<BuyersService>;

  const mockCurrentUser: CurrentUser = {
    id: 'user-1',
    email: 'test@example.com',
    companyId: 'company-1',
    mainUser: false,
  };

  const mockBuyer = {
    id: 'buyer-1',
    code: '001',
    name: 'Comprador de Gado LTDA',
    cpf: '123.456.789-00',
    cnpj: '12.345.678/0001-90',
    email: 'contato@comprador.com',
    phone: '(47) 99999-9999',
    status: 'active',
    companyId: 'company-1',
    propertyIds: ['property-1'],
    createdAt: new Date('2025-01-15'),
    updatedAt: new Date('2025-01-15'),
  };

  const mockCreateBuyerDto: CreateBuyerDto = {
    code: '001',
    name: 'Comprador de Gado LTDA',
    cpf: '123.456.789-00',
    cnpj: '12.345.678/0001-90',
    email: 'contato@comprador.com',
    phone: '(47) 99999-9999',
    status: 'active',
    propertyIds: ['property-1'],
  };

  beforeEach(async () => {
    const mockBuyersService = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      imports: [ThrottlerModule.forRoot()],
      controllers: [BuyersController],
      providers: [
        {
          provide: BuyersService,
          useValue: mockBuyersService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(PermissionsGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<BuyersController>(BuyersController);
    buyersService = module.get(BuyersService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create a buyer', async () => {
      buyersService.create.mockResolvedValue(mockBuyer);

      const result = await controller.create(
        mockCurrentUser,
        mockCreateBuyerDto,
      );

      expect(buyersService.create).toHaveBeenCalledWith(
        mockCurrentUser.id,
        mockCreateBuyerDto,
      );
      expect(result).toEqual(mockBuyer);
    });
  });

  describe('findAll', () => {
    it('should return all buyers', async () => {
      buyersService.findAll.mockResolvedValue([mockBuyer]);

      const result = await controller.findAll(mockCurrentUser);

      expect(buyersService.findAll).toHaveBeenCalledWith(mockCurrentUser.id);
      expect(result).toEqual([mockBuyer]);
    });
  });

  describe('findOne', () => {
    it('should return a buyer by id', async () => {
      buyersService.findOne.mockResolvedValue(mockBuyer);

      const result = await controller.findOne(mockCurrentUser, mockBuyer.id);

      expect(buyersService.findOne).toHaveBeenCalledWith(
        mockCurrentUser.id,
        mockBuyer.id,
      );
      expect(result).toEqual(mockBuyer);
    });
  });

  describe('update', () => {
    it('should update a buyer', async () => {
      const updateDto: UpdateBuyerDto = {
        name: 'Updated Name',
      };
      const updatedBuyer = { ...mockBuyer, ...updateDto };

      buyersService.update.mockResolvedValue(updatedBuyer);

      const result = await controller.update(
        mockCurrentUser,
        mockBuyer.id,
        updateDto,
      );

      expect(buyersService.update).toHaveBeenCalledWith(
        mockCurrentUser.id,
        mockBuyer.id,
        updateDto,
      );
      expect(result).toEqual(updatedBuyer);
    });
  });

  describe('remove', () => {
    it('should soft delete a buyer', async () => {
      buyersService.remove.mockResolvedValue({
        message: 'Buyer deleted successfully',
      });

      const result = await controller.remove(mockCurrentUser, mockBuyer.id);

      expect(buyersService.remove).toHaveBeenCalledWith(
        mockCurrentUser.id,
        mockBuyer.id,
      );
      expect(result).toEqual({ message: 'Buyer deleted successfully' });
    });
  });
});
