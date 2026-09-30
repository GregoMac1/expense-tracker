import { getDb } from '../connection';

export interface Expense {
  id: number;
  amount_ars: number;
  amount_usd: number | null;
  usd_rate: number | null;
  category: string;
  subcategory: string | null;
  description: string;
  spent_at: string;
  created_at: string;
  raw_message: string;
  telegram_message_id: number | null;
}

export interface NewExpense {
  amount_ars: number;
  amount_usd?: number | null;
  usd_rate?: number | null;
  category: string;
  subcategory?: string | null;
  description: string;
  spent_at: string;
  raw_message: string;
  telegram_message_id?: number | null;
}

export function insertExpense(data: NewExpense): Expense {
  const db = getDb();
  const row = db
    .prepare(
      `INSERT INTO expenses
        (amount_ars, amount_usd, usd_rate, category, subcategory, description, spent_at, raw_message, telegram_message_id)
       VALUES
        (@amount_ars, @amount_usd, @usd_rate, @category, @subcategory, @description, @spent_at, @raw_message, @telegram_message_id)
       RETURNING *`,
    )
    .get({
      amount_ars: data.amount_ars,
      amount_usd: data.amount_usd ?? null,
      usd_rate: data.usd_rate ?? null,
      category: data.category,
      subcategory: data.subcategory ?? null,
      description: data.description,
      spent_at: data.spent_at,
      raw_message: data.raw_message,
      telegram_message_id: data.telegram_message_id ?? null,
    }) as Expense;
  return row;
}

export function listRecentExpenses(limit: number): Expense[] {
  const db = getDb();
  return db
    .prepare(
      `SELECT * FROM expenses ORDER BY spent_at DESC, id DESC LIMIT ?`,
    )
    .all(limit) as Expense[];
}

export function getExpenseById(id: number): Expense | null {
  const db = getDb();
  const row = db
    .prepare(`SELECT * FROM expenses WHERE id = ?`)
    .get(id) as Expense | undefined;
  return row ?? null;
}

export function deleteExpense(id: number): boolean {
  const db = getDb();
  const info = db.prepare(`DELETE FROM expenses WHERE id = ?`).run(id);
  return info.changes > 0;
}

export interface ExpenseUpdate {
  amount_ars?: number;
  amount_usd?: number | null;
  category?: string;
  subcategory?: string | null;
  description?: string;
  spent_at?: string;
}

export function updateExpense(id: number, changes: ExpenseUpdate): boolean {
  const keys = Object.keys(changes) as Array<keyof ExpenseUpdate>;
  if (keys.length === 0) return false;
  const db = getDb();
  const setClause = keys.map((k) => `${k} = @${k}`).join(', ');
  const info = db
    .prepare(`UPDATE expenses SET ${setClause} WHERE id = @id`)
    .run({ id, ...changes });
  return info.changes > 0;
}

export function listAllExpenses(): Expense[] {
  const db = getDb();
  return db
    .prepare(`SELECT * FROM expenses ORDER BY spent_at ASC, id ASC`)
    .all() as Expense[];
}

export function listExpensesMissingUsdSince(fromDate: string): Expense[] {
  const db = getDb();
  return db
    .prepare(
      `SELECT * FROM expenses
       WHERE amount_usd IS NULL
         AND spent_at >= ?
       ORDER BY spent_at DESC, id DESC`,
    )
    .all(fromDate) as Expense[];
}

/**
 * Actualiza amount_usd y usd_rate en bulk dentro de una transacción.
 * Devuelve cuántos gastos se modificaron efectivamente.
 */
export function bulkUpdateUsd(
  updates: Array<{ id: number; amount_usd: number; usd_rate: number }>,
): number {
  if (updates.length === 0) return 0;
  const db = getDb();
  const stmt = db.prepare(
    `UPDATE expenses SET amount_usd = ?, usd_rate = ? WHERE id = ?`,
  );
  const tx = db.transaction((items: typeof updates) => {
    let count = 0;
    for (const item of items) {
      const info = stmt.run(item.amount_usd, item.usd_rate, item.id);
      if (info.changes > 0) count++;
    }
    return count;
  });
  return tx(updates);
}

export interface MonthlyAggregate {
  total_ars: number;
  total_usd: number | null;
  count: number;
  by_category: Array<{ category: string; total_ars: number; count: number }>;
}

/**
 * @param monthStart ISO date (YYYY-MM-DD) — inclusive
 * @param monthEnd   ISO date (YYYY-MM-DD) — exclusive
 */
export function monthlyAggregate(
  monthStart: string,
  monthEnd: string,
): MonthlyAggregate {
  const db = getDb();
  const totals = db
    .prepare(
      `SELECT
         COALESCE(SUM(amount_ars), 0) as total_ars,
         SUM(amount_usd) as total_usd,
         COUNT(*) as count
       FROM expenses
       WHERE spent_at >= ? AND spent_at < ?`,
    )
    .get(monthStart, monthEnd) as {
    total_ars: number;
    total_usd: number | null;
    count: number;
  };

  const byCategory = db
    .prepare(
      `SELECT category, SUM(amount_ars) as total_ars, COUNT(*) as count
       FROM expenses
       WHERE spent_at >= ? AND spent_at < ?
       GROUP BY category
       ORDER BY total_ars DESC`,
    )
    .all(monthStart, monthEnd) as Array<{
    category: string;
    total_ars: number;
    count: number;
  }>;

  return {
    total_ars: totals.total_ars,
    total_usd: totals.total_usd,
    count: totals.count,
    by_category: byCategory,
  };
}

export function topExpensesInRange(
  start: string,
  end: string,
  limit: number,
): Expense[] {
  const db = getDb();
  return db
    .prepare(
      `SELECT * FROM expenses
       WHERE spent_at >= ? AND spent_at < ?
       ORDER BY amount_ars DESC
       LIMIT ?`,
    )
    .all(start, end, limit) as Expense[];
}

export function topDaysInRange(
  start: string,
  end: string,
  limit: number,
): Array<{ day: string; total_ars: number; count: number }> {
  const db = getDb();
  return db
    .prepare(
      `SELECT substr(spent_at, 1, 10) as day,
              SUM(amount_ars) as total_ars,
              COUNT(*) as count
       FROM expenses
       WHERE spent_at >= ? AND spent_at < ?
       GROUP BY day
       ORDER BY total_ars DESC
       LIMIT ?`,
    )
    .all(start, end, limit) as Array<{
    day: string;
    total_ars: number;
    count: number;
  }>;
}
