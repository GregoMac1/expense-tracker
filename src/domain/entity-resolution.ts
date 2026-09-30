import { normalizeName } from './normalize';

export interface PersonCandidate {
  id: number;
  canonical_name: string;
  aliases: string[];
}

export type ResolutionResult =
  | { kind: 'found'; personId: number; canonicalName: string }
  | { kind: 'ambiguous'; candidates: PersonCandidate[] }
  | { kind: 'unknown' };

/**
 * Intenta resolver un nombre/alias contra la lista de personas conocidas.
 * - Match exacto (normalizado) contra canonical_name o cualquier alias.
 * - Múltiples matches → ambiguo.
 * - Sin match → unknown.
 */
export function resolvePerson(
  name: string,
  people: PersonCandidate[],
): ResolutionResult {
  const target = normalizeName(name);
  if (!target) return { kind: 'unknown' };

  const matches = people.filter((p) => {
    if (normalizeName(p.canonical_name) === target) return true;
    return p.aliases.some((a) => normalizeName(a) === target);
  });

  if (matches.length === 0) return { kind: 'unknown' };
  if (matches.length === 1) {
    const match = matches[0]!;
    return {
      kind: 'found',
      personId: match.id,
      canonicalName: match.canonical_name,
    };
  }
  return { kind: 'ambiguous', candidates: matches };
}
