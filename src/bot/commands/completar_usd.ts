import type TelegramBot from 'node-telegram-bot-api';
import type { Message } from 'node-telegram-bot-api';
import {
  listExpensesMissingUsdSince,
  bulkUpdateUsd,
} from '../../db/repos/expenses';
import { getDollarService, convertToUsd } from '../../services/dollar';
import { formatArs } from '../format';

export async function handleCompletarUsd(
  bot: TelegramBot,
  msg: Message,
  args: string[],
): Promise<void> {
  const fecha = args[0];
  if (!fecha) {
    await bot.sendMessage(
      msg.chat.id,
      `uso: /completar_usd <YYYY-MM-DD>\n\nrellena amount_usd en todos los gastos desde esa fecha hasta hoy, usando la cotización actual.\n\nej: /completar_usd 2026-01-01`,
    );
    return;
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
    await bot.sendMessage(
      msg.chat.id,
      `fecha inválida: "${fecha}". formato esperado: YYYY-MM-DD`,
    );
    return;
  }

  const missing = listExpensesMissingUsdSince(fecha);
  if (missing.length === 0) {
    await bot.sendMessage(
      msg.chat.id,
      `no hay gastos sin USD desde ${fecha} 👍`,
    );
    return;
  }

  const quote = await getDollarService().getRate();
  if (!quote) {
    await bot.sendMessage(
      msg.chat.id,
      `⏳ no pude obtener la cotización del dólar. probá en un rato.`,
    );
    return;
  }

  const updates = missing.map((e) => ({
    id: e.id,
    amount_usd: convertToUsd(e.amount_ars, quote.rate),
    usd_rate: quote.rate,
  }));

  const updated = bulkUpdateUsd(updates);

  await bot.sendMessage(
    msg.chat.id,
    `✅ completé USD en ${updated} gasto${updated === 1 ? '' : 's'} usando la cotización actual (${formatArs(quote.rate)} / USD).\n\n⚠️ todos se calcularon con la cotización de hoy, no la del día del gasto.`,
  );
}
