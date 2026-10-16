import type { ConfigService } from '@nestjs/config';
import { EmailService } from '../src/modules/email/email.service';

/**
 * Реальна SMTP-доставка у локальну пастку Mailpit (НЕ підміна EmailService).
 * Запускається лише коли задано MAILPIT_API_URL (див. docs/EMAIL_PRODUCTION_SETUP.md):
 *   docker compose -f docker-compose.test.yml --profile mail up -d --wait mailpit-test
 *   MAILPIT_API_URL=http://127.0.0.1:18025 MAILPIT_SMTP_PORT=11025 pnpm --filter @inrium/backend test email-smtp
 * Доставка через реального провайдера (SPF/DKIM/DMARC, потрапляння у «Вхідні») цим тестом НЕ перевіряється.
 */
const API = process.env.MAILPIT_API_URL?.replace(/\/$/, '');
const SMTP_PORT = process.env.MAILPIT_SMTP_PORT ?? '11025';
const describeMailpit = API ? describe : describe.skip;

function configFor(values: Record<string, string>): ConfigService {
  return {
    get: (key: string, fallback?: unknown) => (key in values ? values[key] : fallback),
  } as unknown as ConfigService;
}

interface MailpitMessage {
  ID: string;
  Subject: string;
  To: Array<{ Address: string }>;
  From: { Address: string };
}

async function waitForMessage(to: string): Promise<MailpitMessage> {
  for (let i = 0; i < 30; i += 1) {
    const res = await fetch(`${API}/api/v1/search?query=${encodeURIComponent(`to:${to}`)}`);
    const body = (await res.json()) as { messages?: MailpitMessage[] };
    if (body.messages && body.messages.length > 0) return body.messages[0];
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error(`Лист для ${to} не з'явився у Mailpit`);
}

async function messageText(id: string): Promise<{ Text: string; HTML: string }> {
  const res = await fetch(`${API}/api/v1/message/${id}`);
  return (await res.json()) as { Text: string; HTML: string };
}

describeMailpit('EmailService → реальний SMTP (Mailpit)', () => {
  const service = new EmailService(
    configFor({
      NODE_ENV: 'test',
      SMTP_HOST: '127.0.0.1',
      SMTP_PORT: SMTP_PORT,
      SMTP_SECURE: 'false',
      SMTP_FROM: 'INRIUM <no-reply@inrium.test>',
      SITE_URL: 'https://inrium.example',
    }),
  );

  beforeAll(async () => {
    await fetch(`${API}/api/v1/messages`, { method: 'DELETE' });
  });

  it('надсилає лист підтвердження з коректним посиланням і токеном', async () => {
    const to = `verify-${Date.now()}@example.test`;
    const token = 'tok_абв+/= 123';
    await service.sendVerificationEmail(to, token);

    const msg = await waitForMessage(to);
    expect(msg.Subject).toContain('Підтвердження email');
    expect(msg.From.Address).toBe('no-reply@inrium.test');
    const body = await messageText(msg.ID);
    expect(body.Text).toContain(`https://inrium.example/verify-email?token=${encodeURIComponent(token)}`);
    // Сирий токен із небезпечними символами не потрапляє в URL без кодування.
    expect(body.Text).not.toContain('token=tok_абв');
  });

  it('надсилає лист скидання пароля', async () => {
    const to = `reset-${Date.now()}@example.test`;
    await service.sendPasswordResetEmail(to, 'reset-token-1');

    const msg = await waitForMessage(to);
    expect(msg.Subject).toContain('Скидання пароля');
    const body = await messageText(msg.ID);
    expect(body.Text).toContain('https://inrium.example/reset-password?token=reset-token-1');
  });

  it('надсилає лист «акаунт уже існує» без токенів/секретів', async () => {
    const to = `exists-${Date.now()}@example.test`;
    await service.sendAccountExistsEmail(to);

    const msg = await waitForMessage(to);
    expect(msg.Subject).toContain('Спроба реєстрації');
    const body = await messageText(msg.ID);
    expect(body.Text).toContain('https://inrium.example/login');
    expect(body.Text).not.toMatch(/token=/);
  });

  it('екранує HTML у посиланні', async () => {
    const to = `xss-${Date.now()}@example.test`;
    await service.sendVerificationEmail(to, '"><script>alert(1)</script>');

    const msg = await waitForMessage(to);
    const body = await messageText(msg.ID);
    expect(body.HTML).not.toContain('<script>');
  });
});

describe('EmailService: відмова SMTP не ламає запит', () => {
  it('повертає false (не кидає виняток), якщо SMTP недоступний', async () => {
    const service = new EmailService(
      configFor({ NODE_ENV: 'test', SMTP_HOST: '127.0.0.1', SMTP_PORT: '1', SMTP_FROM: 'a@b.test', SITE_URL: 'https://x.example' }),
    );
    await expect(service.sendMail({ to: 'a@b.test', subject: 's', text: 't', html: '<p>t</p>' })).resolves.toBe(false);
  });

  it('повертає false, якщо SMTP не налаштований', async () => {
    const service = new EmailService(configFor({ NODE_ENV: 'test' }));
    await expect(service.sendMail({ to: 'a@b.test', subject: 's', text: 't', html: 'h' })).resolves.toBe(false);
  });
});
