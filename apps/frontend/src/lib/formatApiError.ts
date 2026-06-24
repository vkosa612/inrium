/** Зрозуміле повідомлення про помилку API українською. */
export function formatApiError(err: unknown, fallback = 'Помилка завантаження'): string {
  const msg = err instanceof Error ? err.message : fallback;
  if (/403|forbidden|заборонено/i.test(msg)) return 'Доступ заборонено.';
  if (/401|unauthorized|авториз/i.test(msg)) return 'Сесію закінчено. Увійдіть знову.';
  if (/500|internal/i.test(msg)) return 'Помилка сервера. Спробуйте пізніше.';
  return msg;
}
