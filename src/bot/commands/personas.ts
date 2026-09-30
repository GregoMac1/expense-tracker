import type TelegramBot from 'node-telegram-bot-api';
import type { Message } from 'node-telegram-bot-api';
import { listAllWithAliases } from '../../db/repos/people';

export async function handlePersonas(
  bot: TelegramBot,
  msg: Message,
): Promise<void> {
  const people = listAllWithAliases();
  if (people.length === 0) {
    await bot.sendMessage(msg.chat.id, 'todavía no hay personas registradas');
    return;
  }
  const lines = [
    `👥 personas registradas:`,
    '',
    ...people.map((p) => {
      const aliases = p.aliases.length ? ` — aliases: ${p.aliases.join(', ')}` : '';
      return `#${p.id} · ${p.canonical_name}${aliases}`;
    }),
    '',
    '/fusionar <id_que_queda> <id_a_borrar> — fusiona duplicados',
  ];
  await bot.sendMessage(msg.chat.id, lines.join('\n'));
}
