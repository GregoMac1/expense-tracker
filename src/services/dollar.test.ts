import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DollarService, convertToUsd } from './dollar';

function mockResponse(body: unknown, ok = true, status = 200): Response {
  return {
    ok,
    status,
    json: async () => body,
  } as Response;
}

describe('DollarService', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it('fetches and returns the rate (venta)', async () => {
    const fetchMock = vi.fn(async () =>
      mockResponse({ compra: 1000, venta: 1050, fechaActualizacion: 'x' }),
    );
    const svc = new DollarService('http://fake', fetchMock as typeof fetch);
    const quote = await svc.getRate();
    expect(quote).toEqual({ rate: 1050, fetchedAt: 'x' });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('caches within TTL', async () => {
    const fetchMock = vi.fn(async () => mockResponse({ venta: 1000 }));
    const svc = new DollarService('http://fake', fetchMock as typeof fetch);
    await svc.getRate();
    await svc.getRate();
    await svc.getRate();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('refetches after TTL expires', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(mockResponse({ venta: 1000 }))
      .mockResolvedValueOnce(mockResponse({ venta: 1100 }));
    const svc = new DollarService(
      'http://fake',
      fetchMock as typeof fetch,
      60_000,
    );
    const first = await svc.getRate();
    vi.setSystemTime(Date.now() + 70_000);
    const second = await svc.getRate();
    expect(first?.rate).toBe(1000);
    expect(second?.rate).toBe(1100);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('returns null on non-200 without throwing', async () => {
    const fetchMock = vi.fn(async () => mockResponse({}, false, 500));
    const svc = new DollarService('http://fake', fetchMock as typeof fetch);
    const quote = await svc.getRate();
    expect(quote).toBeNull();
  });

  it('returns null when fetch throws', async () => {
    const fetchMock = vi.fn(async () => {
      throw new Error('econnrefused');
    });
    const svc = new DollarService('http://fake', fetchMock as typeof fetch);
    const quote = await svc.getRate();
    expect(quote).toBeNull();
  });

  it('returns null when response has no rate', async () => {
    const fetchMock = vi.fn(async () => mockResponse({}));
    const svc = new DollarService('http://fake', fetchMock as typeof fetch);
    const quote = await svc.getRate();
    expect(quote).toBeNull();
  });
});

describe('convertToUsd', () => {
  it('divides ARS by rate', () => {
    expect(convertToUsd(10000, 1000)).toBe(10);
    expect(convertToUsd(15000, 1200)).toBe(12.5);
  });
});
