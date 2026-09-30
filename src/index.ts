import { loadConfig } from './config';
import { migrate } from './db/migrate';
import { closeDb } from './db/connection';
import { startBot } from './bot';
import { drainPending } from './processor/drain';
import { resetStuckProcessing } from './db/repos/pending';
import { logger } from './logger';

async function main(): Promise<void> {
  loadConfig();
  migrate();
  // Si el proceso murió antes de terminar de procesar, los mensajes quedaron
  // huérfanos en 'processing'. Los volvemos a 'pending' para que el drain los levante.
  const unstuck = resetStuckProcessing();
  if (unstuck > 0) {
    logger.info({ count: unstuck }, 'Reset stuck processing messages from previous run');
  }
  const bot = startBot();
  // Drenar mensajes pending (incluyendo los recién destrabados). Background.
  drainPending(bot).catch((err) => {
    logger.error({ err }, 'Initial drain failed');
  });
}

main().catch((err) => {
  logger.error({ err }, 'Fatal error starting up');
  process.exit(1);
});

const shutdown = (signal: string): void => {
  logger.info({ signal }, 'Shutting down');
  closeDb();
  process.exit(0);
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
