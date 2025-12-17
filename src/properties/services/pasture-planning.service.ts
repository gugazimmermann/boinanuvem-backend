import { Injectable, Logger } from '@nestjs/common';

export type PastureClassification = 'Poor' | 'Medium' | 'Good' | 'Excellent';

export type PasturePlanningMonth = {
  month: string;
  min: number;
  max: number;
  precipitation: number;
  classification: PastureClassification;
};

export type PasturePlanningResult = {
  pasturePlanning: PasturePlanningMonth[];
  breedingMonths: string[];
};

type OpenMeteoArchiveResponse = {
  daily?: {
    time: string[];
    temperature_2m_min: number[];
    temperature_2m_max: number[];
    precipitation_sum: number[];
  };
};

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const;

@Injectable()
export class PasturePlanningService {
  private readonly logger = new Logger(PasturePlanningService.name);

  async computeFromLatLng(params: {
    latitude: number;
    longitude: number;
    timezone?: string;
    yearsBack?: number;
  }): Promise<PasturePlanningResult> {
    const timezone = params.timezone ?? 'America/Sao_Paulo';
    const yearsBack = params.yearsBack ?? 20;

    const today = new Date();
    const start = new Date();
    start.setFullYear(today.getFullYear() - yearsBack);

    const startDate = this.formatDate(start);
    const endDate = this.formatDate(today);

    const url =
      `https://archive-api.open-meteo.com/v1/era5` +
      `?latitude=${encodeURIComponent(String(params.latitude))}` +
      `&longitude=${encodeURIComponent(String(params.longitude))}` +
      `&start_date=${encodeURIComponent(startDate)}` +
      `&end_date=${encodeURIComponent(endDate)}` +
      `&daily=temperature_2m_min,temperature_2m_max,precipitation_sum` +
      `&timezone=${encodeURIComponent(timezone)}`;

    const data = await this.fetchJsonWithTimeout<OpenMeteoArchiveResponse>(
      url,
      {
        timeoutMs: 12_000,
      },
    );

    const daily = data.daily;
    if (
      !daily ||
      !Array.isArray(daily.time) ||
      !Array.isArray(daily.temperature_2m_min) ||
      !Array.isArray(daily.temperature_2m_max) ||
      !Array.isArray(daily.precipitation_sum) ||
      daily.time.length === 0
    ) {
      throw new Error('Open-Meteo response missing daily data');
    }

    // Group temperatures by month number (1-12)
    const dailyDataByMonth: Record<
      number,
      { minTemp: number[]; maxTemp: number[] }
    > = {};

    daily.time.forEach((dateStr, index) => {
      const monthNum = parseInt(dateStr.substring(5, 7), 10);
      if (!dailyDataByMonth[monthNum]) {
        dailyDataByMonth[monthNum] = { minTemp: [], maxTemp: [] };
      }
      dailyDataByMonth[monthNum].minTemp.push(daily.temperature_2m_min[index]);
      dailyDataByMonth[monthNum].maxTemp.push(daily.temperature_2m_max[index]);
    });

    // Build monthly precipitation totals per year-month, then average by month number
    const monthlyTotals: Record<
      string,
      { monthNum: number; precipitation: number }
    > = {};

    daily.time.forEach((dateStr, index) => {
      const yearMonth = dateStr.substring(0, 7);
      const monthNum = parseInt(dateStr.substring(5, 7), 10);

      if (!monthlyTotals[yearMonth]) {
        monthlyTotals[yearMonth] = { monthNum, precipitation: 0 };
      }
      monthlyTotals[yearMonth].precipitation += daily.precipitation_sum[index];
    });

    const monthlyTotalsByMonth: Record<number, number[]> = {};
    Object.values(monthlyTotals).forEach((monthTotal) => {
      const monthNum = monthTotal.monthNum;
      if (!monthlyTotalsByMonth[monthNum]) {
        monthlyTotalsByMonth[monthNum] = [];
      }
      monthlyTotalsByMonth[monthNum].push(monthTotal.precipitation);
    });

    const pasturePlanning: PasturePlanningMonth[] = Object.keys(
      dailyDataByMonth,
    )
      .map((m) => parseInt(m, 10))
      .sort((a, b) => a - b)
      .map((monthNum) => {
        const monthData = dailyDataByMonth[monthNum];
        const monthlyPrecipTotals = monthlyTotalsByMonth[monthNum] ?? [];

        const avgMinTemp =
          monthData.minTemp.reduce((sum, val) => sum + val, 0) /
          monthData.minTemp.length;
        const avgMaxTemp =
          monthData.maxTemp.reduce((sum, val) => sum + val, 0) /
          monthData.maxTemp.length;
        const avgTemp = (avgMinTemp + avgMaxTemp) / 2;

        const avgMonthlyPrecipitation =
          monthlyPrecipTotals.length > 0
            ? monthlyPrecipTotals.reduce((sum, val) => sum + val, 0) /
              monthlyPrecipTotals.length
            : 0;

        const classification = this.classifyForage(
          avgTemp,
          avgMonthlyPrecipitation,
        );

        return {
          month: MONTH_NAMES[monthNum - 1] ?? String(monthNum),
          min: this.round2(avgMinTemp),
          max: this.round2(avgMaxTemp),
          precipitation: this.round2(avgMonthlyPrecipitation),
          classification,
        };
      });

    const breedingMonths = this.calculateBreedingSeason(pasturePlanning);

    return { pasturePlanning, breedingMonths };
  }

