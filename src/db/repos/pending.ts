import { getDb } from '../connection';

export type PendingStatus =
  | 'pending'
  | 'processing'
  | 'done'
  | 'failed'
  | 'needs_confirmation';

export interface PendingMessage {
  id: number;
  telegram_message_id: number;
  chat_id: number;
  text: string;
  received_at: string;
  status: PendingStatus;
  error: string | null;
  attempts: number;
  confirmation_question: string | null;
  confirmation_context_json: string | null;
}

export interface NewPendingMessage {
  telegram_message_id: number;
  chat_id: number;
  text: string;
  received_at: string;
}

export function insertPending(msg: NewPendingMessage): PendingMessage | null {
  const db = getDb();
  const row = db
    .prepare(
      `INSERT INTO pending_messages (telegram_message_id, chat_id, text, received_at)
       VALUES (@telegram_message_id, @chat_id, @text, @received_at)
       ON CONFLICT(telegram_message_id) DO NOTHING
       RETURNING *`,
    )
    .get(msg) as PendingMessage | undefined;
  return row ?? null;
}

export function updatePendingStatus(
  id: number,
  status: PendingStatus,
  error?: string,
): void {
  const db = getDb();
  db.prepare(
    `UPDATE pending_messages
     SET status = ?, error = ?
     WHERE id = ?`,
  ).run(status, error ?? null, id);
}

export function listPending(
  status: PendingStatus = 'pending',
): PendingMessage[] {
  const db = getDb();
  return db
    .prepare(
      `SELECT * FROM pending_messages WHERE status = ? ORDER BY received_at ASC`,
    )
    .all(status) as PendingMessage[];
}

/**
 * Resetea mensajes que quedaron en 'processing' huérfanos (el proceso
 * murió antes de terminar). Devuelve cuántos se reestablecieron.
 *
 * Nota: hay un race chico si se corre mientras otro handler está activamente
 * procesando un mensaje. En uso personal (~decenas de msg/día) es improbable.
 */
export function resetStuckProcessing(): number {
  const db = getDb();
  const info = db
    .prepare(
      `UPDATE pending_messages
       SET status = 'pending', error = 'auto-unstuck from processing'
       WHERE status = 'processing'`,
    )
    .run();
  return info.changes;
}

export function countByStatus(): Record<string, number> {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT status, COUNT(*) as count FROM pending_messages GROUP BY status`,
    )
    .all() as Array<{ status: string; count: number }>;
  return Object.fromEntries(rows.map((r) => [r.status, r.count]));
}
