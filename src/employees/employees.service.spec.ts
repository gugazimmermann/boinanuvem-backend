import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { EmployeesService } from './employees.service';
import { PrismaService } from '../common/services/prisma.service';
import { CreateEmployeeDto, UpdateEmployeeDto } from './dto';

describe('EmployeesService', () => {
  let service: EmployeesService;
  let prismaService: jest.Mocked<PrismaService>;

  const mockUser = {
    id: 'user-1',
    companyId: 'company-1',
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
    street: 'Rua das Flores',
    number: '123',
    complement: 'Apto 101',
    neighborhood: 'Centro',
    city: 'São Paulo',
    state: 'SP',
    zipCode: '01310-100',
    deletedAt: null,
    createdAt: new Date('2025-01-15'),
    updatedAt: new Date('2025-01-15'),
    properties: [{ propertyId: 'property-1' }],
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
    const mockPrismaService = {
      user: {
        findUnique: jest.fn(),
      },
      employee: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      property: {
        findMany: jest.fn(),
      },
      employeeProperty: {
        deleteMany: jest.fn(),
        createMany: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmployeesService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<EmployeesService>(EmployeesService);
    prismaService = module.get(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create an employee successfully', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.property.findMany.mockResolvedValue([{ id: 'property-1' }]);
      prismaService.employee.findFirst.mockResolvedValue(null);
      prismaService.employee.create.mockResolvedValue(mockEmployee);

      const result = await service.create(mockUser.id, mockCreateEmployeeDto);

      expect(prismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: mockUser.id },
        select: { companyId: true },
      });
      expect(prismaService.property.findMany).toHaveBeenCalled();
      expect(prismaService.employee.findFirst).toHaveBeenCalled();
      expect(prismaService.employee.create).toHaveBeenCalled();
      expect(result.propertyIds).toEqual(['property-1']);
    });

    it('should throw ConflictException if employee code already exists', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.property.findMany.mockResolvedValue([{ id: 'property-1' }]);
      prismaService.employee.findFirst.mockResolvedValue(mockEmployee);

      await expect(
        service.create(mockUser.id, mockCreateEmployeeDto),
      ).rejects.toThrow(ConflictException);

      expect(prismaService.employee.create).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException if properties not found', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.property.findMany.mockResolvedValue([]);

      await expect(
        service.create(mockUser.id, mockCreateEmployeeDto),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if no properties provided', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);

      const dtoWithoutProperties = {
        ...mockCreateEmployeeDto,
        propertyIds: [],
      };

      await expect(
        service.create(mockUser.id, dtoWithoutProperties),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('findAll', () => {
    it('should return all employees for user company', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.employee.findMany.mockResolvedValue([mockEmployee]);

      const result = await service.findAll(mockUser.id);

      expect(prismaService.user.findUnique).toHaveBeenCalled();
      expect(prismaService.employee.findMany).toHaveBeenCalledWith({
        where: {
          companyId: mockUser.companyId,
          deletedAt: null,
        },
        include: {
          properties: {
            select: {
              propertyId: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });
      expect(result).toHaveLength(1);
      expect(result[0].propertyIds).toEqual(['property-1']);
    });
  });

  describe('findOne', () => {
    it('should return an employee by id', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.employee.findFirst.mockResolvedValue(mockEmployee);

      const result = await service.findOne(mockUser.id, mockEmployee.id);

      expect(result).toBeDefined();
      expect(result.id).toBe(mockEmployee.id);
    });

    it('should throw NotFoundException if employee not found', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.employee.findFirst.mockResolvedValue(null);

      await expect(
        service.findOne(mockUser.id, mockEmployee.id),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    const updateDto: UpdateEmployeeDto = {
      name: 'Updated Name',
      status: 'inactive',
    };

    it('should update an employee successfully', async () => {
      const updatedEmployee = { ...mockEmployee, ...updateDto };

      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.employee.findFirst.mockResolvedValue(mockEmployee);
      prismaService.employee.update.mockResolvedValue(updatedEmployee);

      const result = await service.update(
        mockUser.id,
        mockEmployee.id,
        updateDto,
      );

      expect(prismaService.employee.update).toHaveBeenCalled();
      expect(result.name).toBe(updateDto.name);
    });

    it('should sync property relations when propertyIds are updated', async () => {
      const updateWithProperties: UpdateEmployeeDto = {
        propertyIds: ['property-1', 'property-2'],
      };

      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.property.findMany.mockResolvedValue([
        { id: 'property-1' },
        { id: 'property-2' },
      ]);
      prismaService.employee.findFirst.mockResolvedValue(mockEmployee);
      prismaService.employee.update.mockResolvedValue(mockEmployee);
      prismaService.employeeProperty.deleteMany.mockResolvedValue({ count: 1 });
      prismaService.employeeProperty.createMany.mockResolvedValue({ count: 2 });
      prismaService.employee.findUnique.mockResolvedValue({
        ...mockEmployee,
        properties: [
          { propertyId: 'property-1' },
          { propertyId: 'property-2' },
        ],
      });

      const result = await service.update(
        mockUser.id,
        mockEmployee.id,
        updateWithProperties,
      );

      expect(prismaService.employeeProperty.deleteMany).toHaveBeenCalled();
      expect(prismaService.employeeProperty.createMany).toHaveBeenCalled();
      expect(result.propertyIds).toEqual(['property-1', 'property-2']);
    });
  });

  describe('remove', () => {
    it('should soft delete an employee', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.employee.findFirst.mockResolvedValue(mockEmployee);
      prismaService.employee.update.mockResolvedValue({
        ...mockEmployee,
        deletedAt: new Date(),
      });

      const result = await service.remove(mockUser.id, mockEmployee.id);

      expect(prismaService.employee.update).toHaveBeenCalledWith({
        where: { id: mockEmployee.id },
        data: {
          deletedAt: expect.any(Date),
        },
      });
      expect(result).toEqual({ message: 'Employee deleted successfully' });
    });
  });
});
