import { Logger } from '@nestjs/common';
import { PasturePlanningService } from './pasture-planning.service';

describe('PasturePlanningService', () => {
  let service: PasturePlanningService;
  let fetchSpy: jest.SpyInstance;
  let loggerWarnSpy: jest.SpyInstance;

  beforeEach(() => {
    service = new PasturePlanningService();
    // Ensure fetch is always mocked to prevent real HTTP requests
    fetchSpy = jest.spyOn(globalThis, 'fetch' as never);
    // Suppress logger warnings in tests to keep output clean
    loggerWarnSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  function mockOpenMeteoDaily(payload: {
    time: string[];
    temperature_2m_min: number[];
    temperature_2m_max: number[];
    precipitation_sum: number[];
  }) {
    fetchSpy.mockResolvedValue({
      ok: true,
      json: async () => ({
        daily: payload,
      }),
    } as never);
    return fetchSpy;
  }

  it('should compute breeding months from Excellent months (wrap around year)', async () => {
    // Mock fetch to return minimal daily data that creates an Excellent month in January
    const mockFetch = mockOpenMeteoDaily({
      time: ['2025-01-01'],
      temperature_2m_min: [22],
      temperature_2m_max: [22],
      precipitation_sum: [100],
    });

    const result = await service.computeFromLatLng({
      latitude: -26.5,
      longitude: -48.7,
      yearsBack: 1,
    });

    expect(mockFetch).toHaveBeenCalled();
    expect(result.pasturePlanning[0]).toMatchObject({
      month: 'January',
      classification: 'Excellent',
    });
    // January birth month -> breeding month is April (1 - 9 => -8 => +12 = 4)
    expect(result.breedingMonths).toEqual(['April']);
  });

  it('should classify Poor when precipitation is below 40', async () => {
    const mockFetch = mockOpenMeteoDaily({
      time: ['2025-02-01'],
      temperature_2m_min: [20],
      temperature_2m_max: [20],
      precipitation_sum: [39],
    });

    const result = await service.computeFromLatLng({
      latitude: -26.5,
      longitude: -48.7,
      yearsBack: 1,
    });

    expect(mockFetch).toHaveBeenCalled();
    expect(result.pasturePlanning).toHaveLength(1);
    expect(result.pasturePlanning[0]).toMatchObject({
      month: 'February',
      classification: 'Poor',
    });
  });

  it('should classify Good when precipitation is between 80 and 100 (non-Excellent)', async () => {
    // avgTemp 21, precip 80 => Good (not Excellent because avgTemp < 22)
    const mockFetch = mockOpenMeteoDaily({
      time: ['2025-03-01'],
      temperature_2m_min: [21],
      temperature_2m_max: [21],
      precipitation_sum: [80],
    });

    const result = await service.computeFromLatLng({
      latitude: -26.5,
      longitude: -48.7,
      yearsBack: 1,
    });

    expect(mockFetch).toHaveBeenCalled();
    expect(result.pasturePlanning[0]).toMatchObject({
      month: 'March',
      classification: 'Good',
    });
  });

  it('should classify Good when precipitation is >= 100 and avgTemp is in [20, 22)', async () => {
    // Mirrors the original rule: avgTemp >= 20 && avgTemp < 22 && precipitation >= 100 => Good
    const mockFetch = mockOpenMeteoDaily({
      time: ['2025-04-01'],
      temperature_2m_min: [21],
      temperature_2m_max: [21],
      precipitation_sum: [150],
    });

    const result = await service.computeFromLatLng({
      latitude: -26.5,
      longitude: -48.7,
      yearsBack: 1,
    });

    expect(mockFetch).toHaveBeenCalled();
    expect(result.pasturePlanning[0]).toMatchObject({
      month: 'April',
      classification: 'Good',
    });
  });

  it('should average precipitation totals across multiple year-months for the same month', async () => {
    // Two different Januarys with monthly totals 60 and 100 -> avg 80
    const mockFetch = mockOpenMeteoDaily({
      time: ['2024-01-01', '2025-01-01'],
      temperature_2m_min: [21, 21],
      temperature_2m_max: [21, 21],
      precipitation_sum: [60, 100],
    });

    const result = await service.computeFromLatLng({
      latitude: -26.5,
      longitude: -48.7,
      yearsBack: 2,
    });

    expect(mockFetch).toHaveBeenCalled();
    expect(result.pasturePlanning).toHaveLength(1);
    expect(result.pasturePlanning[0].month).toBe('January');
    expect(result.pasturePlanning[0].precipitation).toBe(80);
    expect(result.pasturePlanning[0].classification).toBe('Good');
  });

  it('should throw when Open-Meteo response is missing daily data', async () => {
    fetchSpy.mockResolvedValue({
      ok: true,
      json: async () => ({}),
    } as never);

    await expect(
      service.computeFromLatLng({
        latitude: -26.5,
        longitude: -48.7,
        yearsBack: 1,
      }),
    ).rejects.toThrow('Open-Meteo response missing daily data');
    expect(fetchSpy).toHaveBeenCalled();
  });

  it('should throw when Open-Meteo responds with non-OK status', async () => {
    fetchSpy.mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Server Error',
      json: async () => ({}),
    } as never);

    await expect(
      service.computeFromLatLng({
        latitude: -26.5,
        longitude: -48.7,
        yearsBack: 1,
      }),
    ).rejects.toThrow('Open-Meteo request failed');
    expect(fetchSpy).toHaveBeenCalled();
    // Verify that the warning was logged
    expect(loggerWarnSpy).toHaveBeenCalledWith(
      expect.stringContaining('Open-Meteo request failed: 500'),
    );
  });
});
