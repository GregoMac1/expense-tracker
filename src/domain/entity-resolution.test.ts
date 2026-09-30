import { describe, it, expect } from 'vitest';
import { resolvePerson } from './entity-resolution';

const people = [
  { id: 1, canonical_name: 'Juan Pérez', aliases: ['juan', 'juancho'] },
  { id: 2, canonical_name: 'Juan Manuel Gómez', aliases: ['jota'] },
  { id: 3, canonical_name: 'María López', aliases: [] },
];

describe('resolvePerson', () => {
  it('finds by canonical name (case/accent insensitive)', () => {
    expect(resolvePerson('maria lopez', people)).toEqual({
      kind: 'found',
      personId: 3,
      canonicalName: 'María López',
    });
    expect(resolvePerson('MARÍA LÓPEZ', people)).toEqual({
      kind: 'found',
      personId: 3,
      canonicalName: 'María López',
    });
  });

  it('finds by alias', () => {
    expect(resolvePerson('juancho', people)).toMatchObject({
      kind: 'found',
      personId: 1,
    });
    expect(resolvePerson('jota', people)).toMatchObject({
      kind: 'found',
      personId: 2,
    });
  });

  it('returns unknown when no match', () => {
    expect(resolvePerson('pedro', people)).toEqual({ kind: 'unknown' });
  });

  it('returns ambiguous when an alias matches multiple persons', () => {
    const withDuplicate = [
      ...people,
      { id: 4, canonical_name: 'Juan Otro', aliases: ['juan'] },
    ];
    const result = resolvePerson('juan', withDuplicate);
    expect(result.kind).toBe('ambiguous');
    if (result.kind === 'ambiguous') {
      expect(result.candidates.map((c) => c.id).sort()).toEqual([1, 4]);
    }
  });

  it('returns unknown for empty string', () => {
    expect(resolvePerson('', people)).toEqual({ kind: 'unknown' });
    expect(resolvePerson('   ', people)).toEqual({ kind: 'unknown' });
  });
});
