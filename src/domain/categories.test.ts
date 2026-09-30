import { describe, it, expect } from 'vitest';
import { normalizeCategory, isCategory } from './categories';

describe('normalizeCategory', () => {
  it('passes through known categories', () => {
    expect(normalizeCategory('comida')).toBe('comida');
    expect(normalizeCategory('deportes')).toBe('deportes');
  });

  it('lowercases', () => {
    expect(normalizeCategory('COMIDA')).toBe('comida');
    expect(normalizeCategory('Comida')).toBe('comida');
  });

  it('maps unknown values to otros', () => {
    expect(normalizeCategory('cripto')).toBe('otros');
    expect(normalizeCategory('gaming')).toBe('otros');
    expect(normalizeCategory('random')).toBe('otros');
  });

  it('handles null/undefined/empty', () => {
    expect(normalizeCategory(null)).toBe('otros');
    expect(normalizeCategory(undefined)).toBe('otros');
    expect(normalizeCategory('')).toBe('otros');
  });

  it('trims whitespace', () => {
    expect(normalizeCategory('  comida  ')).toBe('comida');
  });
});

describe('isCategory', () => {
  it('accepts all known categories', () => {
    for (const cat of [
      'comida',
      'transporte',
      'entretenimiento',
      'servicios',
      'salud',
      'ropa',
      'hogar',
      'educacion',
      'deportes',
      'viajes',
      'tecnologia',
      'regalos',
      'otros',
    ]) {
      expect(isCategory(cat)).toBe(true);
    }
  });

  it('rejects unknown', () => {
    expect(isCategory('cripto')).toBe(false);
  });
});
