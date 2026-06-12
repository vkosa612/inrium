'use client';

const FOOTER_LINKS = {
  Матеріали: [
    { label: 'Новини', href: '/news' },
    { label: 'Статті', href: '/articles' },
    { label: 'Огляди', href: '/reviews' },
    { label: 'Набори', href: '/kits' },
  ],
  Системи: [
    { label: 'D&D 5e', href: '/systems/dnd-5e' },
    { label: 'Pathfinder 2e', href: '/systems/pathfinder-2e' },
    { label: 'Call of Cthulhu', href: '/systems/coc' },
    { label: 'Усі системи', href: '/systems' },
  ],
  Спільнота: [
    { label: 'Знайти гру', href: '/games' },
    { label: 'Майстри', href: '/masters' },
    { label: 'Спільноти', href: '/communities' },
    { label: 'Події', href: '/events' },
  ],
  Допомога: [
    { label: 'Для новачків', href: '/help/start' },
    { label: 'FAQ', href: '/help/faq' },
    { label: 'Контакти', href: '/contacts' },
    { label: 'Про нас', href: '/about' },
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
            gridTemplateColumns: 'auto repeat(4, 1fr)',
            gap: 40,
            marginBottom: 40,
          }}
        >
          {/* Brand */}
          <div>
            <a
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
            </a>
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
                    <a
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
                    </a>
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
          <div style={{ display: 'flex', gap: 16, fontSize: 12, color: '#475569' }}>
            <a href="/privacy" style={{ color: 'inherit', textDecoration: 'none' }}>Приватність</a>
            <a href="/terms" style={{ color: 'inherit', textDecoration: 'none' }}>Умови</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
