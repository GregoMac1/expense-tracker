import { getDb } from '../connection';

export type DebtStatus = 'pending' | 'settled' | 'cancelled';

export interface Debt {
  id: number;
  expense_id: number;
  person_id: number;
  amount_ars: number;
  status: DebtStatus;
  settled_at: string | null;
  notes: string | null;
}

export interface NewDebt {
  expense_id: number;
  person_id: number;
  amount_ars: number;
  notes?: string | null;
}

export function insertDebt(data: NewDebt): Debt {
  const db = getDb();
  const row = db
    .prepare(
      `INSERT INTO debts (expense_id, person_id, amount_ars, notes)
       VALUES (@expense_id, @person_id, @amount_ars, @notes)
       RETURNING *`,
    )
    .get({
      expense_id: data.expense_id,
      person_id: data.person_id,
      amount_ars: data.amount_ars,
      notes: data.notes ?? null,
    }) as Debt;
  return row;
}

export interface DebtWithContext {
  id: number;
  expense_id: number;
  person_id: number;
  person_name: string;
  amount_ars: number;
  status: DebtStatus;
  settled_at: string | null;
  notes: string | null;
  expense_description: string;
  expense_spent_at: string;
}

export function listPendingDebts(): DebtWithContext[] {
  const db = getDb();
  return db
    .prepare(
      `SELECT
         d.id, d.expense_id, d.person_id, p.canonical_name as person_name,
         d.amount_ars, d.status, d.settled_at, d.notes,
         e.description as expense_description, e.spent_at as expense_spent_at
       FROM debts d
       JOIN people p ON p.id = d.person_id
       JOIN expenses e ON e.id = d.expense_id
       WHERE d.status = 'pending'
       ORDER BY e.spent_at DESC, d.id DESC`,
    )
    .all() as DebtWithContext[];
}

export function listDebtsByPerson(personId: number): DebtWithContext[] {
  const db = getDb();
  return db
    .prepare(
      `SELECT
         d.id, d.expense_id, d.person_id, p.canonical_name as person_name,
         d.amount_ars, d.status, d.settled_at, d.notes,
         e.description as expense_description, e.spent_at as expense_spent_at
       FROM debts d
       JOIN people p ON p.id = d.person_id
       JOIN expenses e ON e.id = d.expense_id
       WHERE d.person_id = ? AND d.status = 'pending'
       ORDER BY e.spent_at DESC, d.id DESC`,
    )
    .all(personId) as DebtWithContext[];
}

export interface DebtTotal {
  person_id: number;
  person_name: string;
  total_ars: number;
  count: number;
}

export function totalsByPerson(): DebtTotal[] {
  const db = getDb();
  return db
    .prepare(
      `SELECT
         p.id as person_id,
         p.canonical_name as person_name,
         SUM(d.amount_ars) as total_ars,
         COUNT(*) as count
       FROM debts d
       JOIN people p ON p.id = d.person_id
       WHERE d.status = 'pending'
       GROUP BY p.id
       ORDER BY total_ars DESC`,
    )
    .all() as DebtTotal[];
}

export function settleDebt(id: number): boolean {
  const db = getDb();
  const info = db
    .prepare(
      `UPDATE debts
       SET status = 'settled', settled_at = datetime('now')
       WHERE id = ? AND status = 'pending'`,
    )
    .run(id);
  return info.changes > 0;
}

export function settleAllForPerson(personId: number): number {
  const db = getDb();
  const info = db
    .prepare(
      `UPDATE debts
       SET status = 'settled', settled_at = datetime('now')
       WHERE person_id = ? AND status = 'pending'`,
    )
    .run(personId);
  return info.changes;
}
