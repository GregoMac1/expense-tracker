import type TelegramBot from 'node-telegram-bot-api';
import { listPending } from '../db/repos/pending';
import { processPendingMessage } from './process-message';
import { logger } from '../logger';

export interface DrainSummary {
  queued: number;
  processed: number;
  stoppedOnError: boolean;
}

/**
 * Drena los mensajes con status 'pending' secuencialmente.
 * Si el processor frena por un error, corta el drain (el mensaje queda pending o failed según el caso).
 */
export async function drainPending(bot: TelegramBot): Promise<DrainSummary> {
  const queue = listPending('pending');
  if (queue.length === 0) {
    return { queued: 0, processed: 0, stoppedOnError: false };
  }

  logger.info({ count: queue.length }, 'Draining pending messages');

  let processed = 0;
  for (const msg of queue) {
    try {
      await processPendingMessage(bot, msg);
      processed++;
    } catch (err) {
      logger.error(
        { err, messageId: msg.telegram_message_id },
        'Drain stopped on error, will retry next cycle',
      );
      return { queued: queue.length, processed, stoppedOnError: true };
    }
  }
  return { queued: queue.length, processed, stoppedOnError: false };
}
