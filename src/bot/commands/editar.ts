import type TelegramBot from 'node-telegram-bot-api';
import type { Message } from 'node-telegram-bot-api';
import {
  getExpenseById,
  updateExpense,
  type ExpenseUpdate,
} from '../../db/repos/expenses';
import { parseEdits } from '../../domain/edit-parser';
import { formatArs, formatDate } from '../format';

export async function handleEditar(
  bot: TelegramBot,
  msg: Message,
  args: string[],
): Promise<void> {
  const idArg = args[0];
  const fieldTokens = args.slice(1);

  if (!idArg || fieldTokens.length === 0) {
    await bot.sendMessage(
      msg.chat.id,
      `uso: /editar <id> campo=valor [campo=valor ...]\n\ncampos: monto, categoria, subcategoria, descripcion, fecha\n\nej: /editar 42 monto=18000 categoria=transporte\nej: /editar 42 descripcion=cena con pedro`,
    );
    return;
  }

  const id = parseInt(idArg, 10);
  if (!Number.isFinite(id) || id <= 0) {
    await bot.sendMessage(msg.chat.id, `id inválido: ${idArg}`);
    return;
  }
  const existing = getExpenseById(id);
  if (!existing) {
    await bot.sendMessage(msg.chat.id, `no encontré el gasto #${id}`);
    return;
  }

  const parsed = parseEdits(fieldTokens);
  if (!parsed.ok) {
    const errors = parsed.errors
      .map((e) => (e.field ? `${e.field}: ${e.message}` : e.message))
      .join('\n');
    await bot.sendMessage(msg.chat.id, `❌ no pude parsear:\n${errors}`);
    return;
  }

  const update: ExpenseUpdate = { ...parsed.edits };

  // Si cambió el monto y había cotización guardada, recalcular amount_usd.
  if (update.amount_ars !== undefined && existing.usd_rate) {
    update.amount_usd = update.amount_ars / existing.usd_rate;
  }

  const ok = updateExpense(id, update);
  if (!ok) {
    await bot.sendMessage(msg.chat.id, `no pude actualizar el gasto`);
    return;
  }

  const updated = getExpenseById(id)!;
  const sub = updated.subcategory ? `/${updated.subcategory}` : '';
  await bot.sendMessage(
    msg.chat.id,
    `✏️ actualizado #${updated.id} · ${formatArs(updated.amount_ars)} · ${updated.category}${sub} · ${updated.description} · ${formatDate(updated.spent_at)}`,
  );
}
