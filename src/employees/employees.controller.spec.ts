import { Test, TestingModule } from '@nestjs/testing';
import { ThrottlerModule } from '@nestjs/throttler';
import { EmployeesController } from './employees.controller';
import { EmployeesService } from './employees.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { CreateEmployeeDto, UpdateEmployeeDto } from './dto';
import type { CurrentUser } from '../auth/decorators/current-user.decorator';

describe('EmployeesController', () => {
  let controller: EmployeesController;
  let employeesService: jest.Mocked<EmployeesService>;

  const mockCurrentUser: CurrentUser = {
    id: 'user-1',
    email: 'test@example.com',
    companyId: 'company-1',
    mainUser: false,
  };

  const mockEmployee = {
    id: 'employee-1',
    code: '001',
    name: 'João Silva',
    cpf: '123.456.789-00',
    email: 'joao@example.com',
    phone: '(47) 99999-9999',
    status: 'active',
    companyId: 'company-1',
    propertyIds: ['property-1'],
    street: 'Rua das Flores',
    number: '123',
    complement: 'Apto 101',
    neighborhood: 'Centro',
    city: 'São Paulo',
    state: 'SP',
    zipCode: '01310-100',
    createdAt: new Date('2025-01-15'),
    updatedAt: new Date('2025-01-15'),
  };

  const mockCreateEmployeeDto: CreateEmployeeDto = {
    code: '001',
    name: 'João Silva',
    cpf: '123.456.789-00',
    email: 'joao@example.com',
    phone: '(47) 99999-9999',
    status: 'active',
    propertyIds: ['property-1'],
    street: 'Rua das Flores',
    number: '123',
    complement: 'Apto 101',
    neighborhood: 'Centro',
    city: 'São Paulo',
    state: 'SP',
    zipCode: '01310-100',
  };

  beforeEach(async () => {
    const mockEmployeesService = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      imports: [ThrottlerModule.forRoot()],
      controllers: [EmployeesController],
      providers: [
        {
          provide: EmployeesService,
          useValue: mockEmployeesService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(PermissionsGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<EmployeesController>(EmployeesController);
    employeesService = module.get(EmployeesService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create an employee', async () => {
      employeesService.create.mockResolvedValue(mockEmployee);

      const result = await controller.create(
        mockCurrentUser,
        mockCreateEmployeeDto,
      );

      expect(employeesService.create).toHaveBeenCalledWith(
        mockCurrentUser.id,
        mockCreateEmployeeDto,
      );
      expect(result).toEqual(mockEmployee);
    });
  });

  describe('findAll', () => {
    it('should return all employees', async () => {
      employeesService.findAll.mockResolvedValue([mockEmployee]);

      const result = await controller.findAll(mockCurrentUser);

      expect(employeesService.findAll).toHaveBeenCalledWith(mockCurrentUser.id);
      expect(result).toEqual([mockEmployee]);
    });
  });

  describe('findOne', () => {
    it('should return an employee by id', async () => {
      employeesService.findOne.mockResolvedValue(mockEmployee);

      const result = await controller.findOne(mockCurrentUser, mockEmployee.id);

      expect(employeesService.findOne).toHaveBeenCalledWith(
        mockCurrentUser.id,
        mockEmployee.id,
      );
      expect(result).toEqual(mockEmployee);
    });
  });

  describe('update', () => {
    it('should update an employee', async () => {
      const updateDto: UpdateEmployeeDto = {
        name: 'Updated Name',
      };
      const updatedEmployee = { ...mockEmployee, ...updateDto };

      employeesService.update.mockResolvedValue(updatedEmployee);

      const result = await controller.update(
        mockCurrentUser,
        mockEmployee.id,
        updateDto,
      );

      expect(employeesService.update).toHaveBeenCalledWith(
        mockCurrentUser.id,
        mockEmployee.id,
        updateDto,
      );
      expect(result).toEqual(updatedEmployee);
    });
  });

  describe('remove', () => {
    it('should soft delete an employee', async () => {
      employeesService.remove.mockResolvedValue({
        message: 'Employee deleted successfully',
      });

      const result = await controller.remove(mockCurrentUser, mockEmployee.id);

      expect(employeesService.remove).toHaveBeenCalledWith(
        mockCurrentUser.id,
        mockEmployee.id,
      );
      expect(result).toEqual({ message: 'Employee deleted successfully' });
    });
  });
});
