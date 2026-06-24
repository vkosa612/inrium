import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: Transporter | null = null;

  constructor(private readonly config: ConfigService) {}

  isConfigured(): boolean {
    const host = this.config.get<string>('SMTP_HOST');
    return !!host?.trim();
  }

  private getSiteUrl(): string {
    const siteUrl = this.config.get<string>('SITE_URL');
    if (siteUrl?.trim()) return siteUrl.replace(/\/$/, '');
    const cors = this.config.get<string>('CORS_ORIGIN', 'http://localhost:3000');
    return cors.split(',')[0].trim().replace(/\/$/, '');
  }

  private getTransporter(): Transporter {
    if (!this.transporter) {
      const port = this.config.get<number>('SMTP_PORT', 587);
      const secure = this.config.get<string>('SMTP_SECURE', 'false') === 'true';
      this.transporter = nodemailer.createTransport({
        host: this.config.get<string>('SMTP_HOST'),
        port,
        secure,
        auth: {
          user: this.config.get<string>('SMTP_USER'),
          pass: this.config.get<string>('SMTP_PASS'),
        },
      });
    }
    return this.transporter;
  }

  async sendMail(options: {
    to: string;
    subject: string;
    text: string;
    html: string;
  }): Promise<boolean> {
    if (!this.isConfigured()) return false;

    const from = this.config.get<string>('SMTP_FROM', 'noreply@inrium.local');
    try {
      await this.getTransporter().sendMail({
        from,
        to: options.to,
        subject: options.subject,
        text: options.text,
        html: options.html,
      });
      return true;
    } catch (err) {
      this.logger.error(`Failed to send email to ${options.to}`, err);
      return false;
    }
  }

  async sendVerificationEmail(email: string, token: string): Promise<void> {
    const url = `${this.getSiteUrl()}/verify-email?token=${encodeURIComponent(token)}`;
    const subject = 'Підтвердження email — INRIUM';
    const text = `Підтвердіть ваш email, перейшовши за посиланням: ${url}`;
    const html = `<p>Підтвердіть ваш email на INRIUM:</p><p><a href="${url}">${url}</a></p>`;

    const sent = await this.sendMail({ to: email, subject, text, html });
    if (!sent && this.config.get<string>('NODE_ENV') !== 'production') {
      this.logger.warn(
        `[dev-only] SMTP not configured. Verification link for ${email}: ${url}`,
      );
    }
  }

  async sendPasswordResetEmail(email: string, token: string): Promise<void> {
    const url = `${this.getSiteUrl()}/reset-password?token=${encodeURIComponent(token)}`;
    const subject = 'Скидання пароля — INRIUM';
    const text = `Скиньте пароль, перейшовши за посиланням (діє 1 год): ${url}`;
    const html = `<p>Запит на скидання пароля INRIUM:</p><p><a href="${url}">${url}</a></p><p>Посилання дійсне 1 годину.</p>`;

    const sent = await this.sendMail({ to: email, subject, text, html });
    if (!sent && this.config.get<string>('NODE_ENV') !== 'production') {
      this.logger.warn(
        `[dev-only] SMTP not configured. Password reset link for ${email}: ${url}`,
      );
    }
  }
}
