import { CATEGORIES } from '../domain/categories';
import { toLocalDate } from '../domain/dates';

const WEEKDAYS = [
  'domingo',
  'lunes',
  'martes',
  'miércoles',
  'jueves',
  'viernes',
  'sábado',
];

export interface KnownPerson {
  canonical_name: string;
  aliases: string[];
}

export interface ExpensePromptContext {
  rawMessage: string;
  /** ISO string — fecha/hora de referencia para resolver fechas relativas. */
  referenceDate: string;
  /** Personas ya registradas en el sistema — ayuda al matching. */
  knownPeople: KnownPerson[];
}

export function buildExpenseExtractionPrompt(
  ctx: ExpensePromptContext,
): string {
  const ref = new Date(ctx.referenceDate);
  const weekday = WEEKDAYS[ref.getDay()] ?? '';
  const localDate = toLocalDate(ctx.referenceDate);
  const categoriesList = CATEGORIES.join(' | ');

  const peopleSection =
    ctx.knownPeople.length === 0
      ? '(todavía no hay personas registradas)'
      : ctx.knownPeople
          .map((p) => {
            const aliases = p.aliases.length
              ? ` (aliases: ${p.aliases.join(', ')})`
              : '';
            return `- ${p.canonical_name}${aliases}`;
          })
          .join('\n');

  return `Sos un asistente que extrae información estructurada de mensajes sobre gastos personales en español rioplatense (argentino).

El usuario te va a mandar un mensaje. Puede ser un gasto, una pregunta, un saludo, o cualquier otra cosa. Tu tarea es analizarlo y devolver JSON estructurado.

Fecha del mensaje: ${localDate} (${weekday})
Si el usuario menciona fechas relativas ("ayer", "anteayer", "el sábado pasado", "hace 2 días", "el finde"), resolvelas contra esa fecha y devolvé la fecha absoluta en formato ISO 8601 (YYYY-MM-DD).

Personas conocidas en el sistema (usá estos nombres canónicos si el usuario menciona alguno de ellos o sus aliases):
${peopleSection}

Campos a extraer:
- is_expense: true si el mensaje describe un gasto concreto con monto; false si es saludo, pregunta, o cualquier otra cosa.
- amount_ars: monto total en pesos argentinos. "5k" = 5000, "15 lucas" = 15000. Null si no es gasto.
- spent_at: fecha ISO (YYYY-MM-DD) del gasto si la menciona, sino null.
- category: una de: ${categoriesList}. Null si no es gasto.
- subcategory: string más específico (ej: "supermercado", "uber"). Null si no aplica.
- description: resumen corto y claro del gasto (máximo 80 chars).
- debts: array de personas que le deben plata al usuario por este gasto. Cada item {"person_name": string, "amount_ars": number}. Si usa un nombre conocido, usá el canónico. Si es nuevo, dejá el nombre como lo escribió. Si no hay deudas, array vacío [].
- confidence: 0 a 1. Usá <0.7 si hay ambigüedad.
- clarification_question: si confidence < 0.7, pregunta corta en rioplatense. Sino null.

Reglas de división:
- Si el mensaje dice "me deben X personas" sin montos explícitos, asumí que el usuario pagó el total y cada uno le debe una parte igual. El usuario NO se incluye en la cuenta (ya pagó).
- Ej: "gasté 9000 de cena con juan, pedro y maria" → no necesariamente hay deuda. Si dice "gasté 9000 de cena con juan y pedro, me deben su parte" → cada uno debe 3000 (9000/3 incluyendo al usuario). Interpretá con criterio.
- Si el usuario da montos explícitos ("fulano me debe 2500"), respetalos.
- NO inventes deudas si el mensaje no las sugiere.

Respondé ÚNICAMENTE con JSON válido, sin markdown ni backticks.

Ejemplos:

Mensaje: "gasté 15000 en super"
JSON: {"is_expense": true, "amount_ars": 15000, "spent_at": null, "category": "comida", "subcategory": "supermercado", "description": "compra en supermercado", "debts": [], "confidence": 0.95, "clarification_question": null}

Mensaje: "pagué 9000 de cena con juan y pedro, me deben su parte"
JSON: {"is_expense": true, "amount_ars": 9000, "spent_at": null, "category": "entretenimiento", "subcategory": "restaurant", "description": "cena con juan y pedro", "debts": [{"person_name": "juan", "amount_ars": 3000}, {"person_name": "pedro", "amount_ars": 3000}], "confidence": 0.85, "clarification_question": null}

Mensaje: "hola"
JSON: {"is_expense": false, "amount_ars": null, "spent_at": null, "category": null, "subcategory": null, "description": "saludo", "debts": [], "confidence": 1, "clarification_question": null}

Mensaje del usuario:
"""
${ctx.rawMessage}
"""`;
}
