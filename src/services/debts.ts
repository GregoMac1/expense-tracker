import {
  listAllWithAliases,
  createPerson,
  addAlias,
} from '../db/repos/people';
import { insertDebt, type Debt } from '../db/repos/debts';
import {
  resolvePerson,
  type ResolutionResult,
} from '../domain/entity-resolution';
import { normalizeName } from '../domain/normalize';
import type { DebtExtraction } from '../llm/schemas';
import { logger } from '../logger';

export interface SaveDebtsResult {
  created: Array<{ debt: Debt; personName: string }>;
  notes: string[]; // mensajes para mostrar al usuario (auto-creación / ambigüedad)
}

/**
 * Resuelve cada DebtExtraction del LLM contra las personas del sistema.
 * - Match único → reutiliza persona, agrega alias si el nombre tipeado difiere.
 * - Ambiguo → pickea el primero + nota para el usuario.
 * - Desconocido → crea persona nueva + nota para el usuario.
 */
export function saveDebts(
  expenseId: number,
  debts: DebtExtraction[],
): SaveDebtsResult {
  const result: SaveDebtsResult = { created: [], notes: [] };
  if (debts.length === 0) return result;

  const known = listAllWithAliases();

  for (const d of debts) {
    if (d.amount_ars <= 0) continue;
    const resolution = resolveOrCreate(d.person_name, known);
    if (resolution.note) result.notes.push(resolution.note);
    // Mantener el cache local actualizado para las próximas deudas del mismo mensaje.
    if (resolution.addedToKnown) known.push(resolution.addedToKnown);

    const debt = insertDebt({
      expense_id: expenseId,
      person_id: resolution.personId,
      amount_ars: d.amount_ars,
    });
    result.created.push({ debt, personName: resolution.canonicalName });
  }

  return result;
}

interface ResolveOrCreateResult {
  personId: number;
  canonicalName: string;
  note?: string;
  addedToKnown?: ReturnType<typeof listAllWithAliases>[number];
}

function resolveOrCreate(
  rawName: string,
  known: ReturnType<typeof listAllWithAliases>,
): ResolveOrCreateResult {
  const trimmed = rawName.trim();
  if (!trimmed) {
    throw new Error('empty person name');
  }
  const resolution: ResolutionResult = resolvePerson(trimmed, known);

  if (resolution.kind === 'found') {
    // Si el usuario escribió una variante nueva, guardarla como alias.
    maybeAddAlias(resolution.personId, resolution.canonicalName, trimmed);
    return {
      personId: resolution.personId,
      canonicalName: resolution.canonicalName,
    };
  }

  if (resolution.kind === 'ambiguous') {
    const picked = resolution.candidates[0]!;
    return {
      personId: picked.id,
      canonicalName: picked.canonical_name,
      note: `⚠️ "${trimmed}" matcheó con ${resolution.candidates.length} personas; usé "${picked.canonical_name}". usá /fusionar si corresponde.`,
    };
  }

  // unknown: crear persona con el nombre como lo tipeó el LLM
  const created = createPerson(trimmed);
  logger.info({ personId: created.id, name: trimmed }, 'Created new person');
  return {
    personId: created.id,
    canonicalName: created.canonical_name,
    note: `ℹ️ creé persona nueva: "${created.canonical_name}". si es duplicada usá /fusionar.`,
    addedToKnown: {
      id: created.id,
      canonical_name: created.canonical_name,
      aliases: [],
    },
  };
}

function maybeAddAlias(
  personId: number,
  canonicalName: string,
  rawName: string,
): void {
  const rawNorm = normalizeName(rawName);
  const canonicalNorm = normalizeName(canonicalName);
  if (rawNorm === canonicalNorm || !rawNorm) return;
  addAlias(personId, rawNorm);
}
