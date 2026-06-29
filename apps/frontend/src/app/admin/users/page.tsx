'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import AdminRouteShell from '@/components/admin/AdminRouteShell';
import { useAuth } from '@/context/AuthContext';
import { apiAdminUpdateUserRole, apiGetAdminUsers, type AdminUser, type AuthUser } from '@/lib/api';
import { roleLabel, userStatusLabel } from '@/lib/labels';

const ROLE_LABEL: Record<string, string> = {
  PLAYER: 'Гравець',
  GAME_MASTER: 'Майстер',
  EDITOR: 'Редактор',
  ADMIN: 'Адміністратор',
};

const ASSIGNABLE_ROLES: AuthUser['role'][] = ['PLAYER', 'GAME_MASTER', 'EDITOR', 'ADMIN'];

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('uk-UA', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatApiError(err: unknown): string {
  const msg = err instanceof Error ? err.message : 'Помилка завантаження';
  if (/403|forbidden|заборонено/i.test(msg)) return 'Доступ заборонено. Потрібна роль ADMIN.';
  if (/401|unauthorized|авториз/i.test(msg)) return 'Сесію закінчено. Увійдіть знову.';
  if (/500|internal/i.test(msg)) return 'Помилка сервера. Спробуйте пізніше.';
  return msg;
}

function AdminUsersContent() {
  const { user } = useAuth();
  const [items, setItems] = useState<AdminUser[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [savingId, setSavingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await apiGetAdminUsers({ search: search || undefined, limit: 50 });
      setItems(result.items);
      setTotal(result.total);
    } catch (e) {
      setError(formatApiError(e));
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleRoleChange(userId: string, role: AuthUser['role']) {
    setSavingId(userId);
    try {
      const updated = await apiAdminUpdateUserRole(userId, role);
      setItems((prev) => prev.map((u) => (u.id === userId ? updated : u)));
    } catch (e) {
      alert(formatApiError(e));
    } finally {
      setSavingId(null);
    }
  }

  if (!user) return null;

  return (
    <>
      <Header />
      <main style={{ minHeight: '100vh' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 24px' }}>
          <div style={{ marginBottom: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, fontSize: 13 }}>
              <Link href="/admin" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>← Адмін</Link>
              <span style={{ color: 'var(--border)' }}>/</span>
              <span style={{ color: 'var(--text-dim)' }}>Користувачі</span>
            </div>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)' }}>
              Користувачі{' '}
              <span
                style={{
                  fontSize: 14,
                  fontWeight: 500,
                  color: 'var(--text-muted)',
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border)',
                  padding: '2px 10px',
                  borderRadius: 20,
                }}
              >
                {total}
              </span>
            </h1>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              setSearch(searchInput);
            }}
            style={{ display: 'flex', gap: 8, marginBottom: 20 }}
          >
            <input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Пошук за email або ім'ям…"
              style={{
                flex: 1,
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
                borderRadius: 8,
                color: 'var(--text)',
                fontSize: 13,
                padding: '8px 12px',
              }}
            />
            <button
              type="submit"
              style={{
                padding: '8px 14px',
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
                borderRadius: 8,
                color: 'var(--text)',
                cursor: 'pointer',
                fontSize: 13,
              }}
            >
              Знайти
            </button>
          </form>

          {error && (
            <div
              style={{
                padding: '12px 16px',
                background: 'rgba(239,68,68,0.08)',
                border: '1px solid rgba(239,68,68,0.25)',
                borderRadius: 8,
                color: '#ef4444',
                fontSize: 13,
                marginBottom: 16,
              }}
            >
              {error}
            </div>
          )}

          {loading && (
            <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
              Завантаження користувачів…
            </div>
          )}

          {!loading && !error && items.length === 0 && (
            <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
              Користувачів не знайдено.
            </div>
          )}

          {!loading && items.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {items.map((u) => (
                <div
                  key={u.id}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr auto auto auto',
                    gap: 16,
                    alignItems: 'center',
                    padding: '14px 18px',
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border)',
                    borderRadius: 10,
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 700, color: 'var(--text)' }}>{u.displayName}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{u.email}</div>
                  </div>
                  <span style={{ fontSize: 12, color: u.status === 'ACTIVE' ? '#10b981' : '#ef4444' }}>
                    {userStatusLabel(u.status)}
                  </span>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{formatDate(u.createdAt)}</span>
                  <select
                    value={u.role}
                    disabled={savingId === u.id || u.id === user.id}
                    onChange={(e) => void handleRoleChange(u.id, e.target.value as AuthUser['role'])}
                    style={{
                      background: 'var(--bg)',
                      border: '1px solid var(--border)',
                      borderRadius: 8,
                      color: 'var(--text)',
                      fontSize: 13,
                      padding: '6px 10px',
                    }}
                  >
                    {ASSIGNABLE_ROLES.map((r) => (
                      <option key={r} value={r}>
                        {ROLE_LABEL[r] ?? r}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}

export default function AdminUsersPage() {
  return (
    <AdminRouteShell requirement="ADMIN">
      <AdminUsersContent />
    </AdminRouteShell>
  );
}
