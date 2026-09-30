import { z } from 'zod';

export const debtExtractionSchema = z.object({
  person_name: z.string().min(1),
  amount_ars: z.number().positive(),
});

export type DebtExtraction = z.infer<typeof debtExtractionSchema>;

// La categoría se acepta como string genérico; la normalización a nuestro enum
// ocurre en el service para no triggerear retries por un valor inesperado
// (los retries al LLM en 7B CPU cuestan 3+ minutos).
export const expenseExtractionSchema = z.object({
  is_expense: z.boolean(),
  amount_ars: z.number().nullable(),
  spent_at: z.string().nullable(),
  category: z.string().nullable(),
  subcategory: z.string().nullable(),
  description: z.string(),
  debts: z.array(debtExtractionSchema).default([]),
  confidence: z.number().min(0).max(1),
  clarification_question: z.string().nullable(),
});

export type ExpenseExtraction = z.infer<typeof expenseExtractionSchema>;
