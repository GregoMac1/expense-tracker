import type TelegramBot from 'node-telegram-bot-api';
import type { Message } from 'node-telegram-bot-api';
import { mergePersons, getPersonById } from '../../db/repos/people';

export async function handleFusionar(
  bot: TelegramBot,
  msg: Message,
  args: string[],
): Promise<void> {
  if (args.length < 2) {
    await bot.sendMessage(
      msg.chat.id,
      `uso: /fusionar <id_que_queda> <id_a_borrar>\n\nej: /fusionar 3 7 → las deudas y aliases de persona #7 se mueven a persona #3, y #7 se borra.`,
    );
    return;
  }
  const keepId = parseInt(args[0] ?? '', 10);
  const mergeId = parseInt(args[1] ?? '', 10);
  if (!Number.isFinite(keepId) || !Number.isFinite(mergeId)) {
    await bot.sendMessage(msg.chat.id, `ids inválidos`);
    return;
  }

  const keep = getPersonById(keepId);
  const merge = getPersonById(mergeId);
  if (!keep || !merge) {
    await bot.sendMessage(
      msg.chat.id,
      `alguna de las personas no existe (#${keepId}, #${mergeId})`,
    );
    return;
  }

  const result = mergePersons(keepId, mergeId);
  if (!result.ok) {
    await bot.sendMessage(
      msg.chat.id,
      `no pude fusionar: ${result.error ?? 'error desconocido'}`,
    );
    return;
  }
  await bot.sendMessage(
    msg.chat.id,
    `✅ "${merge.canonical_name}" fusionada en "${keep.canonical_name}". deudas y aliases migrados.`,
  );
}
