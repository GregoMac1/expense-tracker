import type TelegramBot from 'node-telegram-bot-api';
import {
  extractFromMessage,
  saveExtractedExpense,
  OllamaUnavailableError,
  OllamaTimeoutError,
  OllamaHttpError,
} from '../services/expenses';
import { saveDebts } from '../services/debts';
import { getDollarService, convertToUsd } from '../services/dollar';
import {
  updatePendingStatus,
  type PendingMessage,
} from '../db/repos/pending';
import { formatArs, formatDate, formatUsd } from '../bot/format';
import { logger } from '../logger';

export async function processPendingMessage(
  bot: TelegramBot,
  pending: PendingMessage,
): Promise<void> {
  updatePendingStatus(pending.id, 'processing');

  try {
    const result = await extractFromMessage(pending.text, pending.received_at);

    switch (result.kind) {
      case 'not_expense': {
        const desc = result.extraction.description || 'mensaje';
        await bot.sendMessage(
          pending.chat_id,
          `👂 escuché "${desc}". mandame un gasto con monto cuando quieras registrarlo.`,
        );
        updatePendingStatus(pending.id, 'done');
        return;
      }

      case 'needs_clarification': {
        const question =
          result.extraction.clarification_question ??
          'no me quedó claro el gasto. ¿podés darme más detalle?';
        await bot.sendMessage(pending.chat_id, `🤔 ${question}`);
        updatePendingStatus(pending.id, 'done');
        return;
      }

      case 'invalid': {
        logger.error(
          { messageId: pending.telegram_message_id, error: result.error },
          'LLM response could not be parsed',
        );
        await bot.sendMessage(
          pending.chat_id,
          `⚠️ no pude entender la respuesta del LLM. probá reformular.`,
        );
        updatePendingStatus(pending.id, 'failed', result.error);
        return;
      }

      case 'expense': {
        const quote = await getDollarService().getRate();
        const amountUsd =
          quote && result.extraction.amount_ars !== null
            ? convertToUsd(result.extraction.amount_ars, quote.rate)
            : null;

        const expense = saveExtractedExpense({
          extraction: result.extraction,
          rawMessage: pending.text,
          telegramMessageId: pending.telegram_message_id,
          fallbackSpentAt: pending.received_at,
          amountUsd,
          usdRate: quote?.rate ?? null,
        });

        const debtsResult = saveDebts(expense.id, result.extraction.debts);

        const sub = expense.subcategory ? `/${expense.subcategory}` : '';
        const usdLabel = formatUsd(expense.amount_usd);
        const usdPart = usdLabel ? ` (${usdLabel})` : '';
        const lines = [
          `✅ #${expense.id} · ${formatArs(expense.amount_ars)}${usdPart} · ${expense.category}${sub} · ${expense.description} · ${formatDate(expense.spent_at)}`,
        ];

        if (debtsResult.created.length > 0) {
          lines.push('');
          lines.push('deudas:');
          for (const d of debtsResult.created) {
            lines.push(`· ${d.personName} te debe ${formatArs(d.debt.amount_ars)}`);
          }
        }
        for (const note of debtsResult.notes) {
          lines.push('');
          lines.push(note);
        }

        await bot.sendMessage(pending.chat_id, lines.join('\n'));
        updatePendingStatus(pending.id, 'done');
        return;
      }
    }
  } catch (err) {
    // Ollama caído (sin red, DNS, connection refused) → dejar pending para reintento.
    if (err instanceof OllamaUnavailableError) {
      logger.warn(
        { messageId: pending.telegram_message_id },
        'Ollama unavailable, keeping message pending',
      );
      updatePendingStatus(pending.id, 'pending', 'ollama unavailable');
      try {
        await bot.sendMessage(
          pending.chat_id,
          `⏳ Ollama no responde, lo proceso cuando esté disponible.`,
        );
      } catch {
        // swallow
      }
      return;
    }
    // Timeout de nuestro AbortController → el prompt o el modelo se atoró; marcar failed.
    if (err instanceof OllamaTimeoutError) {
      logger.warn(
        { messageId: pending.telegram_message_id, err: err.message },
        'Ollama timed out on prompt',
      );
      updatePendingStatus(pending.id, 'failed', err.message);
      try {
        await bot.sendMessage(
          pending.chat_id,
          `⌛ el LLM tardó demasiado en responder. probá reformular el mensaje más corto, o cambiar a un modelo más liviano/pesado en \`OLLAMA_MODEL\`.`,
        );
      } catch {
        // swallow
      }
      return;
    }
    // Ollama devolvió non-2xx (500, 400, etc.) → fallo del lado del servidor LLM.
    if (err instanceof OllamaHttpError) {
      logger.warn(
        { messageId: pending.telegram_message_id, status: err.status },
        'Ollama HTTP error',
      );
      updatePendingStatus(pending.id, 'failed', err.message);
      try {
        await bot.sendMessage(
          pending.chat_id,
          `⚠️ Ollama devolvió error ${err.status}. mirá la consola de Ollama y probá reformular.`,
        );
      } catch {
        // swallow
      }
      return;
    }
    const errorMsg = err instanceof Error ? err.message : String(err);
    logger.error(
      { err, messageId: pending.telegram_message_id },
      'Processor error',
    );
    updatePendingStatus(pending.id, 'failed', errorMsg);
    try {
      await bot.sendMessage(
        pending.chat_id,
        `⚠️ algo falló procesando el mensaje: ${errorMsg}`,
      );
    } catch {
      // swallow
    }
    throw err;
  }
}
