import { Test, TestingModule } from '@nestjs/testing';
import { GeocodingService } from './geocoding.service';

// Mock fetch globally
global.fetch = jest.fn();

describe('GeocodingService', () => {
  let service: GeocodingService;
  const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [GeocodingService],
    }).compile();

    service = module.get<GeocodingService>(GeocodingService);
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('geocodeNominatim', () => {
    const mockParams = {
      street: 'Rua das Flores',
      number: '123',
      neighborhood: 'Centro',
      city: 'São Paulo',
      state: 'SP',
      zipCode: '01310-100',
    };

    it('should return coordinates when geocoding succeeds', async () => {
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue([
          {
            lat: '-23.5505',
            lon: '-46.6333',
          },
        ]),
      };

      mockFetch.mockResolvedValue(mockResponse as unknown as Response);

      const result = await service.geocodeNominatim(mockParams);

      expect(result).toEqual({
        latitude: -23.5505,
        longitude: -46.6333,
      });
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('nominatim.openstreetmap.org'),
        expect.objectContaining({
          headers: expect.objectContaining({
            'user-agent': expect.any(String),
          }),
        }),
      );
    });

    it('should return null when no results found', async () => {
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue([]),
      };

      mockFetch.mockResolvedValue(mockResponse as unknown as Response);

      const result = await service.geocodeNominatim(mockParams);

      expect(result).toBeNull();
    });

    it('should return null when result has no lat', async () => {
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue([
          {
            lon: '-46.6333',
          },
        ]),
      };

      mockFetch.mockResolvedValue(mockResponse as unknown as Response);

      const result = await service.geocodeNominatim(mockParams);

      expect(result).toBeNull();
    });

    it('should return null when result has no lon', async () => {
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue([
          {
            lat: '-23.5505',
          },
        ]),
      };

      mockFetch.mockResolvedValue(mockResponse as unknown as Response);

      const result = await service.geocodeNominatim(mockParams);

      expect(result).toBeNull();
    });

    it('should return null when coordinates are invalid (NaN)', async () => {
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue([
          {
            lat: 'invalid',
            lon: '-46.6333',
          },
        ]),
      };

      mockFetch.mockResolvedValue(mockResponse as unknown as Response);

      const result = await service.geocodeNominatim(mockParams);

      expect(result).toBeNull();
    });

    it('should return null when coordinates are Infinity', async () => {
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue([
          {
            lat: 'Infinity',
            lon: '-46.6333',
          },
        ]),
      };

      mockFetch.mockResolvedValue(mockResponse as unknown as Response);

      const result = await service.geocodeNominatim(mockParams);

      expect(result).toBeNull();
    });

    it('should include country parameter when provided', async () => {
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue([
          {
            lat: '-23.5505',
            lon: '-46.6333',
          },
        ]),
      };

      mockFetch.mockResolvedValue(mockResponse as unknown as Response);

      await service.geocodeNominatim({
        ...mockParams,
        country: 'Argentina',
      });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('Argentina'),
        expect.any(Object),
      );
    });

    it('should default to Brazil when country not provided', async () => {
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue([
          {
            lat: '-23.5505',
            lon: '-46.6333',
          },
        ]),
      };

      mockFetch.mockResolvedValue(mockResponse as unknown as Response);

      await service.geocodeNominatim(mockParams);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('Brazil'),
        expect.any(Object),
      );
    });

    it('should handle empty street and number', async () => {
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue([
          {
            lat: '-23.5505',
            lon: '-46.6333',
          },
        ]),
      };

      mockFetch.mockResolvedValue(mockResponse as unknown as Response);

      await service.geocodeNominatim({
        street: '',
        number: '',
        neighborhood: 'Centro',
        city: 'São Paulo',
        state: 'SP',
        zipCode: '01310-100',
      });

      expect(mockFetch).toHaveBeenCalled();
    });

    it('should use NOMINATIM_USER_AGENT env var when set', async () => {
      const originalEnv = process.env.NOMINATIM_USER_AGENT;
      process.env.NOMINATIM_USER_AGENT = 'custom-agent/1.0';

      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue([
          {
            lat: '-23.5505',
            lon: '-46.6333',
          },
        ]),
      };

      mockFetch.mockResolvedValue(mockResponse as unknown as Response);

      await service.geocodeNominatim(mockParams);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'user-agent': 'custom-agent/1.0',
          }),
        }),
      );

      process.env.NOMINATIM_USER_AGENT = originalEnv;
    });

    it('should handle non-array response', async () => {
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({ lat: '-23.5505', lon: '-46.6333' }),
      };

      mockFetch.mockResolvedValue(mockResponse as unknown as Response);

      const result = await service.geocodeNominatim(mockParams);

      expect(result).toBeNull();
    });

    it('should handle fetch error (non-ok response)', async () => {
      const mockResponse = {
        ok: false,
        status: 500,
        json: jest.fn().mockResolvedValue({}),
      };

      mockFetch.mockResolvedValue(mockResponse as unknown as Response);

      await expect(service.geocodeNominatim(mockParams)).rejects.toThrow(
        'Geocoding request failed: 500',
      );
    });

    it('should handle timeout', async () => {
      jest.useFakeTimers();

      mockFetch.mockImplementation(
        () =>
          new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Aborted')), 10000);
          }),
      );

      const promise = service.geocodeNominatim(mockParams);
      jest.advanceTimersByTime(10000);

      await expect(promise).rejects.toThrow();

      jest.useRealTimers();
    });
  });
});
