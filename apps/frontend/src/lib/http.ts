/**
 * Низькорівневий HTTP-клієнт INRIUM.
 *
 * Автентифікація: HttpOnly cookie (access + refresh) — JavaScript їх не бачить і не зберігає ніде
 * (жодних токенів у localStorage/sessionStorage). Браузер сам надсилає cookie (`credentials: 'include'`).
 *
 * CSRF: для POST/PUT/PATCH/DELETE клієнт отримує токен з `GET /auth/csrf`, кешує у пам'яті модуля та
 * надсилає в заголовку `X-CSRF-Token`. Токен прив'язаний до сесії, тому кеш скидається після
 * login / logout / refresh; на `403 CSRF_INVALID` токен оновлюється й запит повторюється один раз.
 *
 * Сесія: на `401` клієнт робить ОДИН спільний (single-flight) `POST /auth/refresh` та повторює запит.
 * Якщо refresh не вдався — повідомляє підписників (`onSessionExpired`), без циклічних редіректів.
 *
 * Серверні компоненти (RSC) використовують лише публічні GET через BACKEND_URL — без cookie та CSRF.
 */

const IS_BROWSER = typeof window !== 'undefined';

export function getBaseUrl(): string {
  if (!IS_BROWSER) {
    // Server-side: внутрішня адреса backend (Docker network або localhost).
    return process.env.BACKEND_URL ?? 'http://localhost:4200/api';
  }
  // Browser: за замовчуванням same-origin `/api` (проксується Next.js rewrites → cookie first-party).
  return process.env.NEXT_PUBLIC_API_URL ?? '/api';
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  timestamp: string;
}

export interface ApiErrorBody {
  success: false;
  statusCode: number;
  message: string | string[];
  error?: string;
  code?: string;
  requestId?: string;
}

export class ApiRequestError extends Error {
  readonly status: number;
  readonly code?: string;
  readonly requestId?: string;

  constructor(message: string, status: number, code?: string, requestId?: string) {
    super(message);
    this.name = 'ApiRequestError';
    this.status = status;
    this.code = code;
    this.requestId = requestId;
  }
}

const UNSAFE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const CSRF_HEADER = 'X-CSRF-Token';
const NO_REFRESH_PATHS = ['/auth/login', '/auth/register', '/auth/refresh', '/auth/csrf', '/auth/logout'];

// ── Parsing ────────────────────────────────────────────────────────────────

async function readJson(res: Response): Promise<unknown> {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
}

function toRequestError(res: Response, body: unknown): ApiRequestError {
  const err = (body ?? {}) as Partial<ApiErrorBody>;
  const raw = err.message;
  const message = Array.isArray(raw)
    ? raw.join('; ')
    : raw || `Помилка запиту (${res.status})`;
  return new ApiRequestError(message, res.status, err.code, err.requestId);
}

// ── CSRF ───────────────────────────────────────────────────────────────────

let csrfToken: string | null = null;
let csrfInflight: Promise<string> | null = null;

/** Скинути кеш CSRF-токена (після login/logout/refresh або з іншої вкладки). */
export function invalidateCsrfToken(): void {
  csrfToken = null;
}

async function getCsrfToken(force = false): Promise<string> {
  if (!force && csrfToken) return csrfToken;
  if (!csrfInflight) {
    csrfInflight = (async () => {
      const res = await fetch(`${getBaseUrl()}/auth/csrf`, {
        credentials: 'include',
        cache: 'no-store',
      });
      const body = await readJson(res);
      const data = (body as ApiResponse<{ csrfToken: string }> | null)?.data;
      if (!res.ok || !data?.csrfToken) throw toRequestError(res, body);
      csrfToken = data.csrfToken;
      return data.csrfToken;
    })().finally(() => {
      csrfInflight = null;
    });
  }
  return csrfInflight;
}

// ── Події сесії ────────────────────────────────────────────────────────────

type SessionListener = () => void;
const expiredListeners = new Set<SessionListener>();

/** Підписка на «сесію завершено» (refresh не вдався). Повертає функцію відписки. */
export function onSessionExpired(listener: SessionListener): () => void {
  expiredListeners.add(listener);
  return () => {
    expiredListeners.delete(listener);
  };
}

function notifySessionExpired(): void {
  expiredListeners.forEach((listener) => listener());
}

// ── Низькорівневий запит ───────────────────────────────────────────────────

