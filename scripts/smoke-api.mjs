#!/usr/bin/env node
// Реальний API-smoke проти запущеного стеку (через публічний вхід frontend: same-origin /api).
// Використання: node scripts/smoke-api.mjs [BASE_URL]   (за замовчуванням http://127.0.0.1:3000)
// Створює одного тестового користувача (унікальний email @smoke.invalid). Нічого не видаляє.
// Не підміняє перевірки: кожен крок — реальний HTTP-запит; будь-який збій → код виходу 1.
import { randomBytes } from 'node:crypto';

const BASE = (process.argv[2] ?? 'http://127.0.0.1:3000').replace(/\/$/, '');
const API = `${BASE}/api`;
const results = [];
let jar = {};
let csrfToken = '';

function record(name, ok, detail = '') {
  results.push({ name, ok });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
}

function parseSetCookie(res) {
  const raw = res.headers.getSetCookie?.() ?? [];
  const out = [];
  for (const line of raw) {
    const [pair, ...attrs] = line.split(';').map((s) => s.trim());
    const idx = pair.indexOf('=');
    out.push({
      name: pair.slice(0, idx),
      value: pair.slice(idx + 1),
      attrs: attrs.map((a) => a.toLowerCase()),
    });
  }
  return out;
}

function absorb(res) {
  const cookies = parseSetCookie(res);
  for (const c of cookies) {
    if (c.value === '' || c.attrs.some((a) => a.startsWith('max-age=0') || a.startsWith('expires=thu, 01 jan 1970'))) {
      delete jar[c.name];
    } else {
      jar[c.name] = c.value;
    }
  }
  return cookies;
}

async function call(method, path, { body, csrf = false, origin = BASE, noCookies = false } = {}) {
  const headers = { Accept: 'application/json' };
  if (origin) headers.Origin = origin;
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (!noCookies && Object.keys(jar).length) {
    headers.Cookie = Object.entries(jar)
      .map(([k, v]) => `${k}=${v}`)
      .join('; ');
  }
  if (csrf && csrfToken) headers['X-CSRF-Token'] = csrfToken;
  const res = await fetch(`${API}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    redirect: 'manual',
  });
  const cookies = absorb(res);
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    /* не JSON */
  }
  return { status: res.status, json, text, cookies };
}

async function loadCsrf() {
  const res = await call('GET', '/auth/csrf');
  csrfToken = res.json?.data?.csrfToken ?? '';
  return res;
}

const email = `smoke-${randomBytes(5).toString('hex')}@smoke.invalid`;
const password = `Sm0ke-${randomBytes(9).toString('base64url')}`;

try {
  let r = await call('GET', '/health');
  record('GET /health = 200', r.status === 200, `status ${r.status}`);

  r = await call('GET', '/auth/me');
  record('GET /auth/me без сесії = 401 AUTH_REQUIRED', r.status === 401 && r.json?.error?.code === 'AUTH_REQUIRED' || r.json?.code === 'AUTH_REQUIRED', `status ${r.status}`);

  r = await loadCsrf();
  record('GET /auth/csrf видає токен', r.status === 200 && csrfToken.includes('.'), `status ${r.status}`);
  r = await call('POST', '/auth/register', { body: { email, password, displayName: 'Smoke User' }, csrf: true });
  record('POST /auth/register = 202 (однакова відповідь, не розкриває існування email)', r.status === 202, `status ${r.status}`);

  r = await call('POST', '/auth/login', { body: { email, password }, csrf: true });
  record('POST /auth/login = 200', r.status === 200, `status ${r.status}`);
  const byName = Object.fromEntries(r.cookies.map((c) => [c.name, c]));
  record('cookie inrium_at: HttpOnly + SameSite', !!byName.inrium_at && byName.inrium_at.attrs.includes('httponly') && byName.inrium_at.attrs.some((a) => a.startsWith('samesite=')));
  record(
    'cookie inrium_rt: HttpOnly + path=/api/auth',
    !!byName.inrium_rt && byName.inrium_rt.attrs.includes('httponly') && byName.inrium_rt.attrs.includes('path=/api/auth'),
  );
  await loadCsrf(); // токен прив'язаний до сесії - після входу отримуємо новий
  record('CSRF-токен після входу отримано', csrfToken.includes('.'));
  record('токени відсутні в тілі відповіді login', !/eyJ[A-Za-z0-9_-]{10,}\./.test(r.text), 'JWT у JSON не знайдено');

  r = await call('GET', '/auth/me');
  record('GET /auth/me із cookie = 200', r.status === 200, `status ${r.status}`);

  r = await call('POST', '/auth/logout', { csrf: false });
  record('POST /auth/logout без X-CSRF-Token = 403', r.status === 403, `status ${r.status}`);

  r = await call('POST', '/auth/logout', { csrf: true, origin: 'https://evil.example' });
  record('POST із чужим Origin = 403 (навіть із CSRF-токеном)', r.status === 403, `status ${r.status}`);

  r = await call('POST', '/auth/refresh', { csrf: true });
  record('POST /auth/refresh із cookie + CSRF = 200/201', r.status === 200 || r.status === 201, `status ${r.status}`);

  r = await call('POST', '/auth/logout', { csrf: true });
  record('POST /auth/logout із CSRF = 2xx', r.status >= 200 && r.status < 300, `status ${r.status}`);

  r = await call('GET', '/auth/me');
  record('GET /auth/me після logout = 401', r.status === 401, `status ${r.status}`);

  await loadCsrf();
  r = await call('POST', '/auth/login', { body: { email, password: 'wrong-password-123' }, csrf: true });
  record('login з хибним паролем = 401', r.status === 401, `status ${r.status}`);

  const unknown = await call('POST', '/auth/login', { body: { email: `nobody-${randomBytes(4).toString('hex')}@smoke.invalid`, password: 'wrong-password-123' }, csrf: true });
  record(
    'anti-enumeration: однакова відповідь для невідомого email і хибного пароля',
    unknown.status === r.status && unknown.json?.error?.message === r.json?.error?.message && unknown.json?.message === r.json?.message,
  );

  const pub = await fetch(`${BASE}/`, { redirect: 'manual' });
  record('Frontend / = 200', pub.status === 200, `status ${pub.status}`);
  const robots = await fetch(`${BASE}/robots.txt`);
  record('Frontend /robots.txt = 200', robots.status === 200, `status ${robots.status}`);
  const privacy = await fetch(`${BASE}/privacy`);
  record('Frontend /privacy = 200', privacy.status === 200, `status ${privacy.status}`);
} catch (err) {
  record('smoke виконано без винятків', false, String(err));
}

const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} PASS${failed ? `, ${failed} FAIL` : ''}`);
process.exit(failed ? 1 : 0);
