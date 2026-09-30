import type TelegramBot from 'node-telegram-bot-api';
import type { Message } from 'node-telegram-bot-api';
import { deleteExpense, getExpenseById } from '../../db/repos/expenses';
import { formatArs, formatDate } from '../format';

export async function handleBorrar(
  bot: TelegramBot,
  msg: Message,
  args: string[],
): Promise<void> {
  const idArg = args[0];
  const confirm = args[1];

  if (!idArg) {
    await bot.sendMessage(
      msg.chat.id,
      `uso: /borrar <id> confirmar\nej: /borrar 42 confirmar`,
    );
    return;
  }

  const id = parseInt(idArg, 10);
  if (!Number.isFinite(id) || id <= 0) {
    await bot.sendMessage(msg.chat.id, `id inválido: ${idArg}`);
    return;
  }

  const expense = getExpenseById(id);
  if (!expense) {
    await bot.sendMessage(msg.chat.id, `no encontré el gasto #${id}`);
    return;
  }

  if (confirm !== 'confirmar') {
    const sub = expense.subcategory ? `/${expense.subcategory}` : '';
    await bot.sendMessage(
      msg.chat.id,
      `⚠️ vas a borrar:\n#${expense.id} · ${formatArs(expense.amount_ars)} · ${expense.category}${sub} · ${expense.description} · ${formatDate(expense.spent_at)}\n\nconfirmá con: /borrar ${expense.id} confirmar`,
    );
    return;
  }

  const ok = deleteExpense(id);
  if (!ok) {
    await bot.sendMessage(msg.chat.id, `no pude borrar el gasto #${id}`);
    return;
  }
  await bot.sendMessage(msg.chat.id, `🗑️ gasto #${id} borrado`);
}
