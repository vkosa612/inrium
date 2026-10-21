import type { NextConfig } from 'next';
import path from 'path';

const isProd = process.env.NODE_ENV === 'production';

/**
 * Внутрішня адреса backend (вкл. префікс /api) для проксі `/api/*`.
 * ВАЖЛИВО: rewrites обчислюються під час збірки, тому BACKEND_URL має бути відомий на етапі `next build`
 * (у Docker — build arg). Браузер ходить на same-origin `/api`, тож cookie — first-party, CORS не потрібен.
 */
const backendUrl = (process.env.BACKEND_URL ?? 'http://localhost:4200/api').replace(/\/$/, '');

/** Домени CAPTCHA додаються до CSP лише якщо провайдер увімкнено під час збірки. */
function captchaSources(): { script: string[]; frame: string[]; connect: string[] } {
  const provider = (process.env.NEXT_PUBLIC_CAPTCHA_PROVIDER ?? '').toLowerCase();
  if (provider === 'turnstile') {
    const host = 'https://challenges.cloudflare.com';
    return { script: [host], frame: [host], connect: [host] };
  }
  if (provider === 'hcaptcha') {
    const hosts = ['https://hcaptcha.com', 'https://*.hcaptcha.com'];
    return { script: hosts, frame: hosts, connect: hosts };
  }
  return { script: [], frame: [], connect: [] };
}

function contentSecurityPolicy(): string {
  const captcha = captchaSources();
  const directives: Array<[string, string[]]> = [
    ['default-src', ["'self'"]],
    // Next.js вставляє inline-скрипти гідратації (без nonce) → 'unsafe-inline'; eval лише в dev (HMR).
    ['script-src', ["'self'", "'unsafe-inline'", ...(isProd ? [] : ["'unsafe-eval'"]), ...captcha.script]],
    ['style-src', ["'self'", "'unsafe-inline'"]],
    ['img-src', ["'self'", 'data:', 'blob:', 'https:']],
    ['font-src', ["'self'", 'data:']],
    ['connect-src', ["'self'", ...captcha.connect, ...(isProd ? [] : ['ws:', 'wss:'])]],
    ['frame-src', captcha.frame.length ? captcha.frame : ["'none'"]],
    ['frame-ancestors', ["'none'"]],
    ['object-src', ["'none'"]],
    ['base-uri', ["'self'"]],
    ['form-action', ["'self'"]],
  ];
  return directives.map(([name, values]) => `${name} ${values.join(' ')}`).join('; ');
}

const securityHeaders = [
  { key: 'Content-Security-Policy', value: contentSecurityPolicy() },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=()' },
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
  // HSTS ігнорується браузером по http, тож безпечно лишати у production; preload/includeSubDomains — рішення власника.
  ...(isProd ? [{ key: 'Strict-Transport-Security', value: 'max-age=15552000' }] : []),
];

/** Сторінки з особистими даними/одноразовими токенами не кешуються й не передають Referer. */
const PRIVATE_PATHS = [
  '/login',
  '/register',
  '/forgot-password',
  '/profile',
  '/my/:path*',
  '/admin/:path*',
  '/admin',
];
const TOKEN_PATHS = ['/reset-password', '/verify-email'];

const nextConfig: NextConfig = {
  output: 'standalone',
  poweredByHeader: false,
  outputFileTracingRoot: path.join(__dirname, '../../'),
  transpilePackages: [
    'react-markdown',
    'remark-gfm',
    'remark-parse',
    'remark-rehype',
    'rehype-stringify',
    'unified',
    'vfile',
    'unist-util-visit',
  ],
  async rewrites() {
    return [{ source: '/api/:path*', destination: `${backendUrl}/:path*` }];
  },
  async redirects() {
    return [
      { source: '/kits', destination: '/', permanent: true },
      { source: '/kits/:slug', destination: '/', permanent: true },
      { source: '/admin/kits', destination: '/admin', permanent: true },
      { source: '/admin/kits/:path*', destination: '/admin', permanent: true },
    ];
  },
  async headers() {
    return [
      { source: '/:path*', headers: securityHeaders },
      ...PRIVATE_PATHS.map((source) => ({
        source,
        headers: [{ key: 'Cache-Control', value: 'no-store' }],
      })),
      ...TOKEN_PATHS.map((source) => ({
        source,
        headers: [
          { key: 'Cache-Control', value: 'no-store' },
          { key: 'Referrer-Policy', value: 'no-referrer' },
        ],
      })),
    ];
  },
};

export default nextConfig;
