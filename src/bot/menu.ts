import type TelegramBot from 'node-telegram-bot-api';
import { logger } from '../logger';

/**
 * Comandos que Telegram muestra en el menú al tipear "/".
 * Telegram exige nombres en minúscula (a-z, 0-9, _) y sin la barra.
 */
export const MENU_COMMANDS: TelegramBot.BotCommand[] = [
  { command: 'ultimos', description: 'últimos gastos (ej: /ultimos 20)' },
  { command: 'resumen', description: 'total y categorías del mes (ej: /resumen 2026-08)' },
  { command: 'analisis', description: 'análisis del mes escrito por la IA' },
  { command: 'deudas', description: 'quién te debe cuánto' },
  { command: 'deuda', description: 'detalle de una persona (ej: /deuda juan)' },
  { command: 'saldar', description: 'marcar una deuda como pagada (ej: /saldar 3)' },
  { command: 'saldar_todo', description: 'saldar todo lo de una persona' },
  { command: 'personas', description: 'personas y sus apodos' },
  { command: 'fusionar', description: 'unir dos personas duplicadas' },
  { command: 'editar', description: 'editar un gasto (ej: /editar 42 monto=5000)' },
  { command: 'borrar', description: 'borrar un gasto' },
  { command: 'exportar', description: 'CSV con todos los gastos' },
  { command: 'completar_usd', description: 'completar USD faltante desde una fecha' },
  { command: 'pendientes', description: 'estado de la cola de mensajes' },
  { command: 'procesar', description: 'reintentar mensajes pendientes' },
  { command: 'help', description: 'ayuda' },
];

export async function registerMenu(bot: TelegramBot): Promise<void> {
  try {
    await bot.setMyCommands(MENU_COMMANDS);
  } catch (err) {
    // No es crítico: el bot funciona igual sin el menú.
    logger.warn({ err }, 'Could not register command menu');
  }
}
