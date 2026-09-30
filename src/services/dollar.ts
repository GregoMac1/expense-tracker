import { loadConfig } from '../config';
import { logger } from '../logger';

interface DollarApiResponse {
  compra?: number;
  venta?: number;
  fechaActualizacion?: string;
}

const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hora

type FetchImpl = typeof fetch;

export interface DollarQuote {
  rate: number;
  fetchedAt: string;
}

export class DollarService {
  private cache: DollarQuote | null = null;
  private cachedAt = 0;

  constructor(
    private readonly apiUrl: string = loadConfig().DOLLAR_API_URL,
    private readonly fetchImpl: FetchImpl = fetch,
    private readonly ttlMs: number = CACHE_TTL_MS,
  ) {}

  /**
   * Retorna la cotización o null si falla. Nunca lanza — el flujo de gastos
   * no debe bloquearse por la API del dólar.
   */
  async getRate(): Promise<DollarQuote | null> {
    const now = Date.now();
    if (this.cache && now - this.cachedAt < this.ttlMs) {
      return this.cache;
    }

    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 5_000);
      const res = await this.fetchImpl(this.apiUrl, {
        signal: controller.signal,
      });
      clearTimeout(timer);

      if (!res.ok) {
        logger.warn({ status: res.status }, 'Dollar API non-200');
        return null;
      }
      const data = (await res.json()) as DollarApiResponse;
      const rate = data.venta ?? data.compra;
      if (!rate || rate <= 0) {
        logger.warn({ data }, 'Dollar API returned no valid rate');
        return null;
      }
      this.cache = {
        rate,
        fetchedAt: data.fechaActualizacion ?? new Date().toISOString(),
      };
      this.cachedAt = now;
      return this.cache;
    } catch (err) {
      logger.warn({ err }, 'Dollar API fetch failed');
      return null;
    }
  }

  /**
   * Para tests: invalida el caché.
   */
  clearCache(): void {
    this.cache = null;
    this.cachedAt = 0;
  }
}

let singleton: DollarService | null = null;

export function getDollarService(): DollarService {
  if (!singleton) singleton = new DollarService();
  return singleton;
}

export function convertToUsd(amountArs: number, rate: number): number {
  return amountArs / rate;
}
