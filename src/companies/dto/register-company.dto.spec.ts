import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { RegisterCompanyDto } from './register-company.dto';

describe('RegisterCompanyDto', () => {
  describe('validation', () => {
    it('should pass validation with valid data', async () => {
      const dto = plainToInstance(RegisterCompanyDto, {
        cnpj: '12345678000190',
        companyName: 'Test Company',
        email: 'test@example.com',
        phone: '(47) 99999-9999',
        street: 'Rua Test',
        number: '123',
        neighborhood: 'Centro',
        city: 'Itajaí',
        state: 'SC',
        zipCode: '88303030',
        userName: 'John Doe',
        userCpf: '12345678900',
        userEmail: 'user@example.com',
        userPhone: '(47) 99999-8888',
        userPassword: 'password123',
      });

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should format CNPJ correctly', async () => {
      const dto = plainToInstance(RegisterCompanyDto, {
        cnpj: '12345678000190',
        companyName: 'Test Company',
        email: 'test@example.com',
        phone: '(47) 99999-9999',
        street: 'Rua Test',
        number: '123',
        neighborhood: 'Centro',
        city: 'Itajaí',
        state: 'SC',
        zipCode: '88303030',
        userName: 'John Doe',
        userCpf: '12345678900',
        userEmail: 'user@example.com',
        userPhone: '(47) 99999-8888',
        userPassword: 'password123',
      });

      expect(dto.cnpj).toBe('12.345.678/0001-90');
    });

    it('should format CPF correctly', async () => {
      const dto = plainToInstance(RegisterCompanyDto, {
        cnpj: '12345678000190',
        companyName: 'Test Company',
        email: 'test@example.com',
        phone: '(47) 99999-9999',
        street: 'Rua Test',
        number: '123',
        neighborhood: 'Centro',
        city: 'Itajaí',
        state: 'SC',
        zipCode: '88303030',
        userName: 'John Doe',
        userCpf: '12345678900',
        userEmail: 'user@example.com',
        userPhone: '(47) 99999-8888',
        userPassword: 'password123',
      });

      expect(dto.userCpf).toBe('123.456.789-00');
    });

    it('should format ZIP code correctly', async () => {
      const dto = plainToInstance(RegisterCompanyDto, {
        cnpj: '12345678000190',
        companyName: 'Test Company',
        email: 'test@example.com',
        phone: '(47) 99999-9999',
        street: 'Rua Test',
        number: '123',
        neighborhood: 'Centro',
        city: 'Itajaí',
        state: 'SC',
        zipCode: '88303030',
        userName: 'John Doe',
        userCpf: '12345678900',
        userEmail: 'user@example.com',
        userPhone: '(47) 99999-8888',
        userPassword: 'password123',
      });

      expect(dto.zipCode).toBe('88303-030');
    });

    it('should fail validation when CNPJ is invalid format', async () => {
      const dto = plainToInstance(RegisterCompanyDto, {
        cnpj: 'invalid-cnpj',
        companyName: 'Test Company',
        email: 'test@example.com',
        phone: '(47) 99999-9999',
        street: 'Rua Test',
        number: '123',
        neighborhood: 'Centro',
        city: 'Itajaí',
        state: 'SC',
        zipCode: '88303030',
        userName: 'John Doe',
        userCpf: '12345678900',
        userEmail: 'user@example.com',
        userPhone: '(47) 99999-8888',
        userPassword: 'password123',
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      const cnpjError = errors.find((e) => e.property === 'cnpj');
      expect(cnpjError).toBeDefined();
    });

    it('should fail validation when companyName is too short', async () => {
      const dto = plainToInstance(RegisterCompanyDto, {
        cnpj: '12345678000190',
        companyName: 'A',
        email: 'test@example.com',
        phone: '(47) 99999-9999',
        street: 'Rua Test',
        number: '123',
        neighborhood: 'Centro',
        city: 'Itajaí',
        state: 'SC',
        zipCode: '88303030',
        userName: 'John Doe',
        userCpf: '12345678900',
        userEmail: 'user@example.com',
        userPhone: '(47) 99999-8888',
        userPassword: 'password123',
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      const nameError = errors.find((e) => e.property === 'companyName');
      expect(nameError).toBeDefined();
    });

    it('should fail validation when email is invalid', async () => {
      const dto = plainToInstance(RegisterCompanyDto, {
        cnpj: '12345678000190',
        companyName: 'Test Company',
        email: 'invalid-email',
        phone: '(47) 99999-9999',
        street: 'Rua Test',
        number: '123',
        neighborhood: 'Centro',
        city: 'Itajaí',
        state: 'SC',
        zipCode: '88303030',
        userName: 'John Doe',
        userCpf: '12345678900',
        userEmail: 'user@example.com',
        userPhone: '(47) 99999-8888',
        userPassword: 'password123',
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      const emailError = errors.find((e) => e.property === 'email');
      expect(emailError).toBeDefined();
    });

    it('should fail validation when state is invalid format', async () => {
      const dto = plainToInstance(RegisterCompanyDto, {
        cnpj: '12345678000190',
        companyName: 'Test Company',
        email: 'test@example.com',
        phone: '(47) 99999-9999',
        street: 'Rua Test',
        number: '123',
        neighborhood: 'Centro',
        city: 'Itajaí',
        state: 'invalid',
        zipCode: '88303030',
        userName: 'John Doe',
        userCpf: '12345678900',
        userEmail: 'user@example.com',
        userPhone: '(47) 99999-8888',
        userPassword: 'password123',
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      const stateError = errors.find((e) => e.property === 'state');
      expect(stateError).toBeDefined();
    });

    it('should fail validation when ZIP code is invalid format', async () => {
      const dto = plainToInstance(RegisterCompanyDto, {
        cnpj: '12345678000190',
        companyName: 'Test Company',
        email: 'test@example.com',
        phone: '(47) 99999-9999',
        street: 'Rua Test',
        number: '123',
        neighborhood: 'Centro',
        city: 'Itajaí',
        state: 'SC',
        zipCode: 'invalid',
        userName: 'John Doe',
        userCpf: '12345678900',
        userEmail: 'user@example.com',
        userPhone: '(47) 99999-8888',
        userPassword: 'password123',
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      const zipCodeError = errors.find((e) => e.property === 'zipCode');
      expect(zipCodeError).toBeDefined();
    });

    it('should fail validation when userCpf is invalid format', async () => {
      const dto = plainToInstance(RegisterCompanyDto, {
        cnpj: '12345678000190',
        companyName: 'Test Company',
        email: 'test@example.com',
        phone: '(47) 99999-9999',
        street: 'Rua Test',
        number: '123',
        neighborhood: 'Centro',
        city: 'Itajaí',
        state: 'SC',
        zipCode: '88303030',
        userName: 'John Doe',
        userCpf: 'invalid-cpf',
        userEmail: 'user@example.com',
        userPhone: '(47) 99999-8888',
        userPassword: 'password123',
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      const cpfError = errors.find((e) => e.property === 'userCpf');
      expect(cpfError).toBeDefined();
    });

    it('should fail validation when userName is too short', async () => {
      const dto = plainToInstance(RegisterCompanyDto, {
        cnpj: '12345678000190',
        companyName: 'Test Company',
        email: 'test@example.com',
        phone: '(47) 99999-9999',
        street: 'Rua Test',
        number: '123',
        neighborhood: 'Centro',
        city: 'Itajaí',
        state: 'SC',
        zipCode: '88303030',
        userName: 'A',
        userCpf: '12345678900',
        userEmail: 'user@example.com',
        userPhone: '(47) 99999-8888',
        userPassword: 'password123',
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      const userNameError = errors.find((e) => e.property === 'userName');
      expect(userNameError).toBeDefined();
    });

    it('should fail validation when userEmail is invalid', async () => {
      const dto = plainToInstance(RegisterCompanyDto, {
        cnpj: '12345678000190',
        companyName: 'Test Company',
        email: 'test@example.com',
        phone: '(47) 99999-9999',
        street: 'Rua Test',
        number: '123',
        neighborhood: 'Centro',
        city: 'Itajaí',
        state: 'SC',
        zipCode: '88303030',
        userName: 'John Doe',
        userCpf: '12345678900',
        userEmail: 'invalid-email',
        userPhone: '(47) 99999-8888',
        userPassword: 'password123',
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      const userEmailError = errors.find((e) => e.property === 'userEmail');
      expect(userEmailError).toBeDefined();
    });

    it('should fail validation when userPassword is too short', async () => {
      const dto = plainToInstance(RegisterCompanyDto, {
        cnpj: '12345678000190',
        companyName: 'Test Company',
        email: 'test@example.com',
        phone: '(47) 99999-9999',
        street: 'Rua Test',
        number: '123',
        neighborhood: 'Centro',
        city: 'Itajaí',
        state: 'SC',
        zipCode: '88303030',
        userName: 'John Doe',
        userCpf: '12345678900',
        userEmail: 'user@example.com',
        userPhone: '(47) 99999-8888',
        userPassword: '12345',
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      const passwordError = errors.find((e) => e.property === 'userPassword');
      expect(passwordError).toBeDefined();
    });

    it('should handle optional fields correctly', async () => {
      const dto = plainToInstance(RegisterCompanyDto, {
        cnpj: '12345678000190',
        companyName: 'Test Company',
        email: 'test@example.com',
        phone: '(47) 99999-9999',
        street: 'Rua Test',
        number: '123',
        neighborhood: 'Centro',
        city: 'Itajaí',
        state: 'SC',
        zipCode: '88303030',
        userName: 'John Doe',
        userCpf: '12345678900',
        userEmail: 'user@example.com',
        userPhone: '(47) 99999-8888',
        userPassword: 'password123',
        complement: 'Sala 1',
        latitude: -26.9056,
        longitude: -48.6556,
      });

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
      expect(dto.complement).toBe('Sala 1');
      expect(dto.latitude).toBe(-26.9056);
      expect(dto.longitude).toBe(-48.6556);
    });

    it('should transform latitude from string to number', async () => {
      const dto = plainToInstance(RegisterCompanyDto, {
        cnpj: '12345678000190',
        companyName: 'Test Company',
        email: 'test@example.com',
        phone: '(47) 99999-9999',
        street: 'Rua Test',
        number: '123',
        neighborhood: 'Centro',
        city: 'Itajaí',
        state: 'SC',
        zipCode: '88303030',
        userName: 'John Doe',
        userCpf: '12345678900',
        userEmail: 'user@example.com',
        userPhone: '(47) 99999-8888',
        userPassword: 'password123',
        latitude: '-26.9056',
      });

      expect(dto.latitude).toBe(-26.9056);
    });

    it('should transform longitude from string to number', async () => {
      const dto = plainToInstance(RegisterCompanyDto, {
        cnpj: '12345678000190',
        companyName: 'Test Company',
        email: 'test@example.com',
        phone: '(47) 99999-9999',
        street: 'Rua Test',
        number: '123',
        neighborhood: 'Centro',
        city: 'Itajaí',
        state: 'SC',
        zipCode: '88303030',
        userName: 'John Doe',
        userCpf: '12345678900',
        userEmail: 'user@example.com',
        userPhone: '(47) 99999-8888',
        userPassword: 'password123',
        longitude: '-48.6556',
      });

      expect(dto.longitude).toBe(-48.6556);
    });

    it('should handle null/undefined latitude', async () => {
      const dto = plainToInstance(RegisterCompanyDto, {
        cnpj: '12345678000190',
        companyName: 'Test Company',
        email: 'test@example.com',
        phone: '(47) 99999-9999',
        street: 'Rua Test',
        number: '123',
        neighborhood: 'Centro',
        city: 'Itajaí',
        state: 'SC',
        zipCode: '88303030',
        userName: 'John Doe',
        userCpf: '12345678900',
        userEmail: 'user@example.com',
        userPhone: '(47) 99999-8888',
        userPassword: 'password123',
        latitude: null,
      });

      expect(dto.latitude).toBeUndefined();
    });

    it('should handle empty string latitude', async () => {
      const dto = plainToInstance(RegisterCompanyDto, {
        cnpj: '12345678000190',
        companyName: 'Test Company',
        email: 'test@example.com',
        phone: '(47) 99999-9999',
        street: 'Rua Test',
        number: '123',
        neighborhood: 'Centro',
        city: 'Itajaí',
        state: 'SC',
        zipCode: '88303030',
        userName: 'John Doe',
        userCpf: '12345678900',
        userEmail: 'user@example.com',
        userPhone: '(47) 99999-8888',
        userPassword: 'password123',
        latitude: '',
      });

      expect(dto.latitude).toBeUndefined();
    });

    it('should handle invalid latitude string', async () => {
      const dto = plainToInstance(RegisterCompanyDto, {
        cnpj: '12345678000190',
        companyName: 'Test Company',
        email: 'test@example.com',
        phone: '(47) 99999-9999',
        street: 'Rua Test',
        number: '123',
        neighborhood: 'Centro',
        city: 'Itajaí',
        state: 'SC',
        zipCode: '88303030',
        userName: 'John Doe',
        userCpf: '12345678900',
        userEmail: 'user@example.com',
        userPhone: '(47) 99999-8888',
        userPassword: 'password123',
        latitude: 'invalid',
      });

      expect(dto.latitude).toBeUndefined();
    });

    it('should format userZipCode when provided', async () => {
      const dto = plainToInstance(RegisterCompanyDto, {
        cnpj: '12345678000190',
        companyName: 'Test Company',
        email: 'test@example.com',
        phone: '(47) 99999-9999',
        street: 'Rua Test',
        number: '123',
        neighborhood: 'Centro',
        city: 'Itajaí',
        state: 'SC',
        zipCode: '88303030',
        userName: 'John Doe',
        userCpf: '12345678900',
        userEmail: 'user@example.com',
        userPhone: '(47) 99999-8888',
        userPassword: 'password123',
        userZipCode: '88303040',
      });

      expect(dto.userZipCode).toBe('88303-040');
    });

    it('should validate userState format when provided', async () => {
      const dto = plainToInstance(RegisterCompanyDto, {
        cnpj: '12345678000190',
        companyName: 'Test Company',
        email: 'test@example.com',
        phone: '(47) 99999-9999',
        street: 'Rua Test',
        number: '123',
        neighborhood: 'Centro',
        city: 'Itajaí',
        state: 'SC',
        zipCode: '88303030',
        userName: 'John Doe',
        userCpf: '12345678900',
        userEmail: 'user@example.com',
        userPhone: '(47) 99999-8888',
        userPassword: 'password123',
        userState: 'invalid',
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      const userStateError = errors.find((e) => e.property === 'userState');
      expect(userStateError).toBeDefined();
    });
  });
});
