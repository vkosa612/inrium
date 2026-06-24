/** Безпечний внутрішній шлях для редіректу після логіну. */
export function safeNextPath(raw: string | null | undefined): string {
  if (!raw?.trim()) return '/';
  const path = raw.trim();
  if (!path.startsWith('/') || path.startsWith('//')) return '/';
  return path;
}
