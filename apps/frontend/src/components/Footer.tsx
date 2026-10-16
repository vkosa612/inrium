'use client';

import Link from 'next/link';

const FOOTER_LINKS = {
  Платформа: [
    { label: 'Головна', href: '/' },
    { label: 'Ігри', href: '/games' },
    { label: 'Спільноти', href: '/communities' },
  ],
  Матеріали: [
    { label: 'Новини', href: '/news' },
    { label: 'Статті', href: '/articles' },
    { label: 'Системи', href: '/systems' },
    { label: 'Набори', href: '/kits' },
    { label: 'Довідка', href: '/help' },
  ],
  'Про нас': [
    { label: 'Про INRIUM', href: '/about' },
    { label: 'Контакти', href: '/contacts' },
    { label: 'Реклама', href: '/advertise' },
    { label: 'Умови використання', href: '/terms' },
    { label: 'Політика приватності', href: '/privacy' },
  ],
};

export default function Footer() {
  return (
    <footer
      style={{
        borderTop: '1px solid var(--border)',
        background: 'var(--bg-card)',
        marginTop: 64,
      }}
    >
      <div className="mx-auto max-w-7xl px-4" style={{ padding: '48px 24px 24px' }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'auto repeat(3, 1fr)',
            gap: 40,
            marginBottom: 40,
          }}
        >
          {/* Brand */}
          <div>
            <Link
              href="/"
              style={{ textDecoration: 'none', display: 'block', marginBottom: 12 }}
            >
              <span
                style={{
                  fontSize: 22,
                  fontWeight: 800,
                  letterSpacing: '0.12em',
                  color: 'var(--accent)',
                }}
              >
                INRIUM
              </span>
            </Link>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6, maxWidth: 200 }}>
              Портал для настільних рольових ігор. Знайди свою пригоду.
            </p>
          </div>

          {/* Links */}
          {Object.entries(FOOTER_LINKS).map(([section, links]) => (
            <div key={section}>
              <h4
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: '#94a3b8',
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  marginBottom: 12,
                }}
              >
                {section}
              </h4>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      style={{
                        fontSize: 13,
                        color: 'var(--text-muted)',
                        textDecoration: 'none',
                        transition: 'color 0.15s',
                      }}
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLAnchorElement).style.color = '#e2e8f0';
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLAnchorElement).style.color = 'var(--text-muted)';
                      }}
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom */}
        <div
          style={{
            borderTop: '1px solid var(--border)',
            paddingTop: 20,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 12,
          }}
        >
          <span style={{ fontSize: 12, color: '#475569' }}>
            © {new Date().getFullYear()} INRIUM. Усі права захищено.
          </span>
        </div>
      </div>
    </footer>
  );
}
