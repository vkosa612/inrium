/** Назви cookie та заголовків безпеки (єдине джерело правди для backend). */
export const ACCESS_COOKIE = 'inrium_at';
export const REFRESH_COOKIE = 'inrium_rt';
export const CSRF_COOKIE = 'inrium_csrf';
export const CSRF_HEADER = 'x-csrf-token';
export const REQUEST_ID_HEADER = 'x-request-id';

/** Шлях, на який відправляється refresh-cookie (не потрапляє на решту API). */
export const REFRESH_COOKIE_PATH = '/api/auth';

/** Коди помилок, за якими клієнт може відрізнити сценарії. */
export const ErrorCodes = {
  AuthRequired: 'AUTH_REQUIRED',
  CsrfInvalid: 'CSRF_INVALID',
  OriginNotAllowed: 'ORIGIN_NOT_ALLOWED',
  CaptchaRequired: 'CAPTCHA_REQUIRED',
  CaptchaFailed: 'CAPTCHA_FAILED',
  CaptchaUnavailable: 'CAPTCHA_UNAVAILABLE',
  TooManyRequests: 'TOO_MANY_REQUESTS',
} as const;
