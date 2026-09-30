import TelegramBot from 'node-telegram-bot-api';
import { loadConfig } from '../config';
import { logger } from '../logger';
import { handleMessage } from './router';

interface PollingError extends Error {
  code?: string;
}

const INITIAL_RESTART_DELAY_MS = 5_000;
const MAX_RESTART_DELAY_MS = 60_000;
const HEALTH_CHECK_INTERVAL_MS = 60_000;

const RECOVERABLE_CODES = new Set([
  'EFATAL',
  'ETIMEDOUT',
  'ECONNRESET',
  'ECONNREFUSED',
  'ENETUNREACH',
  'ENOTFOUND',
  'EAI_AGAIN',
]);

export function startBot(): TelegramBot {
  const config = loadConfig();
  const bot = new TelegramBot(config.TELEGRAM_BOT_TOKEN, {
    polling: {
      interval: 1000,
      autoStart: true,
      params: { timeout: 10 },
    },
  });

  let restartTimer: NodeJS.Timeout | null = null;
  let restartDelay = INITIAL_RESTART_DELAY_MS;
  let isRestarting = false;

  const doRestart = async (): Promise<void> => {
    if (isRestarting) return;
    isRestarting = true;
    try {
      logger.warn({ delayMs: restartDelay }, 'Forcing Telegram polling restart');
      // Stop + start asegura estado limpio; `isPolling()` no es confiable post-suspend.
      await bot.stopPolling({ cancel: true }).catch((err: unknown) => {
        logger.debug({ err }, 'stopPolling during restart (ignored)');
      });
      await bot.startPolling({ restart: false });
      logger.info('Polling restarted');
      restartDelay = INITIAL_RESTART_DELAY_MS;
    } catch (err) {
      logger.error({ err }, 'Failed to restart polling, backing off');
      restartDelay = Math.min(restartDelay * 2, MAX_RESTART_DELAY_MS);
      scheduleRestart();
    } finally {
      isRestarting = false;
    }
  };

  const scheduleRestart = (): void => {
    if (restartTimer) return;
    restartTimer = setTimeout(() => {
      restartTimer = null;
      void doRestart();
    }, restartDelay);
  };

  bot.on('polling_error', (err: PollingError) => {
    logger.error(
      { code: err.code, message: err.message },
      'Telegram polling error',
    );
    if (!err.code || RECOVERABLE_CODES.has(err.code)) {
      scheduleRestart();
    }
  });

  bot.on('message', async (msg) => {
    // Si llega un mensaje, polling está vivo → resetear backoff.
    restartDelay = INITIAL_RESTART_DELAY_MS;

    const userId = msg.from?.id;
    if (userId !== config.TELEGRAM_ALLOWED_USER_ID) {
      logger.warn(
        { userId, chatId: msg.chat.id },
        'Unauthorized user, ignoring',
      );
      return;
    }
    try {
      await handleMessage(bot, msg);
    } catch (err) {
      logger.error(
        { err, messageId: msg.message_id },
        'Error handling message',
      );
      try {
        await bot.sendMessage(
          msg.chat.id,
          '⚠️ algo falló procesando tu mensaje. mirá los logs.',
        );
      } catch {
        // swallow
      }
    }
  });

  // Health check: si polling queda "vivo" silenciosamente (ej: post-suspend del SO),
  // un getMe() que falla revela el problema y dispara restart.
  setInterval(async () => {
    try {
      await bot.getMe();
    } catch (err) {
      logger.warn({ err }, 'Health check failed, scheduling restart');
      scheduleRestart();
    }
  }, HEALTH_CHECK_INTERVAL_MS);

  logger.info('Bot started, polling for messages');
  return bot;
}
