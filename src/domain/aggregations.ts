/**
 * Devuelve [start, end) del mes `YYYY-MM` como strings ISO YYYY-MM-DD.
 * `end` es el primer día del mes siguiente (exclusivo).
 */
export function monthRange(yyyymm: string): { start: string; end: string } {
  const match = /^(\d{4})-(\d{2})$/.exec(yyyymm);
  if (!match) {
    throw new Error(`Invalid month format: ${yyyymm} (expected YYYY-MM)`);
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  if (month < 1 || month > 12) {
    throw new Error(`Invalid month: ${yyyymm}`);
  }
  const start = `${pad(year, 4)}-${pad(month, 2)}-01`;
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;
  const end = `${pad(nextYear, 4)}-${pad(nextMonth, 2)}-01`;
  return { start, end };
}

export function currentMonth(now: Date = new Date()): string {
  return `${pad(now.getFullYear(), 4)}-${pad(now.getMonth() + 1, 2)}`;
}

export function previousMonth(yyyymm: string): string {
  const match = /^(\d{4})-(\d{2})$/.exec(yyyymm);
  if (!match) throw new Error(`Invalid month format: ${yyyymm}`);
  const year = Number(match[1]);
  const month = Number(match[2]);
  const prevMonth = month === 1 ? 12 : month - 1;
  const prevYear = month === 1 ? year - 1 : year;
  return `${pad(prevYear, 4)}-${pad(prevMonth, 2)}`;
}

export interface CategoryVariation {
  category: string;
  current_ars: number;
  previous_ars: number;
  variation_pct: number | null; // null si el mes anterior era 0
}

export function compareCategories(
  current: Array<{ category: string; total_ars: number }>,
  previous: Array<{ category: string; total_ars: number }>,
): CategoryVariation[] {
  const prevMap = new Map(previous.map((p) => [p.category, p.total_ars]));
  const cats = new Set<string>();
  for (const c of current) cats.add(c.category);
  for (const p of previous) cats.add(p.category);

  const currentMap = new Map(current.map((c) => [c.category, c.total_ars]));
  const result: CategoryVariation[] = [];
  for (const cat of cats) {
    const cur = currentMap.get(cat) ?? 0;
    const prev = prevMap.get(cat) ?? 0;
    const pct = prev === 0 ? null : ((cur - prev) / prev) * 100;
    result.push({
      category: cat,
      current_ars: cur,
      previous_ars: prev,
      variation_pct: pct,
    });
  }
  result.sort((a, b) => b.current_ars - a.current_ars);
  return result;
}

function pad(n: number, width: number): string {
  return String(n).padStart(width, '0');
}
