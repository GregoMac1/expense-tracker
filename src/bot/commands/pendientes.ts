import type TelegramBot from 'node-telegram-bot-api';
import type { Message } from 'node-telegram-bot-api';
import { countByStatus } from '../../db/repos/pending';

export async function handlePendientes(
  bot: TelegramBot,
  msg: Message,
): Promise<void> {
  const counts = countByStatus();
  const total = Object.values(counts).reduce((a, b) => a + b, 0);

  if (total === 0) {
    await bot.sendMessage(msg.chat.id, 'no hay mensajes en la cola');
    return;
  }

  const lines = Object.entries(counts)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([status, count]) => `· ${status}: ${count}`);

  await bot.sendMessage(
    msg.chat.id,
    `cola de mensajes:\n${lines.join('\n')}`,
  );
}
