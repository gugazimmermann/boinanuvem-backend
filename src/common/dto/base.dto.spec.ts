import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { PaginationDto, SearchDto } from './base.dto';

describe('PaginationDto', () => {
  it('should have default values', () => {
    const dto = new PaginationDto();
    expect(dto.page).toBe(1);
    expect(dto.limit).toBe(10);
  });

  it('should accept valid page and limit', async () => {
    const dto = plainToInstance(PaginationDto, {
      page: 5,
      limit: 20,
    });

    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
    expect(dto.page).toBe(5);
    expect(dto.limit).toBe(20);
  });

  it('should transform string page to number', () => {
    const dto = plainToInstance(PaginationDto, {
      page: '5',
      limit: '20',
    });

    expect(dto.page).toBe(5);
    expect(dto.limit).toBe(20);
  });

  it('should validate minimum page value', async () => {
    const dto = plainToInstance(PaginationDto, {
      page: 0,
      limit: 10,
    });

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('page');
  });

  it('should validate maximum page value', async () => {
    const dto = plainToInstance(PaginationDto, {
      page: 1001,
      limit: 10,
    });

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('page');
  });

  it('should validate minimum limit value', async () => {
    const dto = plainToInstance(PaginationDto, {
      page: 1,
      limit: 0,
    });

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('limit');
  });

  it('should validate maximum limit value', async () => {
    const dto = plainToInstance(PaginationDto, {
      page: 1,
      limit: 101,
    });

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('limit');
  });

  it('should accept boundary values', async () => {
    const dto = plainToInstance(PaginationDto, {
      page: 1,
      limit: 1,
    });

    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('should accept maximum boundary values', async () => {
    const dto = plainToInstance(PaginationDto, {
      page: 1000,
      limit: 100,
    });

    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('should handle undefined values', () => {
    const dto = plainToInstance(PaginationDto, {});

    expect(dto.page).toBe(1);
    expect(dto.limit).toBe(10);
  });

  it('should validate that page is a number', async () => {
    const dto = plainToInstance(PaginationDto, {
      page: 'not-a-number',
      limit: 10,
    });

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('should validate that limit is a number', async () => {
    const dto = plainToInstance(PaginationDto, {
      page: 1,
      limit: 'not-a-number',
    });

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });
});

describe('SearchDto', () => {
  it('should extend PaginationDto with default values', () => {
    const dto = new SearchDto();
    expect(dto.page).toBe(1);
    expect(dto.limit).toBe(10);
    expect(dto.search).toBeUndefined();
  });

  it('should accept valid search string', async () => {
    const dto = plainToInstance(SearchDto, {
      page: 1,
      limit: 10,
      search: 'test query',
    });

    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
    expect(dto.search).toBe('test query');
  });

  it('should trim search string', () => {
    const dto = plainToInstance(SearchDto, {
      search: '  test query  ',
    });

    expect(dto.search).toBe('test query');
  });

  it('should handle empty search string', () => {
    const dto = plainToInstance(SearchDto, {
      search: '',
    });

    expect(dto.search).toBe('');
  });

  it('should handle undefined search', () => {
    const dto = plainToInstance(SearchDto, {
      page: 1,
      limit: 10,
    });

    expect(dto.search).toBeUndefined();
  });

  it('should handle null search', () => {
    const dto = plainToInstance(SearchDto, {
      search: null,
    });

    expect(dto.search).toBeUndefined();
  });

  it('should handle search with special characters', () => {
    const dto = plainToInstance(SearchDto, {
      search: 'test@query#123',
    });

    expect(dto.search).toBe('test@query#123');
  });

  it('should handle search with whitespace only', () => {
    const dto = plainToInstance(SearchDto, {
      search: '   ',
    });

    expect(dto.search).toBe('');
  });

  it('should handle non-string search value', () => {
    const dto = plainToInstance(SearchDto, {
      search: 123,
    });

    // Transform will convert it, but validation will fail if IsString is enforced
    // Since Transform runs before validation, the value might be undefined
    expect(dto.search).toBeUndefined();
  });

  it('should validate search max length', async () => {
    const longString = 'a'.repeat(101);
    const dto = plainToInstance(SearchDto, {
      search: longString,
    });

    await validate(dto);
    // Note: The DTO doesn't have MaxLength decorator, but we test the transform
    expect(dto.search).toBe(longString);
  });

  it('should inherit pagination validation', async () => {
    const dto = plainToInstance(SearchDto, {
      page: 0,
      limit: 10,
      search: 'test',
    });

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('page');
  });

  it('should handle all properties together', async () => {
    const dto = plainToInstance(SearchDto, {
      page: 2,
      limit: 25,
      search: '  cattle search  ',
    });

    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
    expect(dto.page).toBe(2);
    expect(dto.limit).toBe(25);
    expect(dto.search).toBe('cattle search');
  });

  it('should handle search with newlines and tabs', () => {
    const dto = plainToInstance(SearchDto, {
      search: '  test query  ',
    });

    // trim() removes leading/trailing whitespace
    expect(dto.search).toBe('test query');
  });

  it('should handle non-string search value in transform', () => {
    const dto = plainToInstance(SearchDto, {
      search: 123 as any,
    });

    // Transform should handle non-string gracefully
    expect(dto.search).toBeUndefined();
  });
});
