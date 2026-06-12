'use client';

const NAV_LINKS = [
  { label: 'Новини', href: '/news' },
  { label: 'Ігрові системи', href: '/systems' },
  { label: 'Статті', href: '/articles' },
  { label: 'Набори', href: '/kits' },
  { label: 'Спільнота', href: '/community' },
  { label: 'Допомога', href: '/help' },
];

export default function Header() {
  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 50,
        backgroundColor: 'rgba(12, 12, 20, 0.95)',
        borderBottom: '1px solid var(--border)',
        backdropFilter: 'blur(12px)',
      }}
    >
      {/* Top bar */}
      <div
        style={{
          borderBottom: '1px solid var(--border)',
          background: 'var(--bg-card)',
          padding: '6px 0',
        }}
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4">
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            TTRPG-портал для гравців і майстрів
          </span>
          <div style={{ display: 'flex', gap: 16, fontSize: 12, color: 'var(--text-muted)' }}>
            <a href="/about" style={{ color: 'inherit', textDecoration: 'none' }}>
              Про нас
            </a>
            <a href="/advertise" style={{ color: 'inherit', textDecoration: 'none' }}>
              Реклама
            </a>
            <a href="/contacts" style={{ color: 'inherit', textDecoration: 'none' }}>
              Контакти
            </a>
          </div>
        </div>
      </div>

      {/* Main header */}
      <div className="mx-auto flex max-w-7xl items-center gap-8 px-4 py-3">
        {/* Logo */}
        <a
          href="/"
          style={{ textDecoration: 'none', flexShrink: 0 }}
        >
          <span
            style={{
              fontSize: 24,
              fontWeight: 800,
              letterSpacing: '0.12em',
              color: 'var(--accent)',
              textTransform: 'uppercase',
            }}
          >
            INRIUM
          </span>
        </a>

        {/* Nav */}
        <nav
          style={{
            display: 'flex',
            gap: 2,
            flex: 1,
          }}
        >
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              style={{
                color: 'var(--text-dim)',
                textDecoration: 'none',
                fontSize: 14,
                fontWeight: 500,
                padding: '6px 12px',
                borderRadius: 6,
                transition: 'color 0.15s, background-color 0.15s',
                whiteSpace: 'nowrap',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLAnchorElement).style.color = 'var(--text)';
                (e.currentTarget as HTMLAnchorElement).style.backgroundColor = 'var(--bg-card)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLAnchorElement).style.color = 'var(--text-dim)';
                (e.currentTarget as HTMLAnchorElement).style.backgroundColor = 'transparent';
              }}
            >
              {link.label}
            </a>
          ))}
        </nav>

        {/* Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          {/* Search */}
          <button
            type="button"
            aria-label="Пошук"
            style={{
              width: 36,
              height: 36,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 8,
              border: '1px solid var(--border)',
              background: 'transparent',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              transition: 'border-color 0.15s, color 0.15s',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border-bright)';
              (e.currentTarget as HTMLButtonElement).style.color = 'var(--text)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border)';
              (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-muted)';
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
          </button>

          {/* Login */}
          <a
            href="/login"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '7px 16px',
              borderRadius: 8,
              border: '1px solid var(--border-bright)',
              color: 'var(--text-dim)',
              textDecoration: 'none',
              fontSize: 14,
              fontWeight: 500,
              transition: 'border-color 0.15s, color 0.15s',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLAnchorElement).style.borderColor = 'var(--accent)';
              (e.currentTarget as HTMLAnchorElement).style.color = 'var(--text)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLAnchorElement).style.borderColor = 'var(--border-bright)';
              (e.currentTarget as HTMLAnchorElement).style.color = 'var(--text-dim)';
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
            Увійти
          </a>

          {/* Register */}
          <a
            href="/register"
            style={{
              padding: '7px 16px',
              borderRadius: 8,
              background: 'var(--accent)',
              color: '#fff',
              textDecoration: 'none',
              fontSize: 14,
              fontWeight: 600,
              transition: 'background-color 0.15s',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLAnchorElement).style.backgroundColor = 'var(--accent-hover)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLAnchorElement).style.backgroundColor = 'var(--accent)';
            }}
          >
            Реєстрація
          </a>
        </div>
      </div>
    </header>
  );
}
