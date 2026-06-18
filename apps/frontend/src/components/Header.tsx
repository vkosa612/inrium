'use client';

import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

const NAV_LINKS = [
  { label: 'Новини', href: '/news' },
  { label: 'Статті', href: '/articles' },
  { label: 'Ігрові системи', href: '/systems' },
  { label: 'Набори', href: '/kits' },
  { label: 'Ігри', href: '/games' },
  { label: 'Довідка', href: '/help' },
];

const ROLE_LABEL: Record<string, string> = {
  ADMIN: 'Адмін',
  EDITOR: 'Редактор',
  GAME_MASTER: 'Майстер',
  PLAYER: 'Гравець',
};

const ROLE_COLOR: Record<string, string> = {
  ADMIN: '#f59e0b',
  EDITOR: '#22d3ee',
  GAME_MASTER: '#10b981',
  PLAYER: '#a78bfa',
};

export default function Header() {
  const { user, isLoading, logout } = useAuth();
  const router = useRouter();

  async function handleLogout() {
    await logout();
    router.push('/');
  }

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
            <a href="/about" style={{ color: 'inherit', textDecoration: 'none' }}>Про нас</a>
            <a href="/advertise" style={{ color: 'inherit', textDecoration: 'none' }}>Реклама</a>
            <a href="/contacts" style={{ color: 'inherit', textDecoration: 'none' }}>Контакти</a>
          </div>
        </div>
      </div>

      {/* Main header */}
      <div className="mx-auto flex max-w-7xl items-center gap-8 px-4 py-3">
        {/* Logo */}
        <a href="/" style={{ textDecoration: 'none', flexShrink: 0 }}>
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
        <nav style={{ display: 'flex', gap: 2, flex: 1 }}>
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
          {/* Search link */}
          <a
            href="/search"
            aria-label="Пошук"
            style={{
              width: 36, height: 36, display: 'flex', alignItems: 'center',
              justifyContent: 'center', borderRadius: 8, border: '1px solid var(--border)',
              background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer',
              textDecoration: 'none',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLAnchorElement).style.borderColor = 'var(--border-bright)';
              (e.currentTarget as HTMLAnchorElement).style.color = 'var(--text)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLAnchorElement).style.borderColor = 'var(--border)';
              (e.currentTarget as HTMLAnchorElement).style.color = 'var(--text-muted)';
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
          </a>

          {/* ── Auth section ─────────────────────────────────── */}
          {isLoading ? (
            // Skeleton to avoid layout shift while reading localStorage
            <div style={{ width: 140, height: 36, borderRadius: 8, background: 'var(--border)' }} />
          ) : user ? (
            // ── Logged in ─────────────────────────────────────
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {/* Role badge */}
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: ROLE_COLOR[user.role] ?? '#a78bfa',
                  background: `${ROLE_COLOR[user.role] ?? '#a78bfa'}15`,
                  border: `1px solid ${ROLE_COLOR[user.role] ?? '#a78bfa'}30`,
                  padding: '2px 8px',
                  borderRadius: 20,
                }}
              >
                {ROLE_LABEL[user.role] ?? user.role}
              </span>

              {/* Profile link */}
              <a
                href="/profile"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '6px 12px',
                  borderRadius: 8,
                  border: '1px solid var(--border-bright)',
                  color: 'var(--text-dim)',
                  textDecoration: 'none',
                  fontSize: 14,
                  fontWeight: 500,
                  maxWidth: 140,
                  overflow: 'hidden',
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
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {user.displayName}
                </span>
              </a>

              {(user.role === 'GAME_MASTER' || user.role === 'ADMIN') && (
                <a
                  href="/my/games"
                  style={{
                    padding: '6px 12px',
                    borderRadius: 8,
                    background: 'rgba(16,185,129,0.1)',
                    border: '1px solid rgba(16,185,129,0.25)',
                    color: '#10b981',
                    textDecoration: 'none',
                    fontSize: 13,
                    fontWeight: 600,
                  }}
                >
                  Мої ігри
                </a>
              )}

              {/* Admin link (ADMIN/EDITOR only) */}
              {(user.role === 'ADMIN' || user.role === 'EDITOR') && (
                <a
                  href="/admin"
                  style={{
                    padding: '6px 12px',
                    borderRadius: 8,
                    background: 'rgba(245,158,11,0.1)',
                    border: '1px solid rgba(245,158,11,0.25)',
                    color: '#f59e0b',
                    textDecoration: 'none',
                    fontSize: 13,
                    fontWeight: 600,
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLAnchorElement).style.background = 'rgba(245,158,11,0.2)';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLAnchorElement).style.background = 'rgba(245,158,11,0.1)';
                  }}
                >
                  Адмінка
                </a>
              )}

              {/* Logout */}
              <button
                type="button"
                onClick={handleLogout}
                aria-label="Вийти"
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
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.borderColor = '#ef4444';
                  (e.currentTarget as HTMLButtonElement).style.color = '#f87171';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border)';
                  (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-muted)';
                }}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
              </button>
            </div>
          ) : (
            // ── Not logged in ─────────────────────────────────
            <>
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
            </>
          )}
        </div>
      </div>
    </header>
  );
}
