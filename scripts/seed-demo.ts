/**
 * Genera una DB de demo con ~2 meses de gastos realistas, personas y deudas.
 * Uso: npm run seed:demo  (después: npm run demo)
 *
 * Solo corre si DB_PATH apunta a un archivo de demo, para no pisar la DB real.
 */
import { rmSync } from 'node:fs';
import { loadConfig } from '../src/config';
import { getDb, closeDb } from '../src/db/connection';
import { migrate } from '../src/db/migrate';
import { getDollarService, convertToUsd } from '../src/services/dollar';
import { toLocalDate } from '../src/domain/dates';

const FALLBACK_RATE = 1450;

// [días atrás, monto, categoría, subcategoría, descripción, mensaje original, deudas]
type Row = [number, number, string, string | null, string, string, [string, number][]?];

const EXPENSES: Row[] = [
  // septiembre (mes actual)
  [0, 4500, 'transporte', 'uber', 'uber al centro', 'uber 4500'],
  [1, 32000, 'comida', 'supermercado', 'compra en el super', 'gasté 32 lucas en el super'],
  [1, 24000, 'comida', 'pizza', 'pizza con juan y caro', 'ayer pagué 24000 de pizza con juan y caro, me deben su parte', [['Juan', 8000], ['Carolina', 8000]]],
  [2, 3200, 'comida', 'cafe', 'café y medialunas', 'café con medialunas 3200'],
  [3, 18500, 'servicios', 'internet', 'factura de internet', 'pagué internet 18500'],
  [4, 45000, 'deportes', 'gimnasio', 'cuota del gimnasio', 'cuota gym 45k'],
  [5, 12000, 'entretenimiento', 'cine', 'cine con sofi', 'cine con sofi 12000, me debe la mitad', [['Sofía', 6000]]],
  [6, 2800, 'transporte', 'sube', 'carga de sube', 'cargué 2800 de sube'],
  [7, 27500, 'comida', 'supermercado', 'compra en el chino', 'chino 27500'],
  [8, 68000, 'ropa', 'zapatillas', 'zapatillas', 'me compré unas zapas 68 lucas'],
  [9, 9800, 'salud', 'farmacia', 'farmacia', 'farmacia 9800'],
  [10, 36000, 'comida', 'restaurant', 'asado con amigos', 'asado 36000 con juan, fede y caro, me deben su parte', [['Juan', 9000], ['Federico', 9000], ['Carolina', 9000]]],
  [11, 5200, 'transporte', 'uber', 'uber a casa', 'uber 5200 volviendo'],
  [12, 14000, 'entretenimiento', 'streaming', 'spotify + netflix', 'spotify y netflix 14k'],
  [13, 21000, 'comida', 'delivery', 'sushi delivery', 'pedí sushi 21000'],
  [15, 89000, 'tecnologia', 'auriculares', 'auriculares bluetooth', 'auris nuevos 89 lucas'],
  [16, 3500, 'comida', 'cafe', 'café', 'cafecito 3500'],
  [17, 29000, 'comida', 'supermercado', 'compra en el super', 'super 29k'],
  [18, 16000, 'regalos', 'cumpleaños', 'regalo cumple de sofi', 'regalo para sofi 16000'],
  [20, 7400, 'transporte', 'nafta', 'nafta', 'nafta 7400'],
  [21, 42000, 'hogar', 'limpieza', 'artículos de limpieza', 'cosas de limpieza 42k'],
  [23, 11000, 'comida', 'delivery', 'hamburguesas', 'burgers 11000'],
  [25, 25000, 'servicios', 'luz', 'factura de luz', 'luz 25000'],
  [27, 6000, 'educacion', 'libro', 'libro', 'libro 6 lucas'],
  // agosto (mes anterior, para comparar)
  [31, 30000, 'comida', 'supermercado', 'compra en el super', 'super 30000'],
  [33, 45000, 'deportes', 'gimnasio', 'cuota del gimnasio', 'gym 45k'],
  [34, 18500, 'servicios', 'internet', 'factura de internet', 'internet 18500'],
  [36, 15000, 'entretenimiento', 'bar', 'birras con fede', 'birras con fede 15000, me debe 7500', [['Federico', 7500]]],
  [38, 4100, 'transporte', 'uber', 'uber', 'uber 4100'],
  [40, 26000, 'comida', 'supermercado', 'compra en el super', 'super 26 lucas'],
  [42, 14000, 'entretenimiento', 'streaming', 'spotify + netflix', 'streaming 14000'],
  [45, 120000, 'viajes', 'micro', 'pasajes a córdoba', 'pasajes a córdoba 120k'],
  [47, 19000, 'comida', 'delivery', 'pizza delivery', 'pizza 19000'],
  [50, 23000, 'servicios', 'luz', 'factura de luz', 'luz 23000'],
  [53, 2800, 'transporte', 'sube', 'carga de sube', 'sube 2800'],
  [55, 31000, 'comida', 'supermercado', 'compra en el super', 'super 31k'],
  [57, 8500, 'salud', 'farmacia', 'farmacia', 'farmacia 8500'],
];

