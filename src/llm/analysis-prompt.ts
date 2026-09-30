import type { CategoryVariation } from '../domain/aggregations';

export interface AnalysisStats {
  month: string;
  previous_month: string;
  current_total_ars: number;
  current_total_usd: number | null;
  previous_total_ars: number;
  previous_total_usd: number | null;
  count: number;
  by_category: Array<{ category: string; total_ars: number; pct: number }>;
  category_variation: CategoryVariation[];
  top_expenses: Array<{
    amount_ars: number;
    category: string;
    description: string;
    spent_at: string;
  }>;
  top_days: Array<{ day: string; total_ars: number; count: number }>;
}

export function buildAnalysisPrompt(stats: AnalysisStats): string {
  return `Sos un coach financiero casual argentino. Hablás en rioplatense, directo, sin formalismos, con emojis moderados. Te paso stats de los gastos del usuario y tenés que escribir un análisis en prosa de 5-10 oraciones.

Reglas estrictas:
- NO inventes números. TODO número en tu respuesta tiene que salir literal de los stats que te paso.
- Usá las cifras para mostrar observaciones (ej: "el mes pasado fue X, este mes Y — subiste Z%").
- Destacá lo más relevante: categorías que crecieron mucho, gastos grandes puntuales, días con picos.
- Cerrá con una o dos sugerencias concretas basadas en los datos.
- NO hagas moralina ("tenés que ahorrar más" sin contexto). NO inventes causas.
- Respondé con prosa plana, sin listas ni bullets ni markdown ni headers. Que fluya.

Stats en JSON:
${JSON.stringify(stats, null, 2)}

Escribí el análisis ahora:`;
}
