import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { getDb } from './connection';
import { logger } from '../logger';

export function migrate(): void {
  const db = getDb();

  db.exec(`
    CREATE TABLE IF NOT EXISTS _migrations (
      name TEXT PRIMARY KEY,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  const migrationsDir = join(__dirname, 'migrations');
  const files = readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  const appliedRows = db
    .prepare('SELECT name FROM _migrations')
    .all() as Array<{ name: string }>;
  const applied = new Set(appliedRows.map((r) => r.name));

  const insert = db.prepare('INSERT INTO _migrations (name) VALUES (?)');

  for (const file of files) {
    if (applied.has(file)) continue;
    const sql = readFileSync(join(migrationsDir, file), 'utf8');
    logger.info({ migration: file }, 'Applying migration');
    const run = db.transaction(() => {
      db.exec(sql);
      insert.run(file);
    });
    run();
  }
}
