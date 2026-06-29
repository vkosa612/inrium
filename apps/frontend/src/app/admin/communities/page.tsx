'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import AdminRouteShell from '@/components/admin/AdminRouteShell';
import { apiDeleteCommunity, apiGetAdminCommunities, type Community } from '@/lib/api';

function formatApiError(err: unknown): string {
  const msg = err instanceof Error ? err.message : 'Помилка завантаження';
  if (/403|forbidden|заборонено/i.test(msg)) return 'Доступ заборонено. Потрібна роль ADMIN.';
  if (/401|unauthorized|авториз/i.test(msg)) return 'Сесію закінчено. Увійдіть знову.';
  if (/500|internal/i.test(msg)) return 'Помилка сервера. Спробуйте пізніше.';
  return msg;
}

function AdminCommunitiesContent() {
  const [items, setItems] = useState<Community[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleting, setDeleting] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setItems(await apiGetAdminCommunities());
    } catch (e) {
      setError(formatApiError(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleDelete(id: string, name: string) {
    if (!window.confirm(`Видалити спільноту "${name}"?`)) return;
    setDeleting(id);
    try {
      await apiDeleteCommunity(id);
      setItems((prev) => prev.filter((c) => c.id !== id));
    } catch (e) {
      alert(formatApiError(e));
    } finally {
      setDeleting(null);
    }
  }

  return (
    <>
      <Header />
      <main style={{ minHeight: '100vh' }}>
        <div style={{ maxWidth: 900, margin: '0 auto', padding: '32px 24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
            <div>
              <div style={{ fontSize: 13, marginBottom: 4 }}>
                <Link href="/admin" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>
                  ← Адмін
                </Link>
              </div>
              <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)' }}>Спільноти</h1>
            </div>
            <Link
              href="/admin/communities/new"
              style={{
                padding: '10px 20px',
                background: '#f7971f',
                color: '#111',
                fontWeight: 700,
                borderRadius: 8,
                textDecoration: 'none',
                fontSize: 14,
              }}
            >
              + Створити спільноту
            </Link>
          </div>

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

          {loading && <p style={{ color: 'var(--text-muted)' }}>Завантаження спільнот…</p>}

          {!loading && !error && items.length === 0 && (
            <div style={{ textAlign: 'center', padding: '60px 24px', color: 'var(--text-muted)' }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>👥</div>
              <p style={{ margin: '0 0 16px', fontSize: 15 }}>Спільнот поки немає.</p>
              <Link
                href="/admin/communities/new"
                style={{
                  display: 'inline-block',
                  padding: '10px 20px',
                  background: '#f7971f',
                  color: '#111',
                  fontWeight: 700,
                  borderRadius: 8,
                  textDecoration: 'none',
                  fontSize: 14,
                }}
              >
                Створити першу спільноту
              </Link>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {items.map((c) => (
              <div
                key={c.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: 16,
                  padding: '16px 18px',
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border)',
                  borderRadius: 10,
                }}
              >
                <div>
                  <div style={{ fontWeight: 700, color: 'var(--text)' }}>{c.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    /{c.slug} · {c.isPublished ? 'Опубліковано' : 'Приховано'}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <Link
                    href={`/admin/communities/${c.id}/edit`}
                    style={{
                      padding: '6px 12px',
                      borderRadius: 8,
                      border: '1px solid var(--border)',
                      color: 'var(--text)',
                      textDecoration: 'none',
                      fontSize: 13,
                    }}
                  >
                    Редагувати
                  </Link>
                  <button
                    type="button"
                    disabled={deleting === c.id}
                    onClick={() => void handleDelete(c.id, c.name)}
                    style={{
                      padding: '6px 12px',
                      borderRadius: 8,
                      border: '1px solid rgba(239,68,68,0.3)',
                      background: 'transparent',
                      color: '#ef4444',
                      cursor: 'pointer',
                      fontSize: 13,
                    }}
                  >
                    {deleting === c.id ? '…' : 'Видалити'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}

export default function AdminCommunitiesPage() {
  return (
    <AdminRouteShell requirement="ADMIN">
      <AdminCommunitiesContent />
    </AdminRouteShell>
  );
}
