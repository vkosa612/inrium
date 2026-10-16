// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

type Handler = (url: string, init: RequestInit) => Response | Promise<Response>;
interface Call {
  url: string;
  init: RequestInit;
}

let calls: Call[] = [];

function ok(data: unknown, status = 200): Response {
  return new Response(JSON.stringify({ success: true, data }), { status });
}

function fail(status: number, code?: string, message: string | string[] = 'Помилка'): Response {
  return new Response(JSON.stringify({ success: false, statusCode: status, message, ...(code ? { code } : {}) }), {
    status,
  });
}

function mockFetch(handler: Handler): void {
  calls = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string | URL, init: RequestInit = {}) => {
      calls.push({ url: String(url), init });
      return handler(String(url), init);
    }),
  );
}

const header = (call: Call, name: string) => new Headers(call.init.headers).get(name);
const callsTo = (suffix: string) => calls.filter((c) => c.url.endsWith(suffix));

async function loadHttp() {
  vi.resetModules();
  return import('@/lib/http');
}

beforeEach(() => {
  calls = [];
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('http-клієнт: cookie та CSRF', () => {
  it('GET іде same-origin на /api з credentials=include та без CSRF-запиту', async () => {
    mockFetch(() => ok({ items: [] }));
    const { apiFetch } = await loadHttp();

    await apiFetch('/content');

    expect(calls).toHaveLength(1);
    expect(calls[0].url).toBe('/api/content');
    expect(calls[0].init.credentials).toBe('include');
    expect(header(calls[0], 'x-csrf-token')).toBeNull();
    expect(header(calls[0], 'authorization')).toBeNull();
  });

  it('POST спершу отримує CSRF-токен, надсилає його в заголовку та кешує для наступних запитів', async () => {
    mockFetch((url) => (url.endsWith('/auth/csrf') ? ok({ csrfToken: 'tok-1' }) : ok({ done: true })));
    const { apiFetchAuth } = await loadHttp();

    await apiFetchAuth('/games', { method: 'POST', body: JSON.stringify({ a: 1 }) });
    await apiFetchAuth('/games', { method: 'POST', body: JSON.stringify({ a: 2 }) });

    expect(callsTo('/auth/csrf')).toHaveLength(1);
    const posts = callsTo('/games');
    expect(posts).toHaveLength(2);
    expect(header(posts[0], 'x-csrf-token')).toBe('tok-1');
    expect(header(posts[1], 'x-csrf-token')).toBe('tok-1');
    expect(header(posts[0], 'content-type')).toBe('application/json');
  });

  it('паралельні POST ділять один запит за CSRF-токеном', async () => {
    mockFetch(async (url) => {
      if (url.endsWith('/auth/csrf')) {
        await new Promise((r) => setTimeout(r, 15));
        return ok({ csrfToken: 'tok-p' });
      }
      return ok({});
    });
    const { apiFetchAuth } = await loadHttp();

    await Promise.all([
      apiFetchAuth('/a', { method: 'PATCH' }),
      apiFetchAuth('/b', { method: 'PATCH' }),
      apiFetchAuth('/c', { method: 'DELETE' }),
    ]);

    expect(callsTo('/auth/csrf')).toHaveLength(1);
  });

  it('403 CSRF_INVALID → токен оновлюється й запит повторюється рівно один раз', async () => {
    let issued = 0;
    mockFetch((url, init) => {
      if (url.endsWith('/auth/csrf')) return ok({ csrfToken: `tok-${++issued}` });
      return new Headers(init.headers).get('x-csrf-token') === 'tok-2' ? ok({ saved: true }) : fail(403, 'CSRF_INVALID');
    });
    const { apiFetchAuth } = await loadHttp();

    await expect(apiFetchAuth('/users/me', { method: 'PATCH', body: '{}' })).resolves.toEqual({ saved: true });
    expect(callsTo('/users/me')).toHaveLength(2);
    expect(callsTo('/auth/csrf')).toHaveLength(2);
  });

  it('постійний CSRF_INVALID не зациклюється (максимум один повтор)', async () => {
    mockFetch((url) => (url.endsWith('/auth/csrf') ? ok({ csrfToken: 't' }) : fail(403, 'CSRF_INVALID', 'CSRF')));
    const { apiFetchAuth } = await loadHttp();

    await expect(apiFetchAuth('/users/me', { method: 'PATCH', body: '{}' })).rejects.toMatchObject({ status: 403 });
    expect(callsTo('/users/me')).toHaveLength(2);
  });

  it('інший 403 (недостатньо прав) НЕ викликає повтор', async () => {
    mockFetch((url) => (url.endsWith('/auth/csrf') ? ok({ csrfToken: 't' }) : fail(403, undefined, 'Недостатньо прав')));
    const { apiFetchAuth } = await loadHttp();

    await expect(apiFetchAuth('/games/1', { method: 'DELETE' })).rejects.toThrow('Недостатньо прав');
    expect(callsTo('/games/1')).toHaveLength(1);
  });

  it('multipart: CSRF додається, Content-Type не виставляється вручну (boundary — за браузером)', async () => {
    mockFetch((url) => (url.endsWith('/auth/csrf') ? ok({ csrfToken: 'tok-u' }) : ok({ url: '/uploads/x.png' })));
    const { apiUploadFile } = await loadHttp();

    const file = new File([new Uint8Array([1, 2, 3])], 'a.png', { type: 'image/png' });
    await apiUploadFile('/uploads/image', file);

    const upload = callsTo('/uploads/image')[0];
    expect(header(upload, 'x-csrf-token')).toBe('tok-u');
    expect(header(upload, 'content-type')).toBeNull();
    expect(upload.init.body).toBeInstanceOf(FormData);
  });

  it('invalidateCsrfToken змушує отримати новий токен (після login/logout)', async () => {
    let issued = 0;
    mockFetch((url) => (url.endsWith('/auth/csrf') ? ok({ csrfToken: `tok-${++issued}` }) : ok({})));
    const { apiFetchAuth, invalidateCsrfToken } = await loadHttp();

    await apiFetchAuth('/x', { method: 'POST' });
    invalidateCsrfToken();
    await apiFetchAuth('/x', { method: 'POST' });

    const posts = callsTo('/x');
    expect(header(posts[0], 'x-csrf-token')).toBe('tok-1');
    expect(header(posts[1], 'x-csrf-token')).toBe('tok-2');
  });
});

describe('http-клієнт: сесія та refresh', () => {
  it('401 AUTH_REQUIRED → один refresh → повтор запиту', async () => {
    let refreshed = false;
    mockFetch((url) => {
      if (url.endsWith('/auth/csrf')) return ok({ csrfToken: 't' });
      if (url.endsWith('/auth/refresh')) {
        refreshed = true;
        return ok({ user: { id: 'u1' } });
      }
      return refreshed ? ok({ id: 'u1' }) : fail(401, 'AUTH_REQUIRED');
    });
    const { apiFetchAuth } = await loadHttp();

    await expect(apiFetchAuth('/auth/me')).resolves.toEqual({ id: 'u1' });
    expect(callsTo('/auth/refresh')).toHaveLength(1);
    expect(callsTo('/auth/me')).toHaveLength(2);
  });

  it('N паралельних 401 → рівно ОДИН refresh (single-flight)', async () => {
    let refreshed = false;
    mockFetch(async (url) => {
      if (url.endsWith('/auth/csrf')) return ok({ csrfToken: 't' });
      if (url.endsWith('/auth/refresh')) {
        await new Promise((r) => setTimeout(r, 25));
        refreshed = true;
        return ok({ user: {} });
      }
      return refreshed ? ok({ ok: true }) : fail(401, 'AUTH_REQUIRED');
    });
    const { apiFetchAuth } = await loadHttp();

    const results = await Promise.all([
      apiFetchAuth('/bookmarks'),
      apiFetchAuth('/games/my/games'),
      apiFetchAuth('/games/my/applications'),
      apiFetchAuth('/auth/me'),
    ]);

    expect(results).toHaveLength(4);
    expect(callsTo('/auth/refresh')).toHaveLength(1);
  });

  it('401 без коду AUTH_REQUIRED (невірний пароль) НЕ запускає refresh і не повторює запит', async () => {
    mockFetch((url) =>
      url.endsWith('/auth/csrf') ? ok({ csrfToken: 't' }) : fail(401, undefined, 'Невірний поточний пароль'),
    );
    const { apiFetchAuth } = await loadHttp();

    await expect(
      apiFetchAuth('/users/me/change-password', { method: 'POST', body: '{}' }),
    ).rejects.toThrow('Невірний поточний пароль');
    expect(callsTo('/auth/refresh')).toHaveLength(0);
    expect(callsTo('/users/me/change-password')).toHaveLength(1);
  });

  it('refresh відхилено → сповіщення про завершення сесії, помилка 401 без циклу', async () => {
    mockFetch((url) => {
      if (url.endsWith('/auth/csrf')) return ok({ csrfToken: 't' });
      if (url.endsWith('/auth/refresh')) return fail(401, 'AUTH_REQUIRED', 'Сесію не знайдено');
      return fail(401, 'AUTH_REQUIRED');
    });
    const { apiFetchAuth, onSessionExpired } = await loadHttp();
    const listener = vi.fn();
    onSessionExpired(listener);

    await expect(apiFetchAuth('/auth/me')).rejects.toMatchObject({ status: 401 });

    expect(listener).toHaveBeenCalledTimes(1);
    expect(callsTo('/auth/refresh')).toHaveLength(1);
    expect(callsTo('/auth/me')).toHaveLength(1);
  });

  it('мережева помилка під час refresh НЕ розлогінює користувача', async () => {
    mockFetch((url) => {
      if (url.endsWith('/auth/csrf')) return ok({ csrfToken: 't' });
      if (url.endsWith('/auth/refresh')) throw new TypeError('Failed to fetch');
      return fail(401, 'AUTH_REQUIRED');
    });
    const { apiFetchAuth, onSessionExpired } = await loadHttp();
    const listener = vi.fn();
    onSessionExpired(listener);

    await expect(apiFetchAuth('/auth/me')).rejects.toThrow('Failed to fetch');
    expect(listener).not.toHaveBeenCalled();
  });

  it('публічний apiFetch не робить refresh навіть на 401', async () => {
    mockFetch(() => fail(401, 'AUTH_REQUIRED'));
    const { apiFetch } = await loadHttp();
    await expect(apiFetch('/auth/me')).rejects.toMatchObject({ status: 401 });
    expect(callsTo('/auth/refresh')).toHaveLength(0);
  });

  it('після refresh CSRF-токен перечитується (він прив\'язаний до сесії)', async () => {
    let issued = 0;
    let refreshed = false;
    mockFetch((url) => {
      if (url.endsWith('/auth/csrf')) return ok({ csrfToken: `tok-${++issued}` });
      if (url.endsWith('/auth/refresh')) {
        refreshed = true;
        return ok({});
      }
      return refreshed ? ok({}) : fail(401, 'AUTH_REQUIRED');
    });
    const { apiFetchAuth } = await loadHttp();

    await apiFetchAuth('/games', { method: 'POST', body: '{}' });

    const posts = callsTo('/games');
    expect(posts).toHaveLength(2);
    expect(header(posts[0], 'x-csrf-token')).toBe('tok-1');
    // refresh використав кешований tok-1 і скинув кеш → повтор запиту отримав свіжий токен
    expect(header(posts[1], 'x-csrf-token')).toBe('tok-2');
    expect(callsTo('/auth/csrf')).toHaveLength(2);
  });
});

describe('http-клієнт: помилки та сховище', () => {
  it('масив повідомлень валідації зливається в один рядок', async () => {
    mockFetch(() => fail(400, undefined, ['title має бути довшим', 'description обовʼязкове']));
    const { apiFetch } = await loadHttp();
    await expect(apiFetch('/x')).rejects.toThrow('title має бути довшим; description обовʼязкове');
  });

  it('204 без тіла повертає undefined', async () => {
    mockFetch((url) => (url.endsWith('/auth/csrf') ? ok({ csrfToken: 't' }) : new Response(null, { status: 204 })));
    const { apiFetchAuth } = await loadHttp();
    await expect(apiFetchAuth('/games/1', { method: 'DELETE' })).resolves.toBeUndefined();
  });

  it('помилка зберігає status, code і requestId', async () => {
    mockFetch(
      () =>
        new Response(
          JSON.stringify({ success: false, statusCode: 429, message: 'Забагато спроб', code: 'TOO_MANY_REQUESTS', requestId: 'req-1' }),
          { status: 429 },
        ),
    );
    const { apiFetch } = await loadHttp();
    await expect(apiFetch('/x')).rejects.toMatchObject({ status: 429, code: 'TOO_MANY_REQUESTS', requestId: 'req-1' });
  });

  it('клієнт не пише жодних даних у localStorage/sessionStorage і не шле Authorization', async () => {
    const local = vi.spyOn(Storage.prototype, 'setItem');
    mockFetch((url) => {
      if (url.endsWith('/auth/csrf')) return ok({ csrfToken: 't' });
      if (url.endsWith('/auth/login')) return ok({ user: { id: 'u1' } });
      return ok({});
    });
    const { apiFetchAuth, apiFetch } = await loadHttp();

    await apiFetch('/auth/login', { method: 'POST', body: JSON.stringify({ email: 'a@b.c', password: 'x' }) });
    await apiFetchAuth('/games', { method: 'POST', body: '{}' });

    expect(local).not.toHaveBeenCalled();
    expect(window.localStorage.length).toBe(0);
    expect(window.sessionStorage.length).toBe(0);
    for (const call of calls) expect(header(call, 'authorization')).toBeNull();
  });
});
