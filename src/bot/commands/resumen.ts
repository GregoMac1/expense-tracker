import type TelegramBot from 'node-telegram-bot-api';
import type { Message } from 'node-telegram-bot-api';
import { monthlyAggregate } from '../../db/repos/expenses';
import { currentMonth, monthRange } from '../../domain/aggregations';
import { formatArs, formatUsd } from '../format';

export async function handleResumen(
  bot: TelegramBot,
  msg: Message,
  args: string[],
): Promise<void> {
  const month = args[0] ?? currentMonth();

  let range;
  try {
    range = monthRange(month);
  } catch {
    await bot.sendMessage(
      msg.chat.id,
      `formato inválido. usá YYYY-MM (ej: /resumen 2026-03)`,
    );
    return;
  }

  const agg = monthlyAggregate(range.start, range.end);

  if (agg.count === 0) {
    await bot.sendMessage(msg.chat.id, `no hay gastos registrados en ${month}`);
    return;
  }

  const usdLabel = formatUsd(agg.total_usd);
  const totalLine = usdLabel
    ? `total: ${formatArs(agg.total_ars)} (${usdLabel}) · ${agg.count} gasto${agg.count === 1 ? '' : 's'}`
    : `total: ${formatArs(agg.total_ars)} · ${agg.count} gasto${agg.count === 1 ? '' : 's'}`;

  const lines = [`📊 resumen ${month}`, '', totalLine];

  if (agg.by_category.length > 0) {
    lines.push('', 'por categoría:');
    for (const c of agg.by_category) {
      const pct = ((c.total_ars / agg.total_ars) * 100).toFixed(0);
      lines.push(`· ${c.category}: ${formatArs(c.total_ars)} (${pct}%)`);
    }
  }

  await bot.sendMessage(msg.chat.id, lines.join('\n'));
}
