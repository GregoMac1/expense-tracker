import { getDb } from '../connection';
import { normalizeName } from '../../domain/normalize';
import type { PersonCandidate } from '../../domain/entity-resolution';

export interface Person {
  id: number;
  canonical_name: string;
  created_at: string;
}

export interface PersonAlias {
  id: number;
  person_id: number;
  alias: string;
}

export function listAllWithAliases(): PersonCandidate[] {
  const db = getDb();
  const people = db.prepare(`SELECT * FROM people ORDER BY id`).all() as Person[];
  const aliases = db
    .prepare(`SELECT * FROM person_aliases ORDER BY id`)
    .all() as PersonAlias[];

  const byPerson = new Map<number, string[]>();
  for (const a of aliases) {
    const arr = byPerson.get(a.person_id) ?? [];
    arr.push(a.alias);
    byPerson.set(a.person_id, arr);
  }

  return people.map((p) => ({
    id: p.id,
    canonical_name: p.canonical_name,
    aliases: byPerson.get(p.id) ?? [],
  }));
}

export function getPersonById(id: number): Person | null {
  const db = getDb();
  const row = db
    .prepare(`SELECT * FROM people WHERE id = ?`)
    .get(id) as Person | undefined;
  return row ?? null;
}

export function createPerson(canonicalName: string): Person {
  const db = getDb();
  const row = db
    .prepare(
      `INSERT INTO people (canonical_name) VALUES (?) RETURNING *`,
    )
    .get(canonicalName) as Person;
  return row;
}

/**
 * Crea un alias. Si ya existe (UNIQUE), retorna el alias existente sin cambiar nada.
 * Si ya existe PERO apunta a otra persona, retorna null (caller decide qué hacer).
 */
export function addAlias(personId: number, alias: string): PersonAlias | null {
  const db = getDb();
  const normalized = normalizeName(alias);
  const existing = db
    .prepare(`SELECT * FROM person_aliases WHERE alias = ?`)
    .get(normalized) as PersonAlias | undefined;
  if (existing) {
    return existing.person_id === personId ? existing : null;
  }
  const row = db
    .prepare(
      `INSERT INTO person_aliases (person_id, alias) VALUES (?, ?) RETURNING *`,
    )
    .get(personId, normalized) as PersonAlias;
  return row;
}

/**
 * Fusiona person2 en person1: mueve debts y aliases de person2 a person1, agrega
 * canonical_name de person2 como alias de person1, y borra person2.
 */
export function mergePersons(
  keepId: number,
  mergeId: number,
): { ok: boolean; error?: string } {
  if (keepId === mergeId) {
    return { ok: false, error: 'mismo id' };
  }
  const db = getDb();
  const keep = getPersonById(keepId);
  const merge = getPersonById(mergeId);
  if (!keep || !merge) {
    return { ok: false, error: 'alguna de las personas no existe' };
  }

  const tx = db.transaction(() => {
    db.prepare(`UPDATE debts SET person_id = ? WHERE person_id = ?`).run(
      keepId,
      mergeId,
    );
    db.prepare(
      `UPDATE person_aliases SET person_id = ? WHERE person_id = ?`,
    ).run(keepId, mergeId);
    // Agregar canonical_name del borrado como alias del que queda (si no existe).
    const mergedAlias = normalizeName(merge.canonical_name);
    const exists = db
      .prepare(`SELECT 1 FROM person_aliases WHERE alias = ?`)
      .get(mergedAlias);
    if (!exists) {
      db.prepare(
        `INSERT INTO person_aliases (person_id, alias) VALUES (?, ?)`,
      ).run(keepId, mergedAlias);
    }
    db.prepare(`DELETE FROM people WHERE id = ?`).run(mergeId);
  });
  tx();
  return { ok: true };
}
