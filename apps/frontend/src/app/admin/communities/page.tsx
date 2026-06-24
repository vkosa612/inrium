'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { useAuth } from '@/context/AuthContext';
import { apiDeleteCommunity, apiGetAdminCommunities, type Community } from '@/lib/api';

export default function AdminCommunitiesPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [items, setItems] = useState<Community[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.replace('/login'); return; }
    if (user.role !== 'ADMIN') router.replace('/');
  }, [user, authLoading, router]);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setItems(await apiGetAdminCommunities());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Помилка завантаження');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user?.role === 'ADMIN') void load();
  }, [load, user]);

  async function handleDelete(id: string, name: string) {
    if (!window.confirm(`Видалити спільноту "${name}"?`)) return;
    setDeleting(id);
    try {
      await apiDeleteCommunity(id);
      setItems((prev) => prev.filter((c) => c.id !== id));
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Помилка видалення');
    } finally {
      setDeleting(null);
    }
  }

  if (authLoading || !user) return null;

  return (
    <>
      <Header />
      <main style={{ minHeight: '100vh' }}>
        <div style={{ maxWidth: 900, margin: '0 auto', padding: '32px 24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
            <div>
              <div style={{ fontSize: 13, marginBottom: 4 }}>
                <Link href="/admin" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>← Адмін</Link>
              </div>
              <h1 style={{ fontSize: 22, fontWeight: 800 }}>Спільноти</h1>
            </div>
            <Link href="/admin/communities/new" style={{ padding: '10px 20px', background: '#f7971f', color: '#111', fontWeight: 700, borderRadius: 8, textDecoration: 'none', fontSize: 14 }}>
              + Нова спільнота
            </Link>
          </div>

          {error && <div style={{ padding: '12px 16px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 8, color: '#ef4444', fontSize: 13, marginBottom: 16 }}>{error}</div>}
          {loading && <p style={{ color: 'var(--text-muted)' }}>Завантаження…</p>}

          {!loading && items.length === 0 && !error && (
            <p style={{ color: 'var(--text-muted)' }}>Спільнот поки немає.</p>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {items.map((c) => (
              <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, padding: '16px 18px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10 }}>
                <div>
                  <div style={{ fontWeight: 700 }}>{c.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>/{c.slug} · {c.isPublished ? 'Опубліковано' : 'Приховано'}</div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <Link href={`/admin/communities/${c.id}/edit`} style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid var(--border)', color: 'var(--text)', textDecoration: 'none', fontSize: 13 }}>Редагувати</Link>
                  <button type="button" disabled={deleting === c.id} onClick={() => void handleDelete(c.id, c.name)} style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid rgba(239,68,68,0.3)', background: 'transparent', color: '#ef4444', cursor: 'pointer', fontSize: 13 }}>
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
