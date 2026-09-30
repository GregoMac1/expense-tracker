import { describe, it, expect } from 'vitest';
import { expenseExtractionSchema } from './schemas';

describe('expenseExtractionSchema', () => {
  it('accepts a complete valid expense', () => {
    const result = expenseExtractionSchema.safeParse({
      is_expense: true,
      amount_ars: 15000,
      spent_at: null,
      category: 'comida',
      subcategory: 'supermercado',
      description: 'super del jueves',
      confidence: 0.9,
      clarification_question: null,
    });
    expect(result.success).toBe(true);
  });

  it('accepts a non-expense with nulls', () => {
    const result = expenseExtractionSchema.safeParse({
      is_expense: false,
      amount_ars: null,
      spent_at: null,
      category: null,
      subcategory: null,
      description: 'saludo',
      confidence: 1,
      clarification_question: null,
    });
    expect(result.success).toBe(true);
  });

  it('accepts any string for category (normalization happens in the service)', () => {
    const result = expenseExtractionSchema.safeParse({
      is_expense: true,
      amount_ars: 1000,
      spent_at: null,
      category: 'cripto',
      subcategory: null,
      description: '',
      confidence: 0.5,
      clarification_question: null,
    });
    expect(result.success).toBe(true);
  });

  it('rejects confidence out of range', () => {
    const result = expenseExtractionSchema.safeParse({
      is_expense: true,
      amount_ars: 1000,
      spent_at: null,
      category: 'otros',
      subcategory: null,
      description: '',
      confidence: 1.5,
      clarification_question: null,
    });
    expect(result.success).toBe(false);
  });

  it('rejects missing required fields', () => {
    const result = expenseExtractionSchema.safeParse({
      is_expense: true,
      amount_ars: 1000,
    });
    expect(result.success).toBe(false);
  });
});
