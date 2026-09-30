import type TelegramBot from 'node-telegram-bot-api';
import type { Message } from 'node-telegram-bot-api';
import { drainPending } from '../../processor/drain';
import {
  countByStatus,
  resetStuckProcessing,
} from '../../db/repos/pending';

export async function handleProcesar(
  bot: TelegramBot,
  msg: Message,
): Promise<void> {
  // Destrabar mensajes que quedaron en 'processing' (proceso previo murió en el medio).
  const unstuck = resetStuckProcessing();
  if (unstuck > 0) {
    await bot.sendMessage(
      msg.chat.id,
      `🔧 destrabé ${unstuck} mensaje${unstuck === 1 ? '' : 's'} que quedó en "processing".`,
    );
  }

  const counts = countByStatus();
  const pending = counts.pending ?? 0;

  if (pending === 0) {
    await bot.sendMessage(
      msg.chat.id,
      unstuck > 0
        ? 'nada más por procesar'
        : 'no hay mensajes pendientes para procesar',
    );
    return;
  }

  await bot.sendMessage(
    msg.chat.id,
    `🔄 procesando ${pending} mensaje${pending === 1 ? '' : 's'}...`,
  );

  const summary = await drainPending(bot);

  if (summary.stoppedOnError) {
    await bot.sendMessage(
      msg.chat.id,
      `⚠️ procesé ${summary.processed}/${summary.queued}; corté por un error, mirá los logs.`,
    );
    return;
  }

  await bot.sendMessage(
    msg.chat.id,
    `✅ terminé (${summary.processed}/${summary.queued})`,
  );
}
