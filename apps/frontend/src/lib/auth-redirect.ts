/** Шляхи, на які не можна повертати після входу (інакше — цикл редіректів). */
const AUTH_PAGES = ['/login', '/register', '/forgot-password', '/reset-password', '/verify-email'];

/**
 * Безпечний внутрішній шлях для редіректу після логіну.
 * Відхиляє зовнішні/схемні адреси (`//host`, `/\host`, `javascript:`), керівні символи та сторінки автентифікації.
 */
export function safeNextPath(raw: string | null | undefined): string {
  if (!raw) return '/';
  const path = raw.trim();
  if (!path.startsWith('/')) return '/';
  if (path.startsWith('//') || path.includes('\\')) return '/';
  if (/[\u0000-\u001f\u007f]/.test(path)) return '/';

  const pathname = path.split(/[?#]/)[0].replace(/\/+$/, '') || '/';
  if (AUTH_PAGES.includes(pathname)) return '/';
  return path;
}
