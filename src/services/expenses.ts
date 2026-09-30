import {
  generateJson,
  OllamaUnavailableError,
  OllamaTimeoutError,
  OllamaHttpError,
} from '../llm/client';
import { buildExpenseExtractionPrompt } from '../llm/prompts';
import {
  expenseExtractionSchema,
  type ExpenseExtraction,
} from '../llm/schemas';
import { insertExpense, type Expense } from '../db/repos/expenses';
import { listAllWithAliases } from '../db/repos/people';
import { isCategory, normalizeCategory } from '../domain/categories';
import { logger } from '../logger';
import { toLocalDate } from '../domain/dates';

export { OllamaUnavailableError, OllamaTimeoutError, OllamaHttpError };

const PROMPT_VERSION = 'expense-extraction-v2';

export type ExtractResult =
  | { kind: 'expense'; extraction: ExpenseExtraction }
  | { kind: 'not_expense'; extraction: ExpenseExtraction }
  | { kind: 'needs_clarification'; extraction: ExpenseExtraction }
  | { kind: 'invalid'; error: string; rawResponse: string };

export async function extractFromMessage(
  rawMessage: string,
  referenceDate: string,
): Promise<ExtractResult> {
  const knownPeople = listAllWithAliases().map((p) => ({
    canonical_name: p.canonical_name,
    aliases: p.aliases,
  }));

  const prompt = buildExpenseExtractionPrompt({
    rawMessage,
    referenceDate,
    knownPeople,
  });

  let lastError = '';
  let lastRaw = '';
  for (let attempt = 1; attempt <= 2; attempt++) {
    const { rawResponse } = await generateJson({
      prompt,
      promptVersion: PROMPT_VERSION,
    });
    lastRaw = rawResponse;

    const parsed = safeJsonParse(rawResponse);
    if (parsed === null) {
      lastError = 'response is not valid JSON';
      logger.warn({ attempt, rawResponse: rawResponse.slice(0, 200) }, lastError);
      continue;
    }

    const validated = expenseExtractionSchema.safeParse(parsed);
    if (!validated.success) {
      lastError = `schema validation failed: ${validated.error.message}`;
      logger.warn({ attempt, error: validated.error.format() }, lastError);
      continue;
    }

    // Normalizar categoría: si el LLM devolvió algo fuera de nuestro enum,
    // lo mapeamos a 'otros' acá (no fallamos para evitar un retry de 3+ min).
    if (validated.data.category && !isCategory(validated.data.category.toLowerCase())) {
      logger.warn(
        { provided: validated.data.category },
        'LLM returned unknown category, mapping to "otros"',
      );
      validated.data.category = normalizeCategory(validated.data.category);
    } else if (validated.data.category) {
      validated.data.category = validated.data.category.toLowerCase();
    }

    return classifyExtraction(validated.data);
  }

  return { kind: 'invalid', error: lastError, rawResponse: lastRaw };
}

function classifyExtraction(ext: ExpenseExtraction): ExtractResult {
  if (!ext.is_expense) {
    return { kind: 'not_expense', extraction: ext };
  }
  if (ext.amount_ars === null || ext.amount_ars <= 0) {
    return { kind: 'needs_clarification', extraction: ext };
  }
  if (ext.category === null) {
    return { kind: 'needs_clarification', extraction: ext };
  }
  if (ext.confidence < 0.7 || ext.clarification_question !== null) {
    return { kind: 'needs_clarification', extraction: ext };
  }
  return { kind: 'expense', extraction: ext };
}

function safeJsonParse(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

export interface SaveExpenseParams {
  extraction: ExpenseExtraction;
  rawMessage: string;
  telegramMessageId: number;
  fallbackSpentAt: string;
  amountUsd?: number | null;
  usdRate?: number | null;
}

export function saveExtractedExpense(params: SaveExpenseParams): Expense {
  const { extraction, rawMessage, telegramMessageId, fallbackSpentAt } = params;
  if (extraction.amount_ars === null || extraction.category === null) {
    throw new Error('Cannot save incomplete extraction');
  }
  return insertExpense({
    amount_ars: extraction.amount_ars,
    amount_usd: params.amountUsd ?? null,
    usd_rate: params.usdRate ?? null,
    category: extraction.category,
    subcategory: extraction.subcategory,
    description: extraction.description,
    spent_at: extraction.spent_at ?? toLocalDate(fallbackSpentAt),
    raw_message: rawMessage,
    telegram_message_id: telegramMessageId,
  });
}
