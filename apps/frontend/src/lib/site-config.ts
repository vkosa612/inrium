/**
 * Єдине місце з публічними налаштуваннями сайту: адреса, контакти, юридична інформація.
 * Значення задаються змінними середовища під час збірки (NEXT_PUBLIC_*). Жодних вигаданих адрес:
 * якщо контакт не налаштований, сторінки чесно показують, що його ще не вказано.
 */
function clean(value: string | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

/** Канонічна адреса сайту (без завершального `/`). */
export const SITE_URL = (clean(process.env.NEXT_PUBLIC_SITE_URL) ?? 'http://localhost:3000').replace(/\/$/, '');

export const SITE_NAME = 'INRIUM';

export const CONTACTS = {
  /** Загальна пошта підтримки. */
  email: clean(process.env.NEXT_PUBLIC_CONTACT_EMAIL),
  /** Пошта для питань реклами/партнерства (якщо порожньо — використовується загальна). */
  adsEmail: clean(process.env.NEXT_PUBLIC_ADS_EMAIL) ?? clean(process.env.NEXT_PUBLIC_CONTACT_EMAIL),
  /** Пошта з питань персональних даних (якщо порожньо — загальна). */
  privacyEmail: clean(process.env.NEXT_PUBLIC_PRIVACY_EMAIL) ?? clean(process.env.NEXT_PUBLIC_CONTACT_EMAIL),
  /** Telegram у форматі `@username` або посилання. */
  telegram: clean(process.env.NEXT_PUBLIC_CONTACT_TELEGRAM),
} as const;

/** Дані оператора сайту для юридичних сторінок (заповнює власник). */
export const LEGAL = {
  operatorName: clean(process.env.NEXT_PUBLIC_LEGAL_OPERATOR_NAME),
  operatorAddress: clean(process.env.NEXT_PUBLIC_LEGAL_OPERATOR_ADDRESS),
} as const;

export function telegramHref(value: string): string {
  if (/^https?:\/\//i.test(value)) return value;
  return `https://t.me/${value.replace(/^@/, '')}`;
}