const PEOPLE: Record<string, string[]> = {
  Juan: ['juan', 'juancho'],
  Carolina: ['caro', 'carolina'],
  Sofía: ['sofi', 'sofia'],
  Federico: ['fede', 'federico'],
};

// Deudas ya saldadas, para que /deudas no muestre todo pendiente.
const SETTLED = new Set(['Federico:birras con fede']);

async function main(): Promise<void> {
  const config = loadConfig();
  if (!config.DB_PATH.includes('demo')) {
    console.error(`DB_PATH=${config.DB_PATH} no parece una DB de demo. Abortando.`);
    process.exit(1);
  }

  for (const suffix of ['', '-wal', '-shm']) {
    rmSync(config.DB_PATH + suffix, { force: true });
  }
  migrate();
  const db = getDb();

  const quote = await getDollarService().getRate().catch(() => null);
  const rate = quote?.rate ?? FALLBACK_RATE;

  const personIds = new Map<string, number>();
  const insertPerson = db.prepare(`INSERT INTO people (canonical_name) VALUES (?) RETURNING id`);
  const insertAlias = db.prepare(`INSERT INTO person_aliases (person_id, alias) VALUES (?, ?)`);
  for (const [name, aliases] of Object.entries(PEOPLE)) {
    const { id } = insertPerson.get(name) as { id: number };
    personIds.set(name, id);
    for (const a of aliases) insertAlias.run(id, a);
  }

  const insertExpense = db.prepare(
    `INSERT INTO expenses (amount_ars, amount_usd, usd_rate, category, subcategory, description, spent_at, raw_message)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?) RETURNING id`,
  );
  const insertDebt = db.prepare(
    `INSERT INTO debts (expense_id, person_id, amount_ars, status, settled_at) VALUES (?, ?, ?, ?, ?)`,
  );

  const now = Date.now();
  db.transaction(() => {
    for (const [daysAgo, amount, category, sub, desc, raw, debts = []] of EXPENSES) {
      const spentAt = toLocalDate(new Date(now - daysAgo * 86_400_000).toISOString());
      const { id } = insertExpense.get(
        amount, convertToUsd(amount, rate), rate, category, sub, desc, spentAt, raw,
      ) as { id: number };
      for (const [person, debtAmount] of debts) {
        const settled = SETTLED.has(`${person}:${desc}`);
        insertDebt.run(id, personIds.get(person), debtAmount, settled ? 'settled' : 'pending', settled ? spentAt : null);
      }
    }
  })();

  console.log(`✅ demo DB en ${config.DB_PATH}: ${EXPENSES.length} gastos, ${personIds.size} personas (USD a ${rate}${quote ? '' : ' — cotización de fallback'})`);
  closeDb();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
