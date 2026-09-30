import { describe, it, expect } from 'vitest';
import { buildExpenseExtractionPrompt } from './prompts';

const refDate = '2026-04-23T10:00:00Z';

describe('buildExpenseExtractionPrompt', () => {
  it('includes the raw message', () => {
    const prompt = buildExpenseExtractionPrompt({
      rawMessage: 'gasté 15000 en super',
      referenceDate: refDate,
      knownPeople: [],
    });
    expect(prompt).toContain('gasté 15000 en super');
  });

  it('includes the reference date and weekday', () => {
    const prompt = buildExpenseExtractionPrompt({
      rawMessage: 'ayer pagué 8k de uber',
      referenceDate: refDate,
      knownPeople: [],
    });
    expect(prompt).toContain('2026-04-23');
    expect(prompt).toContain('jueves');
  });

  it('lists all valid categories', () => {
    const prompt = buildExpenseExtractionPrompt({
      rawMessage: 'whatever',
      referenceDate: refDate,
      knownPeople: [],
    });
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
      expect(prompt).toContain(cat);
    }
  });

  it('renders placeholder when no people are known', () => {
    const prompt = buildExpenseExtractionPrompt({
      rawMessage: 'x',
      referenceDate: refDate,
      knownPeople: [],
    });
    expect(prompt).toContain('todavía no hay personas registradas');
  });

  it('lists known people with their aliases', () => {
    const prompt = buildExpenseExtractionPrompt({
      rawMessage: 'x',
      referenceDate: refDate,
      knownPeople: [
        { canonical_name: 'Juan Pérez', aliases: ['juan', 'juancho'] },
        { canonical_name: 'María López', aliases: [] },
      ],
    });
    expect(prompt).toContain('Juan Pérez');
    expect(prompt).toContain('juan, juancho');
    expect(prompt).toContain('María López');
  });
});
