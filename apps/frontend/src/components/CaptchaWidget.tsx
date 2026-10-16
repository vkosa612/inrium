'use client';

import { useEffect, useRef } from 'react';

/**
 * CAPTCHA-віджет (Cloudflare Turnstile / hCaptcha) за налаштуваннями збірки:
 *   NEXT_PUBLIC_CAPTCHA_PROVIDER = turnstile | hcaptcha | test | (порожньо = вимкнено)
 *   NEXT_PUBLIC_CAPTCHA_SITE_KEY = публічний site key провайдера
 *
 * `test` — лише для автоматизованих тестів (backend приймає детермінований токен лише поза production).
 * Серверна перевірка — на backend (`CAPTCHA_REQUIRED`, `CAPTCHA_SECRET_KEY`); тут тільки отримання токена.
 */
const PROVIDER = (process.env.NEXT_PUBLIC_CAPTCHA_PROVIDER ?? '').toLowerCase();
const SITE_KEY = process.env.NEXT_PUBLIC_CAPTCHA_SITE_KEY ?? '';
export const TEST_CAPTCHA_TOKEN = 'test-captcha-pass';

export function isCaptchaEnabled(): boolean {
  if (PROVIDER === 'test') return true;
  return (PROVIDER === 'turnstile' || PROVIDER === 'hcaptcha') && SITE_KEY.length > 0;
}

interface CaptchaApi {
  render(
    container: HTMLElement,
    options: {
      sitekey: string;
      callback: (token: string) => void;
      'expired-callback': () => void;
      'error-callback': () => void;
    },
  ): string | number;
  reset(widgetId?: string | number): void;
  remove?(widgetId?: string | number): void;
}

declare global {
  interface Window {
    turnstile?: CaptchaApi;
    hcaptcha?: CaptchaApi;
  }
}

const SCRIPT_URL: Record<string, string> = {
  turnstile: 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit',
  hcaptcha: 'https://js.hcaptcha.com/1/api.js?render=explicit',
};

function loadScript(provider: 'turnstile' | 'hcaptcha'): Promise<CaptchaApi> {
  return new Promise((resolve, reject) => {
    const existing = window[provider];
    if (existing) {
      resolve(existing);
      return;
    }
    let script = document.querySelector<HTMLScriptElement>(`script[data-captcha="${provider}"]`);
    if (!script) {
      script = document.createElement('script');
      script.src = SCRIPT_URL[provider];
      script.async = true;
      script.defer = true;
      script.dataset.captcha = provider;
      document.head.appendChild(script);
    }
    script.addEventListener('load', () => {
      const api = window[provider];
      if (api) resolve(api);
      else reject(new Error('CAPTCHA недоступна'));
    });
    script.addEventListener('error', () => reject(new Error('Не вдалося завантажити CAPTCHA')));
  });
}

interface CaptchaWidgetProps {
  /** Отримує токен (або null, коли він прострочений/помилка). */
  onToken: (token: string | null) => void;
  /** Змініть значення, щоб скинути віджет (токен одноразовий — після кожної спроби). */
  resetKey?: number;
}

export function CaptchaWidget({ onToken, resetKey = 0 }: CaptchaWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | number | null>(null);
  const onTokenRef = useRef(onToken);
  onTokenRef.current = onToken;

  useEffect(() => {
    if (PROVIDER === 'test') {
      onTokenRef.current(TEST_CAPTCHA_TOKEN);
      return;
    }
    if (!isCaptchaEnabled()) return;
    const provider = PROVIDER as 'turnstile' | 'hcaptcha';
    let cancelled = false;

    loadScript(provider)
      .then((api) => {
        if (cancelled || !containerRef.current || widgetIdRef.current !== null) return;
        widgetIdRef.current = api.render(containerRef.current, {
          sitekey: SITE_KEY,
          callback: (token) => onTokenRef.current(token),
          'expired-callback': () => onTokenRef.current(null),
          'error-callback': () => onTokenRef.current(null),
        });
      })
      .catch(() => onTokenRef.current(null));

    return () => {
      cancelled = true;
      const api = window[provider];
      if (api && widgetIdRef.current !== null) api.remove?.(widgetIdRef.current);
      widgetIdRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (resetKey === 0 || PROVIDER === 'test' || widgetIdRef.current === null) return;
    const api = window[PROVIDER as 'turnstile' | 'hcaptcha'];
    api?.reset(widgetIdRef.current);
    onTokenRef.current(null);
  }, [resetKey]);

  if (!isCaptchaEnabled() || PROVIDER === 'test') return null;
  return <div ref={containerRef} data-testid="captcha-widget" style={{ minHeight: 65 }} />;
}
