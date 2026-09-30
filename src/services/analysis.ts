import {
  monthlyAggregate,
  topExpensesInRange,
  topDaysInRange,
} from '../db/repos/expenses';
import {
  monthRange,
  previousMonth,
  compareCategories,
} from '../domain/aggregations';
import {
  buildAnalysisPrompt,
  type AnalysisStats,
} from '../llm/analysis-prompt';
import {
  generateText,
  OllamaUnavailableError,
  OllamaTimeoutError,
  OllamaHttpError,
} from '../llm/client';

export { OllamaUnavailableError, OllamaTimeoutError, OllamaHttpError };

export function computeStats(month: string): AnalysisStats {
  const prev = previousMonth(month);
  const curRange = monthRange(month);
  const prevRange = monthRange(prev);

  const cur = monthlyAggregate(curRange.start, curRange.end);
  const prevAgg = monthlyAggregate(prevRange.start, prevRange.end);

  const topExp = topExpensesInRange(curRange.start, curRange.end, 10);
  const topDays = topDaysInRange(curRange.start, curRange.end, 5);

  const byCategoryWithPct = cur.by_category.map((c) => ({
    category: c.category,
    total_ars: c.total_ars,
    pct: cur.total_ars > 0 ? (c.total_ars / cur.total_ars) * 100 : 0,
  }));

  return {
    month,
    previous_month: prev,
    current_total_ars: cur.total_ars,
    current_total_usd: cur.total_usd,
    previous_total_ars: prevAgg.total_ars,
    previous_total_usd: prevAgg.total_usd,
    count: cur.count,
    by_category: byCategoryWithPct,
    category_variation: compareCategories(cur.by_category, prevAgg.by_category),
    top_expenses: topExp.map((e) => ({
      amount_ars: e.amount_ars,
      category: e.category,
      description: e.description,
      spent_at: e.spent_at,
    })),
    top_days: topDays,
  };
}

export async function generateAnalysis(stats: AnalysisStats): Promise<string> {
  const prompt = buildAnalysisPrompt(stats);
  const result = await generateText({
    prompt,
    promptVersion: 'analysis-v1',
    timeoutMs: 300_000,
  });
  return result.rawResponse.trim();
}
