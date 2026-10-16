import type { NestFastifyApplication } from '@nestjs/platform-fastify';

export interface ApiResult {
  status: number;
  headers: Record<string, string | string[] | number | undefined>;
  setCookies: string[];
  /** Сире тіло відповіді (рядок). */
  raw: string;
  /** Розпарсений JSON (або null). */
  json: unknown;
  /** Дані з обгортки `{ success, data }`. */
  data<T = unknown>(): T;
  /** Поле з тіла помилки (message, code, …). */
  field(name: string): unknown;
}

export interface RequestOptions {
  body?: unknown;
  headers?: Record<string, string>;
  /** auto — клієнт сам отримує та надсилає CSRF-токен; none — не надсилати; або явний токен. */
  csrf?: 'auto' | 'none' | string;
  /** Перевизначити Origin (null — не надсилати Origin взагалі). */
  origin?: string | null;
  referer?: string;
  /** Не надсилати cookie (імітація іншого браузера / запиту без сесії). */
  cookies?: boolean;
}

interface StoredCookie {
  value: string;
  path: string;
}

const UNSAFE = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

/** Мінімальний «браузер»: cookie jar з урахуванням Path/Max-Age + автоматичний CSRF і Origin. */
export class TestClient {
  private readonly jar = new Map<string, StoredCookie>();
  private csrfToken: string | null = null;
  private readonly ip: string;
  private readonly origin: string | null;

  constructor(
    private readonly app: NestFastifyApplication,
    options: { ip?: string; origin?: string | null } = {},
  ) {
    this.ip = options.ip ?? '10.0.0.1';
    this.origin = options.origin === undefined ? 'http://localhost:3000' : options.origin;
  }

  // ── Cookie jar ────────────────────────────────────────────────────────────

  cookie(name: string): string | undefined {
    return this.jar.get(name)?.value;
  }

  setCookie(name: string, value: string, path = '/'): void {
    this.jar.set(name, { value, path });
  }

  deleteCookie(name: string): void {
    this.jar.delete(name);
  }

  clearJar(): void {
    this.jar.clear();
    this.csrfToken = null;
  }

  /** Скинути кеш CSRF-токена (як після login/logout у реальному клієнті). */
  forgetCsrf(): void {
    this.csrfToken = null;
  }

  private cookieHeaderFor(path: string): string | undefined {
    const parts: string[] = [];
    for (const [name, { value, path: cookiePath }] of this.jar) {
      const matches =
        cookiePath === '/' || path === cookiePath || path.startsWith(`${cookiePath}/`);
      if (matches) parts.push(`${name}=${value}`);
    }
    return parts.length ? parts.join('; ') : undefined;
  }

  private storeCookies(
    cookies: Array<{ name: string; value: string; path?: string; maxAge?: number; expires?: Date }>,
  ): void {
    for (const cookie of cookies) {
      const expired =
        cookie.value === '' ||
        cookie.maxAge === 0 ||
        (cookie.expires instanceof Date && cookie.expires.getTime() <= Date.now());
      if (expired) this.jar.delete(cookie.name);
      else this.jar.set(cookie.name, { value: cookie.value, path: cookie.path ?? '/' });
    }
  }

  // ── Requests ──────────────────────────────────────────────────────────────

  async fetchCsrfToken(): Promise<string> {
    const res = await this.send('GET', '/api/auth/csrf', { csrf: 'none' });
    const token = res.data<{ csrfToken: string }>().csrfToken;
    this.csrfToken = token;
    return token;
  }

  get(url: string, options: RequestOptions = {}) {
    return this.send('GET', url, options);
  }
  post(url: string, body?: unknown, options: RequestOptions = {}) {
    return this.send('POST', url, { ...options, body });
  }
  put(url: string, body?: unknown, options: RequestOptions = {}) {
    return this.send('PUT', url, { ...options, body });
  }
  patch(url: string, body?: unknown, options: RequestOptions = {}) {
    return this.send('PATCH', url, { ...options, body });
  }
  delete(url: string, options: RequestOptions = {}) {
    return this.send('DELETE', url, options);
  }

  /** multipart/form-data з одним файлом. */
  async upload(
    url: string,
    file: { field?: string; filename: string; contentType: string; content: Buffer },
    options: RequestOptions = {},
  ): Promise<ApiResult> {
    const boundary = `----inrium-test-${Math.random().toString(16).slice(2)}`;
    const head = Buffer.from(
      `--${boundary}\r\nContent-Disposition: form-data; name="${file.field ?? 'file'}"; filename="${file.filename}"\r\nContent-Type: ${file.contentType}\r\n\r\n`,
    );
    const tail = Buffer.from(`\r\n--${boundary}--\r\n`);
    return this.send('POST', url, {
      ...options,
      rawBody: Buffer.concat([head, file.content, tail]),
      headers: { ...options.headers, 'content-type': `multipart/form-data; boundary=${boundary}` },
    });
  }

  async send(
    method: string,
    url: string,
    options: RequestOptions & { rawBody?: Buffer } = {},
  ): Promise<ApiResult> {
    const path = url.split('?')[0];
    const headers: Record<string, string> = { ...(options.headers ?? {}) };

    const origin = options.origin === undefined ? this.origin : options.origin;
    if (origin) headers.origin = origin;
    if (options.referer) headers.referer = options.referer;

    if (UNSAFE.has(method)) {
      const mode = options.csrf ?? 'auto';
      if (mode === 'auto') {
        if (!this.csrfToken) await this.fetchCsrfToken();
        headers['x-csrf-token'] = this.csrfToken as string;
      } else if (mode !== 'none') {
        headers['x-csrf-token'] = mode;
      }
    }

    if (options.cookies !== false) {
      const cookieHeader = this.cookieHeaderFor(path);
      if (cookieHeader) headers.cookie = cookieHeader;
    }

    let payload: string | Buffer | undefined;
    if (options.rawBody) {
      payload = options.rawBody;
    } else if (options.body !== undefined) {
      payload = JSON.stringify(options.body);
      headers['content-type'] ??= 'application/json';
    }

    const response = await this.app.inject({
      method: method as 'GET',
      url,
      headers,
      payload,
      remoteAddress: this.ip,
    });

    this.storeCookies(response.cookies);
    // Після зміни сесії токен прив'язаний до іншого binding — клієнт отримає новий.
    if (/\/api\/auth\/(login|logout|refresh)$/.test(path)) this.csrfToken = null;

    const raw = response.body;
    let json: unknown = null;
    try {
      json = raw ? JSON.parse(raw) : null;
    } catch {
      json = null;
    }

    const setCookies = ([] as string[]).concat(
      (response.headers['set-cookie'] as string | string[] | undefined) ?? [],
    );

    return {
      status: response.statusCode,
      headers: response.headers,
      setCookies,
      raw,
      json,
      data: <T>() => (json as { data: T }).data,
      field: (name: string) => (json as Record<string, unknown> | null)?.[name],
    };
  }
}
