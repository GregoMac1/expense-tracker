import type TelegramBot from 'node-telegram-bot-api';
import type { Message } from 'node-telegram-bot-api';
import { totalsByPerson, listDebtsByPerson } from '../../db/repos/debts';
import { listAllWithAliases } from '../../db/repos/people';
import { normalizeName } from '../../domain/normalize';
import { formatArs, formatDate } from '../format';

export async function handleDeudas(
  bot: TelegramBot,
  msg: Message,
  args: string[],
): Promise<void> {
  if (args.length === 0) {
    await listAllDebts(bot, msg);
    return;
  }
  const query = args.join(' ');
  await listForPerson(bot, msg, query);
}

async function listAllDebts(bot: TelegramBot, msg: Message): Promise<void> {
  const totals = totalsByPerson();
  if (totals.length === 0) {
    await bot.sendMessage(msg.chat.id, 'no hay deudas pendientes 🎉');
    return;
  }
  const grandTotal = totals.reduce((sum, t) => sum + t.total_ars, 0);
  const lines = [
    `💰 te deben ${formatArs(grandTotal)} en total:`,
    '',
    ...totals.map(
      (t) =>
        `· ${t.person_name}: ${formatArs(t.total_ars)} (${t.count} deuda${t.count === 1 ? '' : 's'})`,
    ),
    '',
    'detalle: /deuda <persona>',
  ];
  await bot.sendMessage(msg.chat.id, lines.join('\n'));
}

async function listForPerson(
  bot: TelegramBot,
  msg: Message,
  query: string,
): Promise<void> {
  const people = listAllWithAliases();
  const normalized = normalizeName(query);
  const match = people.find(
    (p) =>
      normalizeName(p.canonical_name) === normalized ||
      p.aliases.some((a) => normalizeName(a) === normalized),
  );

  if (!match) {
    await bot.sendMessage(msg.chat.id, `no encontré a "${query}"`);
    return;
  }

  const debts = listDebtsByPerson(match.id);
  if (debts.length === 0) {
    await bot.sendMessage(
      msg.chat.id,
      `${match.canonical_name} no tiene deudas pendientes`,
    );
    return;
  }

  const total = debts.reduce((sum, d) => sum + d.amount_ars, 0);
  const lines = [
    `💰 ${match.canonical_name} te debe ${formatArs(total)}:`,
    '',
    ...debts.map(
      (d) =>
        `deuda #${d.id} · ${formatArs(d.amount_ars)} · ${d.expense_description} · ${formatDate(d.expense_spent_at)}`,
    ),
    '',
    `/saldar <id> — saldar una deuda puntual`,
    `/saldar_todo ${match.canonical_name.split(' ')[0]?.toLowerCase() ?? 'persona'} — saldar todas`,
  ];
  await bot.sendMessage(msg.chat.id, lines.join('\n'));
}
