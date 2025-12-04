import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { UpdateCompanyDto } from './update-company.dto';

describe('UpdateCompanyDto', () => {
  describe('validation', () => {
    it('should pass validation with valid data', async () => {
      const dto = plainToInstance(UpdateCompanyDto, {
        companyName: 'Updated Company',
        email: 'updated@example.com',
        phone: '(47) 99999-9999',
        street: 'Rua Updated',
        number: '456',
        neighborhood: 'Centro',
        city: 'Itajaí',
        state: 'SC',
        zipCode: '88303030',
        latitude: -26.9056,
        longitude: -48.6556,
      });

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should pass validation with empty object (all optional)', async () => {
      const dto = plainToInstance(UpdateCompanyDto, {});

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should format ZIP code correctly when provided', async () => {
      const dto = plainToInstance(UpdateCompanyDto, {
        zipCode: '88303030',
      });

      expect(dto.zipCode).toBe('88303-030');
    });

    it('should fail validation when companyName is too short', async () => {
      const dto = plainToInstance(UpdateCompanyDto, {
        companyName: 'A',
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      const nameError = errors.find((e) => e.property === 'companyName');
      expect(nameError).toBeDefined();
    });

    it('should fail validation when email is invalid', async () => {
      const dto = plainToInstance(UpdateCompanyDto, {
        email: 'invalid-email',
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      const emailError = errors.find((e) => e.property === 'email');
      expect(emailError).toBeDefined();
    });

    it('should fail validation when state format is invalid', async () => {
      const dto = plainToInstance(UpdateCompanyDto, {
        state: 'invalid',
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      const stateError = errors.find((e) => e.property === 'state');
      expect(stateError).toBeDefined();
    });

    it('should fail validation when ZIP code format is invalid', async () => {
      const dto = plainToInstance(UpdateCompanyDto, {
        zipCode: 'invalid',
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      const zipCodeError = errors.find((e) => e.property === 'zipCode');
      expect(zipCodeError).toBeDefined();
    });

    it('should handle partial updates correctly', async () => {
      const dto = plainToInstance(UpdateCompanyDto, {
        companyName: 'Updated Name',
        phone: '(47) 88888-8888',
      });

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
      expect(dto.companyName).toBe('Updated Name');
      expect(dto.phone).toBe('(47) 88888-8888');
    });

    it('should handle null ZIP code', async () => {
      const dto = plainToInstance(UpdateCompanyDto, {
        zipCode: null,
      });

      expect(dto.zipCode).toBeNull();
    });

    it('should handle undefined ZIP code', async () => {
      const dto = plainToInstance(UpdateCompanyDto, {
        zipCode: undefined,
      });

      expect(dto.zipCode).toBeUndefined();
    });

    it('should handle latitude and longitude as numbers', async () => {
      const dto = plainToInstance(UpdateCompanyDto, {
        latitude: -26.9056,
        longitude: -48.6556,
      });

      expect(dto.latitude).toBe(-26.9056);
      expect(dto.longitude).toBe(-48.6556);
    });
  });
});
