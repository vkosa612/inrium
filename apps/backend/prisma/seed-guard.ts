/**
 * Захист seed від небезпечних значень у production.
 *
 * Локально (NODE_ENV != production) діють зручні демо-значення за замовчуванням.
 * У production seed:
 *   - не запускається без явного ALLOW_PRODUCTION_SEED=true;
 *   - потребує явно заданих SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD (жодних дефолтів);
 *   - відхиляє відомі демо-паролі, короткі/прості паролі та службові домени (.local, example.*);
 *   - не створює демо-користувачів (editor/GM) без явних облікових даних і не створює демо-ігри/спільноти.
 */

export interface SeedCredentials {
  email: string;
  password: string;
}

export interface SeedPlan {
  production: boolean;
  admin: SeedCredentials;
  editor: SeedCredentials | null;
  gm: SeedCredentials | null;
  /** Демо-ігри та демо-спільноти (лише поза production). */
  includeDemoGamesAndCommunities: boolean;
}

export const KNOWN_DEMO_PASSWORDS = ['admin12345!', 'editor12345!', 'gm12345!', 'password', 'password123', 'changeme'];

const DEV_DEFAULTS = {
  admin: { email: 'admin@inrium.local', password: 'Admin12345!' },
  editor: { email: 'editor@inrium.local', password: 'Editor12345!' },
  gm: { email: 'gm@inrium.local', password: 'Gm12345!' },
} as const;

export class UnsafeSeedConfigError extends Error {}

function assertProductionCredentials(label: string, creds: SeedCredentials): void {
  const email = creds.email.toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new UnsafeSeedConfigError(`${label}: некоректний email`);
  }
  const domain = email.split('@')[1];
  if (domain.endsWith('.local') || domain.endsWith('.test') || /^example\./.test(domain) || domain === 'localhost') {
    throw new UnsafeSeedConfigError(`${label}: службовий/тестовий домен "${domain}" заборонений у production`);
  }
  const password = creds.password;
  if (KNOWN_DEMO_PASSWORDS.includes(password.toLowerCase())) {
    throw new UnsafeSeedConfigError(`${label}: відомий демо-пароль заборонений у production`);
  }
  if (password.length < 12 || !/[A-Za-z]/.test(password) || !/\d/.test(password)) {
    throw new UnsafeSeedConfigError(`${label}: пароль має містити щонайменше 12 символів, літери та цифри`);
  }
}

function explicit(env: NodeJS.ProcessEnv, emailKey: string, passwordKey: string): SeedCredentials | null {
  const email = env[emailKey]?.trim();
  const password = env[passwordKey];
  if (!email && !password) return null;
  if (!email || !password) {
    throw new UnsafeSeedConfigError(`${emailKey} і ${passwordKey} потрібно задавати разом`);
  }
  return { email, password };
}

export function resolveSeedPlan(env: NodeJS.ProcessEnv = process.env): SeedPlan {
  const production = env.NODE_ENV === 'production';

  if (!production) {
    return {
      production,
      admin: explicit(env, 'SEED_ADMIN_EMAIL', 'SEED_ADMIN_PASSWORD') ?? DEV_DEFAULTS.admin,
      editor: explicit(env, 'SEED_EDITOR_EMAIL', 'SEED_EDITOR_PASSWORD') ?? DEV_DEFAULTS.editor,
      gm: explicit(env, 'SEED_GM_EMAIL', 'SEED_GM_PASSWORD') ?? DEV_DEFAULTS.gm,
      includeDemoGamesAndCommunities: true,
    };
  }

  if (env.ALLOW_PRODUCTION_SEED !== 'true') {
    throw new UnsafeSeedConfigError(
      'Seed у production заблоковано. Якщо це свідомий перший запуск, задайте ALLOW_PRODUCTION_SEED=true.',
    );
  }

  const admin = explicit(env, 'SEED_ADMIN_EMAIL', 'SEED_ADMIN_PASSWORD');
  if (!admin) {
    throw new UnsafeSeedConfigError('У production потрібно явно задати SEED_ADMIN_EMAIL та SEED_ADMIN_PASSWORD.');
  }
  assertProductionCredentials('SEED_ADMIN', admin);

  const editor = explicit(env, 'SEED_EDITOR_EMAIL', 'SEED_EDITOR_PASSWORD');
  if (editor) assertProductionCredentials('SEED_EDITOR', editor);
  const gm = explicit(env, 'SEED_GM_EMAIL', 'SEED_GM_PASSWORD');
  if (gm) assertProductionCredentials('SEED_GM', gm);

  return { production, admin, editor, gm, includeDemoGamesAndCommunities: false };
}
