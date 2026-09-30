import type TelegramBot from 'node-telegram-bot-api';
import type { Message } from 'node-telegram-bot-api';

export async function handleHelp(
  bot: TelegramBot,
  msg: Message,
): Promise<void> {
  await bot.sendMessage(
    msg.chat.id,
    `mandame un mensaje describiendo un gasto (ej: "gasté 15000 en super") y lo registro.

gastos:
/ultimos [n] — últimos N gastos (default 10)
/resumen [YYYY-MM] — total y por categoría del mes
/analisis [YYYY-MM] — análisis en prosa con el LLM
/borrar <id> — borrar un gasto
/editar <id> campo=valor — editar campos (monto, categoria, etc.)
/completar_usd <YYYY-MM-DD> — rellena USD faltante desde esa fecha
/exportar — CSV con todos los gastos

deudas:
/deudas — quién te debe cuánto en total
/deuda <persona> — detalle de deudas de una persona
/saldar <id> — marcar una deuda como saldada
/saldar_todo <persona> — saldar todas las deudas de alguien

personas:
/personas — listado con aliases
/fusionar <id_que_queda> <id_a_borrar> — unir duplicados

otros:
/pendientes — estado de la cola de mensajes
/procesar — reintentar los mensajes pendientes ahora
/help — esta ayuda`,
  );
}
