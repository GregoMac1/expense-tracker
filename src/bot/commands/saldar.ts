import type TelegramBot from 'node-telegram-bot-api';
import type { Message } from 'node-telegram-bot-api';
import { settleDebt, settleAllForPerson } from '../../db/repos/debts';
import { listAllWithAliases } from '../../db/repos/people';
import { normalizeName } from '../../domain/normalize';

export async function handleSaldar(
  bot: TelegramBot,
  msg: Message,
  args: string[],
): Promise<void> {
  const idArg = args[0];
  if (!idArg) {
    await bot.sendMessage(msg.chat.id, `uso: /saldar <id_deuda>`);
    return;
  }
  const id = parseInt(idArg, 10);
  if (!Number.isFinite(id) || id <= 0) {
    await bot.sendMessage(msg.chat.id, `id inválido: ${idArg}`);
    return;
  }
  const ok = settleDebt(id);
  if (!ok) {
    await bot.sendMessage(
      msg.chat.id,
      `no encontré una deuda pendiente con id #${id}`,
    );
    return;
  }
  await bot.sendMessage(msg.chat.id, `✅ deuda #${id} saldada`);
}

export async function handleSaldarTodo(
  bot: TelegramBot,
  msg: Message,
  args: string[],
): Promise<void> {
  if (args.length === 0) {
    await bot.sendMessage(msg.chat.id, `uso: /saldar_todo <persona>`);
    return;
  }
  const query = args.join(' ');
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
  const count = settleAllForPerson(match.id);
  if (count === 0) {
    await bot.sendMessage(
      msg.chat.id,
      `${match.canonical_name} no tenía deudas pendientes`,
    );
    return;
  }
  await bot.sendMessage(
    msg.chat.id,
    `✅ saldé ${count} deuda${count === 1 ? '' : 's'} de ${match.canonical_name}`,
  );
}
