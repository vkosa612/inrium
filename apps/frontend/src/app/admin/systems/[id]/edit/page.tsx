'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import AdminRouteShell from '@/components/admin/AdminRouteShell';
import SystemForm from '@/components/admin/SystemForm';
import { apiGetSystemByIdAdmin, apiDeleteSystem, type GameSystemFull } from '@/lib/api';
import { formatApiError } from '@/lib/formatApiError';

function AdminSystemEditContent() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;
  const [item, setItem] = useState<GameSystemFull | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setFetchError('');
      try { setItem(await apiGetSystemByIdAdmin(id)); }
      catch (e) { setFetchError(formatApiError(e, 'Не вдалося завантажити систему')); }
      finally { setLoading(false); }
    }
    void load();
  }, [id]);

  async function handleDelete() {
    if (!item || !window.confirm(`Видалити "${item.title}"?`)) return;
    setDeleting(true);
    try { await apiDeleteSystem(item.id); router.push('/admin/systems'); }
    catch (e) { alert(formatApiError(e, 'Помилка видалення')); setDeleting(false); }
  }

  if (loading) {
    return (
      <>
        <Header />
        <main style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <p style={{ color: 'var(--text-muted)' }}>Завантаження системи…</p>
        </main>
        <Footer />
      </>
    );
  }

  if (fetchError) {
    return (
      <>
        <Header />
        <main style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div style={{ textAlign: 'center' }}>
            <p style={{ color: '#ef4444', marginBottom: 16 }}>{fetchError}</p>
            <Link href="/admin/systems" style={{ color: '#a78bfa', textDecoration: 'none', fontWeight: 600 }}>← Назад до списку</Link>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Header />
      <main style={{ minHeight: '100vh' }}>
        <div style={{ maxWidth: 860, margin: '0 auto', padding: '32px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 24, fontSize: 13 }}>
            <Link href="/admin" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>Адмін</Link>
            <span style={{ color: 'var(--border)' }}>/</span>
            <Link href="/admin/systems" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>Ігрові системи</Link>
            <span style={{ color: 'var(--border)' }}>/</span>
            <span style={{ color: 'var(--text-dim)' }}>{item?.title ?? id}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
            <div>
              <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)' }}>Редагувати систему</h1>
              <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 6 }}>Оновіть опис і параметри системи</p>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              {item?.status === 'PUBLISHED' && <Link href={`/systems/${item.slug}`} target="_blank" style={{ padding: '8px 16px', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 8, color: '#10b981', fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>↗ Переглянути</Link>}
              <button type="button" onClick={() => void handleDelete()} disabled={deleting} style={{ padding: '8px 16px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, color: '#ef4444', fontSize: 13, fontWeight: 600, cursor: deleting ? 'not-allowed' : 'pointer', opacity: deleting ? 0.5 : 1 }}>
                {deleting ? 'Видаляю…' : 'Видалити'}
              </button>
            </div>
          </div>
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, padding: '32px' }}>
            {item && <SystemForm initial={item} />}
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}

export default function AdminSystemEditPage() {
  return (
    <AdminRouteShell requirement="ADMIN_OR_EDITOR">
      <AdminSystemEditContent />
    </AdminRouteShell>
  );
}
