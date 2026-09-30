import type TelegramBot from 'node-telegram-bot-api';
import type { Message } from 'node-telegram-bot-api';
import { listRecentExpenses } from '../../db/repos/expenses';
import { formatArs, formatDate, formatUsd } from '../format';

const DEFAULT_N = 10;

export async function handleUltimos(
  bot: TelegramBot,
  msg: Message,
  args: string[],
): Promise<void> {
  const parsed = args[0] ? parseInt(args[0], 10) : DEFAULT_N;
  const n = Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_N;

  const items = listRecentExpenses(n);
  if (items.length === 0) {
    await bot.sendMessage(msg.chat.id, 'no hay gastos registrados todavía');
    return;
  }

  const lines = items.map((e) => {
    const sub = e.subcategory ? `/${e.subcategory}` : '';
    const usd = formatUsd(e.amount_usd);
    const usdPart = usd ? ` (${usd})` : '';
    return `#${e.id} · ${formatArs(e.amount_ars)}${usdPart} · ${e.category}${sub} · ${e.description} · ${formatDate(e.spent_at)}`;
  });

  await bot.sendMessage(
    msg.chat.id,
    `últimos ${items.length}:\n\n${lines.join('\n')}`,
  );
}
