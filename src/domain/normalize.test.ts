import { describe, it, expect } from 'vitest';
import { normalizeName } from './normalize';

describe('normalizeName', () => {
  it('lowercases', () => {
    expect(normalizeName('JuanCho')).toBe('juancho');
  });

  it('strips accents', () => {
    expect(normalizeName('Juan Pérez')).toBe('juan perez');
    expect(normalizeName('Ángel Núñez')).toBe('angel nunez');
    expect(normalizeName('María José')).toBe('maria jose');
  });

  it('trims and collapses whitespace', () => {
    expect(normalizeName('   María   José   ')).toBe('maria jose');
  });

  it('returns empty for empty input', () => {
    expect(normalizeName('')).toBe('');
    expect(normalizeName('   ')).toBe('');
  });
});
