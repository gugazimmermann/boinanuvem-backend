import { formatCNPJ, formatCPF, formatZipCode } from './format-utils';

describe('format-utils', () => {
  describe('formatCNPJ', () => {
    it('should format unformatted CNPJ correctly', () => {
      expect(formatCNPJ('12345678000190')).toBe('12.345.678/0001-90');
    });

    it('should return already formatted CNPJ as-is', () => {
      expect(formatCNPJ('12.345.678/0001-90')).toBe('12.345.678/0001-90');
    });

    it('should handle CNPJ with special characters', () => {
      expect(formatCNPJ('12.345.678/0001-90')).toBe('12.345.678/0001-90');
      expect(formatCNPJ('12-345-678-0001-90')).toBe('12.345.678/0001-90');
    });

    it('should return value as-is if length is not 14 digits', () => {
      expect(formatCNPJ('1234567800019')).toBe('1234567800019'); // 13 digits
      expect(formatCNPJ('123456780001901')).toBe('123456780001901'); // 15 digits
      expect(formatCNPJ('12345')).toBe('12345'); // too short
    });

    it('should return undefined if value is undefined', () => {
      expect(formatCNPJ(undefined)).toBeUndefined();
    });

    it('should return null if value is null', () => {
      expect(formatCNPJ(null)).toBeNull();
    });

    it('should return value as-is if value is not a string', () => {
      expect(formatCNPJ(12345678000190 as unknown as string)).toBe(
        12345678000190,
      );
      expect(formatCNPJ({} as unknown as string)).toEqual({});
    });

    it('should handle empty string', () => {
      expect(formatCNPJ('')).toBe('');
    });

    it('should handle string with only non-digit characters', () => {
      expect(formatCNPJ('abc')).toBe('abc');
    });
  });

  describe('formatCPF', () => {
    it('should format unformatted CPF correctly', () => {
      expect(formatCPF('12345678900')).toBe('123.456.789-00');
    });

    it('should return already formatted CPF as-is', () => {
      expect(formatCPF('123.456.789-00')).toBe('123.456.789-00');
    });

    it('should handle CPF with special characters', () => {
      expect(formatCPF('123.456.789-00')).toBe('123.456.789-00');
      expect(formatCPF('123-456-789-00')).toBe('123.456.789-00');
    });

    it('should return value as-is if length is not 11 digits', () => {
      expect(formatCPF('1234567890')).toBe('1234567890'); // 10 digits
      expect(formatCPF('123456789001')).toBe('123456789001'); // 12 digits
      expect(formatCPF('12345')).toBe('12345'); // too short
    });

    it('should return undefined if value is undefined', () => {
      expect(formatCPF(undefined)).toBeUndefined();
    });

    it('should return null if value is null', () => {
      expect(formatCPF(null)).toBeNull();
    });

    it('should return value as-is if value is not a string', () => {
      expect(formatCPF(12345678900 as unknown as string)).toBe(12345678900);
      expect(formatCPF({} as unknown as string)).toEqual({});
    });

    it('should handle empty string', () => {
      expect(formatCPF('')).toBe('');
    });

    it('should handle string with only non-digit characters', () => {
      expect(formatCPF('abc')).toBe('abc');
    });
  });

  describe('formatZipCode', () => {
    it('should format unformatted ZIP code correctly', () => {
      expect(formatZipCode('88303030')).toBe('88303-030');
    });

    it('should return already formatted ZIP code as-is', () => {
      expect(formatZipCode('88303-030')).toBe('88303-030');
    });

    it('should handle ZIP code with special characters', () => {
      expect(formatZipCode('88303-030')).toBe('88303-030');
      expect(formatZipCode('88303.030')).toBe('88303-030');
    });

    it('should return value as-is if length is not 8 digits', () => {
      expect(formatZipCode('8830303')).toBe('8830303'); // 7 digits
      expect(formatZipCode('883030301')).toBe('883030301'); // 9 digits
      expect(formatZipCode('88303')).toBe('88303'); // too short
    });

    it('should return undefined if value is undefined', () => {
      expect(formatZipCode(undefined)).toBeUndefined();
    });

    it('should return null if value is null', () => {
      expect(formatZipCode(null)).toBeNull();
    });

    it('should return value as-is if value is not a string', () => {
      expect(formatZipCode(88303030 as unknown as string)).toBe(88303030);
      expect(formatZipCode({} as unknown as string)).toEqual({});
    });

    it('should handle empty string', () => {
      expect(formatZipCode('')).toBe('');
    });

    it('should handle string with only non-digit characters', () => {
      expect(formatZipCode('abc')).toBe('abc');
    });
  });
});
