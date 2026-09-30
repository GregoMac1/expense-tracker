import type TelegramBot from 'node-telegram-bot-api';
import type { Message } from 'node-telegram-bot-api';
import { insertPending, updatePendingStatus } from '../db/repos/pending';
import { logger } from '../logger';
import { processPendingMessage } from '../processor/process-message';
import { handleStart } from './commands/start';
import { handleHelp } from './commands/help';
import { handleUltimos } from './commands/ultimos';
import { handlePendientes } from './commands/pendientes';
import { handleResumen } from './commands/resumen';
import { handleBorrar } from './commands/borrar';
import { handleDeudas } from './commands/deudas';
import { handleSaldar, handleSaldarTodo } from './commands/saldar';
import { handlePersonas } from './commands/personas';
import { handleFusionar } from './commands/fusionar';
import { handleAnalisis } from './commands/analisis';
import { handleEditar } from './commands/editar';
import { handleExportar } from './commands/exportar';
import { handleProcesar } from './commands/procesar';
import { handleCompletarUsd } from './commands/completar_usd';

export async function handleMessage(
  bot: TelegramBot,
  msg: Message,
): Promise<void> {
  // Si el usuario mandó algo que no es texto (foto, doc, audio, etc.), avisar.
  const text = (msg.text ?? msg.caption)?.trim();
  if (!text) {
    if (hasNonTextContent(msg)) {
      await bot.sendMessage(
        msg.chat.id,
        `📎 por ahora solo proceso texto. mandame el gasto escrito (ej: "gasté 15000 en super").`,
      );
    }
    return;
  }

  const receivedAt = new Date(msg.date * 1000).toISOString();

  if (text.startsWith('/')) {
    await dispatchCommand(bot, msg, text);
    return;
  }

  const pending = insertPending({
    telegram_message_id: msg.message_id,
    chat_id: msg.chat.id,
    text,
    received_at: receivedAt,
  });

  if (!pending) {
    logger.debug(
      { messageId: msg.message_id },
      'Message already in queue, skipping',
    );
    return;
  }

  try {
    await processPendingMessage(bot, pending);
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    logger.error({ err, messageId: msg.message_id }, 'Error in processor');
    updatePendingStatus(pending.id, 'failed', errorMsg);
  }
}

function hasNonTextContent(msg: Message): boolean {
  return !!(
    msg.document ||
    msg.photo ||
    msg.voice ||
    msg.audio ||
    msg.video ||
    msg.video_note ||
    msg.sticker ||
    msg.animation ||
    msg.contact ||
    msg.location
  );
}

async function dispatchCommand(
  bot: TelegramBot,
  msg: Message,
  text: string,
): Promise<void> {
  const parts = text.split(/\s+/);
  const command = parts[0] ?? '';
  const args = parts.slice(1);

  switch (command) {
    case '/start':
      return handleStart(bot, msg);
    case '/help':
      return handleHelp(bot, msg);
    case '/ultimos':
      return handleUltimos(bot, msg, args);
    case '/pendientes':
      return handlePendientes(bot, msg);
    case '/procesar':
      return handleProcesar(bot, msg);
    case '/resumen':
      return handleResumen(bot, msg, args);
    case '/analisis':
      return handleAnalisis(bot, msg, args);
    case '/borrar':
      return handleBorrar(bot, msg, args);
    case '/editar':
      return handleEditar(bot, msg, args);
    case '/exportar':
      return handleExportar(bot, msg);
    case '/completar_usd':
      return handleCompletarUsd(bot, msg, args);
    case '/deudas':
    case '/deuda':
      return handleDeudas(bot, msg, args);
    case '/saldar':
      return handleSaldar(bot, msg, args);
    case '/saldar_todo':
      return handleSaldarTodo(bot, msg, args);
    case '/personas':
      return handlePersonas(bot, msg);
    case '/fusionar':
      return handleFusionar(bot, msg, args);
    default:
      await bot.sendMessage(
        msg.chat.id,
        `no conozco el comando ${command}. probá /help`,
      );
  }
}
