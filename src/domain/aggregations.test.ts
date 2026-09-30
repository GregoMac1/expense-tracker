import { describe, it, expect } from 'vitest';
import {
  monthRange,
  currentMonth,
  previousMonth,
  compareCategories,
} from './aggregations';

describe('monthRange', () => {
  it('returns correct range for a normal month', () => {
    expect(monthRange('2026-03')).toEqual({
      start: '2026-03-01',
      end: '2026-04-01',
    });
  });

  it('handles December -> January wraparound', () => {
    expect(monthRange('2026-12')).toEqual({
      start: '2026-12-01',
      end: '2027-01-01',
    });
  });

  it('handles February', () => {
    expect(monthRange('2026-02')).toEqual({
      start: '2026-02-01',
      end: '2026-03-01',
    });
  });

  it('rejects invalid format', () => {
    expect(() => monthRange('2026-3')).toThrow();
    expect(() => monthRange('abc')).toThrow();
    expect(() => monthRange('2026-13')).toThrow();
    expect(() => monthRange('2026-00')).toThrow();
  });
});

describe('currentMonth', () => {
  it('formats as YYYY-MM in local time', () => {
    expect(currentMonth(new Date(2026, 3, 23, 10, 0))).toBe('2026-04');
    expect(currentMonth(new Date(2026, 0, 15, 12, 0))).toBe('2026-01');
    expect(currentMonth(new Date(2026, 11, 15, 12, 0))).toBe('2026-12');
  });
});

describe('previousMonth', () => {
  it('returns previous month normally', () => {
    expect(previousMonth('2026-04')).toBe('2026-03');
    expect(previousMonth('2026-12')).toBe('2026-11');
  });

  it('wraps to December of previous year', () => {
    expect(previousMonth('2026-01')).toBe('2025-12');
  });
});

describe('compareCategories', () => {
  it('matches categories across months', () => {
    const cur = [
      { category: 'comida', total_ars: 20000 },
      { category: 'transporte', total_ars: 5000 },
    ];
    const prev = [
      { category: 'comida', total_ars: 10000 },
      { category: 'ropa', total_ars: 3000 },
    ];
    const result = compareCategories(cur, prev);
    const comida = result.find((r) => r.category === 'comida');
    const transporte = result.find((r) => r.category === 'transporte');
    const ropa = result.find((r) => r.category === 'ropa');

    expect(comida).toEqual({
      category: 'comida',
      current_ars: 20000,
      previous_ars: 10000,
      variation_pct: 100,
    });
    expect(transporte?.previous_ars).toBe(0);
    expect(transporte?.variation_pct).toBeNull();
    expect(ropa?.current_ars).toBe(0);
  });

  it('sorts by current total descending', () => {
    const cur = [
      { category: 'transporte', total_ars: 5000 },
      { category: 'comida', total_ars: 20000 },
    ];
    const result = compareCategories(cur, []);
    expect(result[0]?.category).toBe('comida');
    expect(result[1]?.category).toBe('transporte');
  });
});