  private classifyForage(
    avgTemp: number,
    precipitation: number,
  ): PastureClassification {
    // Ported from boinanuvem-frontend/pasture-planning.js
    if (avgTemp < 15 || avgTemp > 33 || precipitation < 40) {
      return 'Poor';
    }

    if (avgTemp >= 22 && precipitation >= 100) {
      return 'Excellent';
    }

    // From here: avgTemp is in [15, 33] and precipitation is >= 40,
    // and we already excluded the Excellent case (avgTemp >= 22 && precipitation >= 100).
    if (precipitation >= 100) {
      // Equivalent to: if (avgTemp >= 20 && avgTemp < 22) return 'Good' else 'Medium'
      return avgTemp >= 20 ? 'Good' : 'Medium';
    }

    if (precipitation >= 80) {
      // For precipitation in [80, 100), any temperature in [15, 33] is classified as 'Good'
      // by the original rules (either optimal or shoulder band).
      return 'Good';
    }

    // precipitation is in [40, 80)
    return 'Medium';
  }

  private calculateBreedingSeason(
    monthlyResults: PasturePlanningMonth[],
  ): string[] {
    const breedingMonths: string[] = [];

    monthlyResults.forEach((result) => {
      if (result.classification !== 'Excellent') {
        return;
      }

      const birthMonth =
        MONTH_NAMES.indexOf(result.month as (typeof MONTH_NAMES)[number]) + 1;
      if (birthMonth <= 0) {
        return;
      }

      let breedingMonthNum = birthMonth - 9;
      if (breedingMonthNum <= 0) {
        breedingMonthNum += 12;
      }
      const breedingMonth = MONTH_NAMES[breedingMonthNum - 1];
      if (breedingMonth && !breedingMonths.includes(breedingMonth)) {
        breedingMonths.push(breedingMonth);
      }
    });

    return breedingMonths;
  }

  private formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private round2(value: number): number {
    return parseFloat(value.toFixed(2));
  }

  private async fetchJsonWithTimeout<T>(
    url: string,
    opts: { timeoutMs: number },
  ): Promise<T> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), opts.timeoutMs);

    try {
      const res = await fetch(url, {
        signal: controller.signal,
        headers: {
          accept: 'application/json',
        },
      });

      if (!res.ok) {
        this.logger.warn(
          `Open-Meteo request failed: ${res.status} ${res.statusText}`,
        );
        throw new Error(`Open-Meteo request failed: ${res.status}`);
      }

      return (await res.json()) as T;
    } finally {
      clearTimeout(timeout);
    }
  }
}
