import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

const SEND_ATTEMPTS = 3;
const RETRY_BASE_DELAY_MS = 500;

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** a***@example.com — адреси не пишемо в логи повністю. */
function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!domain) return '***';
  return `${local.slice(0, 1)}***@${domain}`;
}

@Injectable()
export class EmailService implements OnModuleInit {
  private readonly logger = new Logger(EmailService.name);
  private transporter: Transporter | null = null;

  constructor(private readonly config: ConfigService) {}

  onModuleInit(): void {
    if (this.isProduction() && !this.isConfigured()) {
      this.logger.warn(
        'SMTP не налаштовано (SMTP_HOST порожній). Листи підтвердження/скидання пароля не надсилатимуться.',
      );
    }
  }

  isConfigured(): boolean {
    const host = this.config.get<string>('SMTP_HOST');
    return !!host?.trim();
  }

  private isProduction(): boolean {
    return this.config.get<string>('NODE_ENV') === 'production';
  }

  private getSiteUrl(): string {
    const siteUrl = this.config.get<string>('SITE_URL');
    if (siteUrl?.trim()) return siteUrl.replace(/\/$/, '');
    const cors = this.config.get<string>('CORS_ORIGIN', 'http://localhost:3000');
    return cors.split(',')[0].trim().replace(/\/$/, '');
  }

  private getTransporter(): Transporter {
    if (!this.transporter) {
      const secure = this.config.get<string>('SMTP_SECURE', 'false') === 'true';
      const user = this.config.get<string>('SMTP_USER');
      const pass = this.config.get<string>('SMTP_PASS');
      // У production STARTTLS обов'язковий, якщо не використовується implicit TLS (порт 465).
      const requireTls =
        this.config.get<string>('SMTP_REQUIRE_TLS', this.isProduction() ? 'true' : 'false') ===
        'true';

      this.transporter = nodemailer.createTransport({
        host: this.config.get<string>('SMTP_HOST'),
        port: this.config.get<number>('SMTP_PORT', 587),
        secure,
        requireTLS: !secure && requireTls,
        auth: user && pass ? { user, pass } : undefined,
        // Таймаути: SMTP не повинен «вішати» запит
        connectionTimeout: 10_000,
        greetingTimeout: 10_000,
        socketTimeout: 20_000,
        // Сертифікат сервера завжди перевіряється (rejectUnauthorized=true).
        tls: { rejectUnauthorized: true, minVersion: 'TLSv1.2' },
      });
    }
    return this.transporter;
  }

  private safeSmtpError(err: unknown): string {
    // Не логуємо SMTP-відповіді повністю (можуть містити адреси/дані); лише код і коротке повідомлення.
    // Duck typing: AggregateError (ECONNREFUSED на кількох адресах) може бути з іншого realm і не проходити instanceof.
    const e = err as { code?: unknown; message?: unknown } | null;
    const code = typeof e?.code === 'string' ? e.code : '';
    const message = typeof e?.message === 'string' ? e.message.slice(0, 200) : '';
    if (code || message) return code ? `${code}${message ? `: ${message}` : ''}` : message;
    return 'Невідома помилка SMTP';
  }

  private isPermanentFailure(err: unknown): boolean {
    const responseCode = (err as { responseCode?: number } | null)?.responseCode;
    return typeof responseCode === 'number' && responseCode >= 500;
  }

  /** У development — fallback-посилання в logs; у production/test — нічого. */
  private logDevOnlyLink(label: string, email: string, url: string): void {
    if (this.config.get<string>('NODE_ENV', 'development') !== 'development') return;
    this.logger.warn(`[dev-only] ${label} для ${email}: ${url}`);
  }

  async sendMail(options: {
    to: string;
    subject: string;
    text: string;
    html: string;
  }): Promise<boolean> {
    if (!this.isConfigured()) return false;

    const from = this.config.get<string>('SMTP_FROM', 'noreply@inrium.local');
    for (let attempt = 1; attempt <= SEND_ATTEMPTS; attempt += 1) {
      try {
        await this.getTransporter().sendMail({
          from,
          to: options.to,
          subject: options.subject,
          text: options.text,
          html: options.html,
        });
        this.logger.log(`Лист надіслано: ${maskEmail(options.to)} — «${options.subject}»`);
        return true;
      } catch (err) {
        const final = attempt === SEND_ATTEMPTS || this.isPermanentFailure(err);
        this.logger.error(
          `Помилка SMTP (${maskEmail(options.to)}, спроба ${attempt}/${SEND_ATTEMPTS}): ${this.safeSmtpError(err)}`,
        );
        if (final) return false;
        await new Promise((resolve) => setTimeout(resolve, RETRY_BASE_DELAY_MS * attempt));
      }
    }
    return false;
  }

  async sendVerificationEmail(email: string, token: string): Promise<void> {
    const url = `${this.getSiteUrl()}/verify-email?token=${encodeURIComponent(token)}`;
    const subject = 'Підтвердження email — INRIUM';
    const text = `Підтвердіть ваш email, перейшовши за посиланням (діє 24 год): ${url}`;
    const html = `<p>Підтвердіть ваш email на INRIUM:</p><p><a href="${escapeHtml(url)}">${escapeHtml(url)}</a></p><p>Посилання дійсне 24 години.</p>`;

    const sent = await this.sendMail({ to: email, subject, text, html });
    if (!sent) {
      this.logDevOnlyLink('Посилання підтвердження email', email, url);
    }
  }

  async sendPasswordResetEmail(email: string, token: string): Promise<void> {
    const url = `${this.getSiteUrl()}/reset-password?token=${encodeURIComponent(token)}`;
    const subject = 'Скидання пароля — INRIUM';
    const text = `Скиньте пароль, перейшовши за посиланням (діє 1 год): ${url}`;
    const html = `<p>Запит на скидання пароля INRIUM:</p><p><a href="${escapeHtml(url)}">${escapeHtml(url)}</a></p><p>Посилання дійсне 1 годину. Якщо це були не ви — просто ігноруйте лист.</p>`;

    const sent = await this.sendMail({ to: email, subject, text, html });
    if (!sent) {
      this.logDevOnlyLink('Посилання скидання пароля', email, url);
    }
  }

  /** Лист для спроби повторної реєстрації існуючої адреси (замість відповіді 409 — без enumeration). */
  async sendAccountExistsEmail(email: string): Promise<void> {
    const loginUrl = `${this.getSiteUrl()}/login`;
    const resetUrl = `${this.getSiteUrl()}/forgot-password`;
    const subject = 'Спроба реєстрації — INRIUM';
    const text = `Для цієї адреси вже існує акаунт INRIUM. Увійти: ${loginUrl}. Забули пароль: ${resetUrl}. Якщо це були не ви — просто ігноруйте лист.`;
    const html = `<p>Для цієї адреси вже існує акаунт INRIUM.</p><p><a href="${escapeHtml(loginUrl)}">Увійти</a> · <a href="${escapeHtml(resetUrl)}">Забули пароль?</a></p><p>Якщо це були не ви — просто ігноруйте лист.</p>`;

    await this.sendMail({ to: email, subject, text, html });
  }
}
