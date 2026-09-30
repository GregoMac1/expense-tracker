import type TelegramBot from 'node-telegram-bot-api';
import type { Message } from 'node-telegram-bot-api';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { listAllExpenses } from '../../db/repos/expenses';

export async function handleExportar(
  bot: TelegramBot,
  msg: Message,
): Promise<void> {
  const expenses = listAllExpenses();
  if (expenses.length === 0) {
    await bot.sendMessage(msg.chat.id, 'no hay gastos para exportar');
    return;
  }

  const header = [
    'id',
    'spent_at',
    'amount_ars',
    'amount_usd',
    'usd_rate',
    'category',
    'subcategory',
    'description',
    'raw_message',
    'created_at',
  ];

  const rows = [header.join(',')];
  for (const e of expenses) {
    rows.push(
      [
        e.id,
        e.spent_at,
        e.amount_ars,
        e.amount_usd ?? '',
        e.usd_rate ?? '',
        e.category,
        e.subcategory ?? '',
        e.description,
        e.raw_message,
        e.created_at,
      ]
        .map(csvEscape)
        .join(','),
    );
  }
  const csv = rows.join('\n');

  const exportDir = join(process.cwd(), 'data');
  mkdirSync(exportDir, { recursive: true });
  const filename = `expenses-${new Date().toISOString().slice(0, 10)}.csv`;
  const filePath = join(exportDir, filename);
  writeFileSync(filePath, csv, 'utf8');

  await bot.sendDocument(
    msg.chat.id,
    filePath,
    {},
    { filename, contentType: 'text/csv' },
  );
}

function csvEscape(value: unknown): string {
  if (value === null || value === undefined) return '';
  const s = String(value);
  if (/[",\n]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}
