import { describe, it, expect } from 'vitest';
import { parseEdits } from './edit-parser';

describe('parseEdits', () => {
  it('parses single field', () => {
    const result = parseEdits(['monto=18000']);
    expect(result).toEqual({ ok: true, edits: { amount_ars: 18000 } });
  });

  it('parses multiple fields', () => {
    const result = parseEdits(['monto=18000', 'categoria=transporte']);
    expect(result).toEqual({
      ok: true,
      edits: { amount_ars: 18000, category: 'transporte' },
    });
  });

  it('allows spaces in values by absorbing bare tokens', () => {
    const result = parseEdits([
      'descripcion=cena',
      'con',
      'pedro',
      'categoria=entretenimiento',
    ]);
    expect(result).toEqual({
      ok: true,
      edits: {
        description: 'cena con pedro',
        category: 'entretenimiento',
      },
    });
  });

  it('rejects unknown fields', () => {
    const result = parseEdits(['foo=bar']);
    expect(result.ok).toBe(false);
  });

  it('rejects invalid category', () => {
    const result = parseEdits(['categoria=cripto']);
    expect(result.ok).toBe(false);
  });

  it('rejects invalid date format', () => {
    const result = parseEdits(['fecha=23/04/2026']);
    expect(result.ok).toBe(false);
  });

  it('rejects negative amount', () => {
    const result = parseEdits(['monto=-100']);
    expect(result.ok).toBe(false);
  });

  it('allows setting subcategoria to null', () => {
    const result = parseEdits(['subcategoria=null']);
    expect(result).toEqual({ ok: true, edits: { subcategory: null } });
  });

  it('rejects empty edit list', () => {
    const result = parseEdits([]);
    expect(result.ok).toBe(false);
  });

  it('strips currency symbols from monto', () => {
    const result = parseEdits(['monto=$18000']);
    expect(result).toEqual({ ok: true, edits: { amount_ars: 18000 } });
  });
});
