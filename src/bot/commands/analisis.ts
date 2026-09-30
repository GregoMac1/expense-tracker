import type TelegramBot from 'node-telegram-bot-api';
import type { Message } from 'node-telegram-bot-api';
import {
  computeStats,
  generateAnalysis,
  OllamaUnavailableError,
  OllamaTimeoutError,
  OllamaHttpError,
} from '../../services/analysis';
import { currentMonth } from '../../domain/aggregations';

export async function handleAnalisis(
  bot: TelegramBot,
  msg: Message,
  args: string[],
): Promise<void> {
  const month = args[0] ?? currentMonth();

  let stats;
  try {
    stats = computeStats(month);
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    await bot.sendMessage(msg.chat.id, `formato inválido: ${errorMsg}`);
    return;
  }

  if (stats.count === 0) {
    await bot.sendMessage(
      msg.chat.id,
      `no hay gastos en ${month} para analizar`,
    );
    return;
  }

  await bot.sendMessage(
    msg.chat.id,
    `🧠 pensando... (puede tardar unos segundos)`,
  );

  try {
    const analysis = await generateAnalysis(stats);
    await bot.sendMessage(msg.chat.id, `📊 análisis de ${month}:\n\n${analysis}`);
  } catch (err) {
    if (err instanceof OllamaUnavailableError) {
      await bot.sendMessage(
        msg.chat.id,
        `⏳ Ollama no responde, probá de nuevo en un rato`,
      );
      return;
    }
    if (err instanceof OllamaTimeoutError) {
      await bot.sendMessage(
        msg.chat.id,
        `⌛ el análisis tardó demasiado. probá con un modelo más rápido o con un mes más chico.`,
      );
      return;
    }
    if (err instanceof OllamaHttpError) {
      await bot.sendMessage(
        msg.chat.id,
        `⚠️ Ollama devolvió error ${err.status}.`,
      );
      return;
    }
    const errorMsg = err instanceof Error ? err.message : String(err);
    await bot.sendMessage(msg.chat.id, `⚠️ falló el análisis: ${errorMsg}`);
  }
}
