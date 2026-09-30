import { isCategory } from './categories';

export type EditableField =
  | 'monto'
  | 'categoria'
  | 'subcategoria'
  | 'descripcion'
  | 'fecha';

export interface ParsedEdits {
  amount_ars?: number;
  category?: string;
  subcategory?: string | null;
  description?: string;
  spent_at?: string;
}

export interface EditParseError {
  field: string;
  message: string;
}

export type EditParseResult =
  | { ok: true; edits: ParsedEdits }
  | { ok: false; errors: EditParseError[] };

const FIELDS: EditableField[] = [
  'monto',
  'categoria',
  'subcategoria',
  'descripcion',
  'fecha',
];

/**
 * Parsea tokens del tipo "campo=valor" admitiendo valores con espacios
 * (tokens sin "=" se concatenan al valor del campo anterior).
 *
 * Ej: ["monto=18000", "descripcion=cena", "con", "pedro"]
 *     → { amount_ars: 18000, description: "cena con pedro" }
 */
export function parseEdits(tokens: string[]): EditParseResult {
  const raw = new Map<string, string>();
  let currentField: string | null = null;

  for (const tok of tokens) {
    const eqIdx = tok.indexOf('=');
    if (eqIdx > 0) {
      const field = tok.slice(0, eqIdx);
      const value = tok.slice(eqIdx + 1);
      raw.set(field, value);
      currentField = field;
    } else if (currentField) {
      raw.set(currentField, `${raw.get(currentField) ?? ''} ${tok}`.trim());
    } else {
      // ignorar tokens sueltos antes de ver un campo
    }
  }

  const edits: ParsedEdits = {};
  const errors: EditParseError[] = [];

  for (const [field, value] of raw) {
    if (!FIELDS.includes(field as EditableField)) {
      errors.push({
        field,
        message: `campo desconocido; válidos: ${FIELDS.join(', ')}`,
      });
      continue;
    }
    const validation = validateField(field as EditableField, value, edits);
    if (validation) errors.push(validation);
  }

  if (errors.length > 0) return { ok: false, errors };
  if (Object.keys(edits).length === 0) {
    return {
      ok: false,
      errors: [{ field: '', message: 'no se especificó ningún cambio' }],
    };
  }
  return { ok: true, edits };
}

function validateField(
  field: EditableField,
  value: string,
  edits: ParsedEdits,
): EditParseError | null {
  const trimmed = value.trim();
  switch (field) {
    case 'monto': {
      // Solo stripear símbolos de formato (pesos, comas, espacios) — NO signos.
      const cleaned = trimmed.replace(/[$,\s]/g, '');
      const n = Number(cleaned);
      if (!Number.isFinite(n) || n <= 0) {
        return { field, message: `monto inválido: "${trimmed}"` };
      }
      edits.amount_ars = n;
      return null;
    }
    case 'categoria': {
      const lower = trimmed.toLowerCase();
      if (!isCategory(lower)) {
        return { field, message: `categoría desconocida: "${trimmed}"` };
      }
      edits.category = lower;
      return null;
    }
    case 'subcategoria': {
      edits.subcategory = trimmed === '' || trimmed === 'null' ? null : trimmed;
      return null;
    }
    case 'descripcion': {
      if (trimmed === '') {
        return { field, message: 'descripción vacía' };
      }
      edits.description = trimmed;
      return null;
    }
    case 'fecha': {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
        return { field, message: `fecha debe ser YYYY-MM-DD, no "${trimmed}"` };
      }
      edits.spent_at = trimmed;
      return null;
    }
  }
}
