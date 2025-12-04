import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { CreateUserDto } from './create-user.dto';

describe('CreateUserDto', () => {
  describe('validation', () => {
    it('should pass validation with valid data', async () => {
      const dto = plainToInstance(CreateUserDto, {
        name: 'John Doe',
        cpf: '12345678900',
        email: 'test@example.com',
        phone: '(47) 99999-9999',
        password: 'password123',
        street: 'Rua Test',
        number: '123',
        neighborhood: 'Centro',
        city: 'Itajaí',
        state: 'SC',
        zipCode: '88303030',
      });

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should pass validation without optional fields', async () => {
      const dto = plainToInstance(CreateUserDto, {
        name: 'John Doe',
        email: 'test@example.com',
        phone: '(47) 99999-9999',
      });

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should format CPF correctly when provided', async () => {
      const dto = plainToInstance(CreateUserDto, {
        name: 'John Doe',
        email: 'test@example.com',
        phone: '(47) 99999-9999',
        cpf: '12345678900',
      });

      expect(dto.cpf).toBe('123.456.789-00');
    });

    it('should format ZIP code correctly when provided', async () => {
      const dto = plainToInstance(CreateUserDto, {
        name: 'John Doe',
        email: 'test@example.com',
        phone: '(47) 99999-9999',
        zipCode: '88303030',
      });

      expect(dto.zipCode).toBe('88303-030');
    });

    it('should fail validation when name is missing', async () => {
      const dto = plainToInstance(CreateUserDto, {
        email: 'test@example.com',
        phone: '(47) 99999-9999',
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      const nameError = errors.find((e) => e.property === 'name');
      expect(nameError).toBeDefined();
    });

    it('should fail validation when name is too short', async () => {
      const dto = plainToInstance(CreateUserDto, {
        name: 'A',
        email: 'test@example.com',
        phone: '(47) 99999-9999',
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      const nameError = errors.find((e) => e.property === 'name');
      expect(nameError).toBeDefined();
    });

    it('should fail validation when email is missing', async () => {
      const dto = plainToInstance(CreateUserDto, {
        name: 'John Doe',
        phone: '(47) 99999-9999',
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      const emailError = errors.find((e) => e.property === 'email');
      expect(emailError).toBeDefined();
    });

    it('should fail validation when email is invalid', async () => {
      const dto = plainToInstance(CreateUserDto, {
        name: 'John Doe',
        email: 'invalid-email',
        phone: '(47) 99999-9999',
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      const emailError = errors.find((e) => e.property === 'email');
      expect(emailError).toBeDefined();
    });

    it('should fail validation when phone is missing', async () => {
      const dto = plainToInstance(CreateUserDto, {
        name: 'John Doe',
        email: 'test@example.com',
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      const phoneError = errors.find((e) => e.property === 'phone');
      expect(phoneError).toBeDefined();
    });

    it('should fail validation when CPF format is invalid', async () => {
      const dto = plainToInstance(CreateUserDto, {
        name: 'John Doe',
        email: 'test@example.com',
        phone: '(47) 99999-9999',
        cpf: 'invalid-cpf',
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      const cpfError = errors.find((e) => e.property === 'cpf');
      expect(cpfError).toBeDefined();
    });

    it('should fail validation when password is too short', async () => {
      const dto = plainToInstance(CreateUserDto, {
        name: 'John Doe',
        email: 'test@example.com',
        phone: '(47) 99999-9999',
        password: '12345',
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      const passwordError = errors.find((e) => e.property === 'password');
      expect(passwordError).toBeDefined();
    });

    it('should fail validation when state format is invalid', async () => {
      const dto = plainToInstance(CreateUserDto, {
        name: 'John Doe',
        email: 'test@example.com',
        phone: '(47) 99999-9999',
        state: 'invalid',
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      const stateError = errors.find((e) => e.property === 'state');
      expect(stateError).toBeDefined();
    });

    it('should fail validation when ZIP code format is invalid', async () => {
      const dto = plainToInstance(CreateUserDto, {
        name: 'John Doe',
        email: 'test@example.com',
        phone: '(47) 99999-9999',
        zipCode: 'invalid',
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      const zipCodeError = errors.find((e) => e.property === 'zipCode');
      expect(zipCodeError).toBeDefined();
    });

    it('should not validate CPF when it is null', async () => {
      const dto = plainToInstance(CreateUserDto, {
        name: 'John Doe',
        email: 'test@example.com',
        phone: '(47) 99999-9999',
        cpf: null,
      });

      const errors = await validate(dto);
      const cpfError = errors.find((e) => e.property === 'cpf');
      expect(cpfError).toBeUndefined();
    });

    it('should not validate CPF when it is undefined', async () => {
      const dto = plainToInstance(CreateUserDto, {
        name: 'John Doe',
        email: 'test@example.com',
        phone: '(47) 99999-9999',
        cpf: undefined,
      });

      const errors = await validate(dto);
      const cpfError = errors.find((e) => e.property === 'cpf');
      expect(cpfError).toBeUndefined();
    });

    it('should not validate CPF when it is empty string', async () => {
      const dto = plainToInstance(CreateUserDto, {
        name: 'John Doe',
        email: 'test@example.com',
        phone: '(47) 99999-9999',
        cpf: '',
      });

      const errors = await validate(dto);
      const cpfError = errors.find((e) => e.property === 'cpf');
      expect(cpfError).toBeUndefined();
    });

    it('should not validate CPF when it is whitespace only', async () => {
      const dto = plainToInstance(CreateUserDto, {
        name: 'John Doe',
        email: 'test@example.com',
        phone: '(47) 99999-9999',
        cpf: '   ',
      });

      const errors = await validate(dto);
      const cpfError = errors.find((e) => e.property === 'cpf');
      expect(cpfError).toBeUndefined();
    });

    it('should allow password to be optional', async () => {
      const dto = plainToInstance(CreateUserDto, {
        name: 'John Doe',
        email: 'test@example.com',
        phone: '(47) 99999-9999',
      });

      const errors = await validate(dto);
      const passwordError = errors.find((e) => e.property === 'password');
      expect(passwordError).toBeUndefined();
    });

    it('should handle null ZIP code', async () => {
      const dto = plainToInstance(CreateUserDto, {
        name: 'John Doe',
        email: 'test@example.com',
        phone: '(47) 99999-9999',
        zipCode: null,
      });

      expect(dto.zipCode).toBeNull();
    });

    it('should handle undefined ZIP code', async () => {
      const dto = plainToInstance(CreateUserDto, {
        name: 'John Doe',
        email: 'test@example.com',
        phone: '(47) 99999-9999',
        zipCode: undefined,
      });

      expect(dto.zipCode).toBeUndefined();
    });
  });
});
