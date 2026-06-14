'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { useAuth } from '@/context/AuthContext';
import { apiGetMe, type AuthUser } from '@/lib/api';

const ROLE_LABEL: Record<string, string> = {
  ADMIN: 'Адміністратор',
  EDITOR: 'Редактор',
  GAME_MASTER: 'Майстер гри',
  PLAYER: 'Гравець',
};

const ROLE_COLOR: Record<string, string> = {
  ADMIN: '#f59e0b',
  EDITOR: '#22d3ee',
  GAME_MASTER: '#10b981',
  PLAYER: '#a78bfa',
};

function RoleBadge({ role }: { role: string }) {
  const color = ROLE_COLOR[role] ?? '#a78bfa';
  return (
    <span
      style={{
        fontSize: 12,
        fontWeight: 700,
        letterSpacing: '0.06em',
        textTransform: 'uppercase',
        color,
        background: `${color}18`,
        border: `1px solid ${color}35`,
        padding: '4px 12px',
        borderRadius: 20,
      }}
    >
      {ROLE_LABEL[role] ?? role}
    </span>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '14px 0',
        borderBottom: '1px solid var(--border)',
      }}
    >
      <span style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 500 }}>{label}</span>
      <span style={{ fontSize: 14, color: 'var(--text)' }}>{value}</span>
    </div>
  );
}

export default function ProfilePage() {
  const { user: ctxUser, isLoading: authLoading, logout } = useAuth();
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (authLoading) return;

    if (!ctxUser) {
      router.replace('/login');
      return;
    }

    // Fetch fresh user data from /auth/me
    apiGetMe()
      .then((fresh) => { setUser(fresh); })
      .catch(() => {
        // Fall back to context user if /me fails (e.g. expired token)
        setUser(ctxUser);
        setError('Не вдалося оновити дані профілю');
      })
      .finally(() => setLoading(false));
  }, [ctxUser, authLoading, router]);

  async function handleLogout() {
    await logout();
    router.push('/');
  }

  // ── Loading ────────────────────────────────────────────────────────────────
  if (authLoading || loading) {
    return (
      <>
        <Header />
        <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
            <div
              style={{
                width: 36,
                height: 36,
                border: '3px solid var(--border)',
                borderTopColor: 'var(--accent)',
                borderRadius: '50%',
                margin: '0 auto 16px',
                animation: 'spin 0.8s linear infinite',
              }}
            />
            <p style={{ fontSize: 14 }}>Завантаження профілю...</p>
          </div>
        </main>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </>
    );
  }

  if (!user) return null;

  const joinedDate = new Date(
    (user as AuthUser & { createdAt?: string }).createdAt ?? Date.now(),
  ).toLocaleDateString('uk-UA', { day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <>
      <Header />
      <main style={{ minHeight: '100vh' }}>
        <div style={{ maxWidth: 680, margin: '0 auto', padding: '40px 24px' }}>

          {/* ── Page title ─────────────────────────────────────────────── */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 32 }}>
            <div style={{ width: 3, height: 28, background: 'var(--accent)', borderRadius: 2 }} />
            <h1 style={{ fontSize: 26, fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.02em' }}>
              Профіль
            </h1>
          </div>

          {error && (
            <div
              style={{
                marginBottom: 20,
                padding: '10px 14px',
                background: 'rgba(245,158,11,0.08)',
                border: '1px solid rgba(245,158,11,0.2)',
                borderRadius: 8,
                fontSize: 13,
                color: '#fbbf24',
              }}
            >
              {error}
            </div>
          )}

          {/* ── Avatar + name card ─────────────────────────────────────── */}
          <div
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderRadius: 16,
              padding: '28px 28px 24px',
              marginBottom: 16,
              display: 'flex',
              alignItems: 'center',
              gap: 24,
            }}
          >
            {/* Avatar placeholder */}
            <div
              style={{
                width: 72,
                height: 72,
                borderRadius: '50%',
                background: `${ROLE_COLOR[user.role] ?? 'var(--accent)'}20`,
                border: `2px solid ${ROLE_COLOR[user.role] ?? 'var(--accent)'}40`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                fontSize: 28,
                color: ROLE_COLOR[user.role] ?? 'var(--accent)',
                fontWeight: 800,
              }}
            >
              {user.displayName.charAt(0).toUpperCase()}
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8, flexWrap: 'wrap' }}>
                <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)' }}>
                  {user.displayName}
                </h2>
                <RoleBadge role={user.role} />
              </div>
              <p style={{ fontSize: 14, color: 'var(--text-muted)' }}>{user.email}</p>
            </div>
          </div>

          {/* ── Info table ─────────────────────────────────────────────── */}
          <div
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderRadius: 16,
              padding: '8px 28px',
              marginBottom: 16,
            }}
          >
            <InfoRow label="Email" value={user.email} />
            <InfoRow label="Роль" value={ROLE_LABEL[user.role] ?? user.role} />
            <InfoRow label="Статус" value={user.status === 'ACTIVE' ? 'Активний' : user.status} />
            <InfoRow label="ID" value={user.id} />
            <div style={{ padding: '14px 0' }}>
              <span style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 500 }}>
                Дата реєстрації
              </span>
              <span style={{ float: 'right', fontSize: 14, color: 'var(--text)' }}>
                {joinedDate}
              </span>
            </div>
          </div>

          {/* ── Actions ────────────────────────────────────────────────── */}
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {(user.role === 'ADMIN' || user.role === 'EDITOR') && (
              <a
                href="/admin"
                style={{
                  padding: '10px 20px',
                  borderRadius: 8,
                  background: 'rgba(245,158,11,0.1)',
                  border: '1px solid rgba(245,158,11,0.25)',
                  color: '#f59e0b',
                  textDecoration: 'none',
                  fontSize: 14,
                  fontWeight: 600,
                }}
              >
                Адмін-панель
              </a>
            )}

            <button
              type="button"
              onClick={handleLogout}
              style={{
                padding: '10px 20px',
                borderRadius: 8,
                background: 'transparent',
                border: '1px solid rgba(239,68,68,0.3)',
                color: '#f87171',
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = 'rgba(239,68,68,0.08)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
              }}
            >
              Вийти з акаунту
            </button>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
