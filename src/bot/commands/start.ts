import type TelegramBot from 'node-telegram-bot-api';
import type { Message } from 'node-telegram-bot-api';

export async function handleStart(
  bot: TelegramBot,
  msg: Message,
): Promise<void> {
  await bot.sendMessage(
    msg.chat.id,
    `buenas 👋 soy tu tracker de gastos.

mandame un mensaje describiendo un gasto (ej: "gasté 15000 en supermercado") y lo registro.

mirá /help para ver los comandos.`,
  );
}
