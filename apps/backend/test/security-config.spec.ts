import { ConfigService } from '@nestjs/config';
import { SecurityConfigService, normalizeOrigin } from '../src/common/security/security-config.service';

function build(values: Record<string, string>): SecurityConfigService {
  return new SecurityConfigService(
    new ConfigService({
      CORS_ORIGIN: 'https://app.example.test, https://admin.example.test/',
      SITE_URL: 'https://app.example.test',
      CSRF_SECRET: 'x'.repeat(40),
      ...values,
    }),
  );
}

describe('SecurityConfigService', () => {
  it('production: cookie завжди Secure, навіть якщо COOKIE_SECURE=false', () => {
    const cfg = build({ NODE_ENV: 'production', COOKIE_SECURE: 'false' });
    expect(cfg.cookieSecure).toBe(true);
    expect(cfg.cookieAttributes('/')).toMatchObject({ httpOnly: true, secure: true, sameSite: 'lax' });
  });

  it('development: локальний HTTP працює без Secure', () => {
    const cfg = build({ NODE_ENV: 'development', COOKIE_SECURE: 'false' });
    expect(cfg.cookieSecure).toBe(false);
  });

  it('allowlist origin: нормалізує, дедуплікує, враховує SITE_URL і відхиляє чужі/схожі', () => {
    const cfg = build({ NODE_ENV: 'production' });
    expect(cfg.allowedOrigins.sort()).toEqual(['https://admin.example.test', 'https://app.example.test']);
    expect(cfg.isOriginAllowed('https://app.example.test')).toBe(true);
    expect(cfg.isOriginAllowed('https://app.example.test/')).toBe(true);
    expect(cfg.isOriginAllowed('http://app.example.test')).toBe(false);
    expect(cfg.isOriginAllowed('https://app.example.test.evil.test')).toBe(false);
    expect(cfg.isOriginAllowed('https://evil.test')).toBe(false);
    expect(cfg.isOriginAllowed('null')).toBe(false);
    expect(cfg.isOriginAllowed('')).toBe(false);
  });

  it('cross-origin режим: SameSite=None та Domain передаються в атрибути cookie', () => {
    const cfg = build({ NODE_ENV: 'production', COOKIE_SAMESITE: 'none', COOKIE_DOMAIN: '.example.test' });
    expect(cfg.cookieAttributes('/api/auth')).toEqual({
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      path: '/api/auth',
      domain: '.example.test',
    });
  });

  it('normalizeOrigin відкидає не-http(s) схеми', () => {
    expect(normalizeOrigin('javascript:alert(1)')).toBeNull();
    expect(normalizeOrigin('ftp://x.test')).toBeNull();
    expect(normalizeOrigin('https://x.test/path?q=1')).toBe('https://x.test');
  });
});