interface SendOptions {
  /** Чи робити refresh + повтор на 401. */
  refreshOn401: boolean;
}

function methodOf(init: RequestInit): string {
  return (init.method ?? 'GET').toUpperCase();
}

async function sendOnce(path: string, init: RequestInit, forceCsrf: boolean): Promise<Response> {
  const headers = new Headers(init.headers);
  if (init.body !== undefined && init.body !== null && !(init.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  if (IS_BROWSER && UNSAFE_METHODS.has(methodOf(init))) {
    headers.set(CSRF_HEADER, await getCsrfToken(forceCsrf));
  }
  return fetch(`${getBaseUrl()}${path}`, {
    ...init,
    headers,
    ...(IS_BROWSER ? { credentials: 'include' as const } : {}),
  });
}

async function hasErrorCode(res: Response, code: string): Promise<boolean> {
  const body = (await readJson(res.clone())) as Partial<ApiErrorBody> | null;
  return body?.code === code;
}

async function isCsrfFailure(res: Response): Promise<boolean> {
  return res.status === 403 && hasErrorCode(res, 'CSRF_INVALID');
}

let refreshInflight: Promise<'ok' | 'expired'> | null = null;

/**
 * Спільний (single-flight) refresh: паралельні 401 у межах вкладки чекають один і той самий запит.
 * 'expired' — сервер відхилив refresh; мережева помилка кидає виняток (користувача НЕ розлогінює).
 */
export function refreshSession(): Promise<'ok' | 'expired'> {
  if (!refreshInflight) {
    refreshInflight = (async () => {
      const res = await sendWithCsrfRetry('/auth/refresh', { method: 'POST' });
      invalidateCsrfToken(); // токен прив'язаний до сесії — після ротації отримаємо новий
      if (res.ok) return 'ok' as const;
      if (res.status === 401 || res.status === 403) return 'expired' as const;
      throw toRequestError(res, await readJson(res));
    })().finally(() => {
      refreshInflight = null;
    });
  }
  return refreshInflight;
}

async function sendWithCsrfRetry(path: string, init: RequestInit): Promise<Response> {
  let res = await sendOnce(path, init, false);
  if (IS_BROWSER && UNSAFE_METHODS.has(methodOf(init)) && (await isCsrfFailure(res))) {
    invalidateCsrfToken();
    res = await sendOnce(path, init, true);
  }
  return res;
}

async function send(path: string, init: RequestInit, options: SendOptions): Promise<Response> {
  let res = await sendWithCsrfRetry(path, init);

  // Refresh лише для «сесія відсутня/прострочена» (AUTH_REQUIRED), а не для 401 бізнес-логіки
  // (напр. «невірний поточний пароль») — такі запити не повторюються.
  if (
    res.status === 401 &&
    options.refreshOn401 &&
    IS_BROWSER &&
    !NO_REFRESH_PATHS.some((p) => path.startsWith(p)) &&
    (await hasErrorCode(res, 'AUTH_REQUIRED'))
  ) {
    const outcome = await refreshSession();
    if (outcome === 'ok') {
      res = await sendWithCsrfRetry(path, init);
    } else {
      notifySessionExpired();
    }
  }
  return res;
}

async function parse<T>(res: Response): Promise<T> {
  const body = await readJson(res);
  if (!res.ok) throw toRequestError(res, body);
  if (res.status === 204 || body === null) return undefined as T;
  const envelope = body as Partial<ApiResponse<T>>;
  if (envelope.success === false) throw toRequestError(res, body);
  return envelope.data as T;
}

/** Публічний запит (без refresh-логіки). */
export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  return parse<T>(await send(path, init, { refreshOn401: false }));
}

/** Запит від імені користувача: cookie, CSRF, автоматичний refresh на 401. */
export async function apiFetchAuth<T>(path: string, init: RequestInit = {}): Promise<T> {
  return parse<T>(await send(path, init, { refreshOn401: true }));
}

/** multipart-завантаження файлу (Content-Type виставляє браузер). */
export async function apiUploadFile<T>(
  path: string,
  file: File,
  messages: Partial<Record<number, string>> = {},
): Promise<T> {
  const formData = new FormData();
  formData.append('file', file);
  const res = await send(path, { method: 'POST', body: formData }, { refreshOn401: true });
  if (!res.ok && messages[res.status]) {
    throw new ApiRequestError(messages[res.status] as string, res.status);
  }
  return parse<T>(res);
}
