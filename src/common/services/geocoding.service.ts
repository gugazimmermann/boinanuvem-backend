import { Injectable, Logger } from '@nestjs/common';

export type LatLng = { latitude: number; longitude: number };

type NominatimSearchResult = {
  lat?: string;
  lon?: string;
};

@Injectable()
export class GeocodingService {
  private readonly logger = new Logger(GeocodingService.name);

  async geocodeNominatim(params: {
    street: string;
    number: string;
    neighborhood: string;
    city: string;
    state: string;
    zipCode: string;
    country?: string;
  }): Promise<LatLng | null> {
    const qParts = [
      `${params.street} ${params.number}`.trim(),
      params.neighborhood,
      params.city,
      params.state,
      params.zipCode,
      params.country ?? 'Brazil',
    ].filter(Boolean);

    const q = qParts.join(', ');

    const url =
      `https://nominatim.openstreetmap.org/search` +
      `?format=jsonv2` +
      `&limit=1` +
      `&q=${encodeURIComponent(q)}`;

    const userAgent =
      process.env.NOMINATIM_USER_AGENT ??
      'boinanuvem-backend/unknown (contact: unset)';

    const data = await this.fetchJsonWithTimeout<NominatimSearchResult[]>(url, {
      timeoutMs: 10_000,
      headers: {
        accept: 'application/json',
        'user-agent': userAgent,
      },
    });

    const first = Array.isArray(data) ? data[0] : undefined;
    if (!first?.lat || !first?.lon) {
      this.logger.warn(`Nominatim returned no result for query: ${q}`);
      return null;
    }

    const latitude = Number(first.lat);
    const longitude = Number(first.lon);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      this.logger.warn(`Nominatim returned invalid coords for query: ${q}`);
      return null;
    }

    return { latitude, longitude };
  }

  private async fetchJsonWithTimeout<T>(
    url: string,
    opts: { timeoutMs: number; headers?: Record<string, string> },
  ): Promise<T> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), opts.timeoutMs);

    try {
      const init: RequestInit = {
        signal: controller.signal,
        ...(opts.headers ? { headers: opts.headers } : {}),
      };

      const res = await fetch(url, init);

      if (!res.ok) {
        throw new Error(`Geocoding request failed: ${res.status}`);
      }

      return (await res.json()) as T;
    } finally {
      clearTimeout(timeout);
    }
  }
}
