export interface OutboxMessage {
  kind: 'verification' | 'password-reset' | 'account-exists';
  to: string;
  /** Сирий токен із листа (лише для verification / password-reset). */
  token?: string;
}

/** Підміна EmailService: зберігає «надіслані» листи в пам'яті. Реальна SMTP-доставка тут НЕ перевіряється. */
export class MailOutbox {
  readonly messages: OutboxMessage[] = [];

  isConfigured(): boolean {
    return true;
  }

  async sendMail(): Promise<boolean> {
    return true;
  }

  async sendVerificationEmail(to: string, token: string): Promise<void> {
    this.messages.push({ kind: 'verification', to, token });
  }

  async sendPasswordResetEmail(to: string, token: string): Promise<void> {
    this.messages.push({ kind: 'password-reset', to, token });
  }

  async sendAccountExistsEmail(to: string): Promise<void> {
    this.messages.push({ kind: 'account-exists', to });
  }

  clear(): void {
    this.messages.length = 0;
  }

  last(kind: OutboxMessage['kind'], to?: string): OutboxMessage | undefined {
    return [...this.messages].reverse().find((m) => m.kind === kind && (!to || m.to === to));
  }

  count(kind?: OutboxMessage['kind'], to?: string): number {
    return this.messages.filter((m) => (!kind || m.kind === kind) && (!to || m.to === to)).length;
  }
}
