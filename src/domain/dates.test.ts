import { describe, it, expect } from 'vitest';
import { toLocalDate } from './dates';

describe('toLocalDate', () => {
  it('uses the local calendar day, not the UTC one', () => {
    // 23:30 hora local: en UTC-3 ya es el día siguiente en UTC.
    const lateNight = new Date(2026, 3, 23, 23, 30).toISOString();
    expect(toLocalDate(lateNight)).toBe('2026-04-23');
  });

  it('pads month and day', () => {
    const early = new Date(2026, 0, 5, 9, 0).toISOString();
    expect(toLocalDate(early)).toBe('2026-01-05');
  });
});
