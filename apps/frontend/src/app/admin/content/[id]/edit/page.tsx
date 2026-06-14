'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { useAuth } from '@/context/AuthContext';
import ContentForm from '@/components/admin/ContentForm';
import { apiGetContentByIdAdmin, apiDeleteContent, type ContentItemAdmin } from '@/lib/api';

export default function AdminContentEditPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;

  const [item, setItem] = useState<ContentItemAdmin | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.replace('/login'); return; }
    if (user.role !== 'ADMIN' && user.role !== 'EDITOR') { router.replace('/'); return; }

    async function load() {
      setLoading(true);
      try {
        const data = await apiGetContentByIdAdmin(id);
        setItem(data);
      } catch (e) {
        setFetchError(e instanceof Error ? e.message : 'Не вдалося завантажити матеріал');
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, [user, authLoading, router, id]);

  async function handleDelete() {
    if (!item) return;
    if (!window.confirm(`Видалити "${item.title}"?\nЦю дію не можна скасувати.`)) return;
    setDeleting(true);
    try {
      await apiDeleteContent(item.id);
      router.push('/admin/content');
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Помилка видалення');
      setDeleting(false);
    }
  }

  if (authLoading || (!item && loading)) {
    return (
      <>
        <Header />
        <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ color: 'var(--text-muted)' }}>Завантаження…</div>
        </main>
      </>
    );
  }

  if (fetchError) {
    return (
      <>
        <Header />
        <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
            <p style={{ fontSize: 16, color: '#ef4444', marginBottom: 20 }}>{fetchError}</p>
            <Link href="/admin/content" style={{ color: '#f59e0b', textDecoration: 'underline' }}>
              ← Назад до списку
            </Link>
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

          {/* Breadcrumb */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 24, fontSize: 13 }}>
            <Link href="/admin" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>Адмін</Link>
            <span style={{ color: 'var(--border)' }}>/</span>
            <Link href="/admin/content" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>Контент</Link>
            <span style={{ color: 'var(--border)' }}>/</span>
            <span style={{ color: 'var(--text-dim)', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {item?.title ?? id}
            </span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
            <div>
              <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text)', marginBottom: 6 }}>
                Редагувати матеріал
              </h1>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                ID: {id}
              </p>
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              {item?.status === 'PUBLISHED' && (
                <Link
                  href={`/content/${item.slug}`}
                  target="_blank"
                  style={{
                    padding: '8px 16px',
                    background: 'rgba(16,185,129,0.1)',
                    border: '1px solid rgba(16,185,129,0.3)',
                    borderRadius: 8,
                    color: '#10b981',
                    fontSize: 13,
                    fontWeight: 600,
                    textDecoration: 'none',
                  }}
                >
                  Переглянути на сайті ↗
                </Link>
              )}
              <button
                onClick={() => { void handleDelete(); }}
                disabled={deleting}
                style={{
                  padding: '8px 16px',
                  background: 'rgba(239,68,68,0.08)',
                  border: '1px solid rgba(239,68,68,0.3)',
                  borderRadius: 8,
                  color: '#ef4444',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: deleting ? 'not-allowed' : 'pointer',
                  opacity: deleting ? 0.5 : 1,
                }}
              >
                {deleting ? 'Видаляю…' : 'Видалити'}
              </button>
            </div>
          </div>

          <div style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: 16,
            padding: '32px',
          }}>
            {item && <ContentForm initial={item} />}
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
