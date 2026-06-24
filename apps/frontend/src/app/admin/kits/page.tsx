'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import AdminRouteShell from '@/components/admin/AdminRouteShell';
import { apiGetAdminKitsList, apiDeleteKit, type Kit, type ContentStatus } from '@/lib/api';
import { formatApiError } from '@/lib/formatApiError';

const STATUS_LABEL: Record<string, string> = { DRAFT: 'Чернетка', PUBLISHED: 'Опубліковано', ARCHIVED: 'Архів' };
const STATUS_COLOR: Record<string, string> = { DRAFT: '#6b7280', PUBLISHED: '#10b981', ARCHIVED: '#ef4444' };

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('uk-UA', { day: 'numeric', month: 'short', year: 'numeric' });
}

function AdminKitsContent() {
  const [items, setItems] = useState<Kit[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleting, setDeleting] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<ContentStatus | ''>('');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const result = await apiGetAdminKitsList({ status: statusFilter || undefined, search: search || undefined });
      setItems(result.items); setTotal(result.total);
    } catch (e) { setError(formatApiError(e)); }
    finally { setLoading(false); }
  }, [statusFilter, search]);

  useEffect(() => { void load(); }, [load]);

  async function handleDelete(id: string, title: string) {
    if (!window.confirm(`Видалити "${title}"?`)) return;
    setDeleting(id);
    try { await apiDeleteKit(id); setItems((p) => p.filter((i) => i.id !== id)); setTotal((t) => t - 1); }
    catch (e) { alert(formatApiError(e, 'Помилка видалення')); }
    finally { setDeleting(null); }
  }

  return (
    <>
      <Header />
      <main style={{ minHeight: '100vh' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, fontSize: 13 }}>
                <Link href="/admin" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>← Адмін</Link>
                <span style={{ color: 'var(--border)' }}>/</span>
                <span style={{ color: 'var(--text-dim)' }}>Набори</span>
              </div>
              <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)' }}>
                Набори <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-muted)', background: 'var(--bg-card)', border: '1px solid var(--border)', padding: '2px 10px', borderRadius: 20 }}>{total}</span>
              </h1>
            </div>
            <Link href="/admin/kits/new" style={{ padding: '10px 20px', background: '#10b981', color: '#fff', fontWeight: 700, borderRadius: 8, textDecoration: 'none', fontSize: 14 }}>
              + Новий набір
            </Link>
          </div>

          <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as ContentStatus | '')} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)', fontSize: 13, padding: '8px 12px' }}>
              <option value="">Всі статуси</option>
              {Object.entries(STATUS_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
            <form onSubmit={(e) => { e.preventDefault(); setSearch(searchInput); }} style={{ display: 'flex', gap: 8, flex: 1 }}>
              <input value={searchInput} onChange={(e) => setSearchInput(e.target.value)} placeholder="Пошук…" style={{ flex: 1, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)', fontSize: 13, padding: '8px 12px' }} />
              <button type="submit" style={{ padding: '8px 14px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)', cursor: 'pointer', fontSize: 13 }}>Знайти</button>
              {search && <button type="button" onClick={() => { setSearch(''); setSearchInput(''); }} style={{ padding: '8px 12px', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>✕</button>}
            </form>
          </div>

          {error && <div style={{ padding: '12px 16px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 8, color: '#ef4444', fontSize: 13, marginBottom: 16 }}>{error}</div>}
          {loading && <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>Завантаження…</div>}
          {!loading && items.length === 0 && !error && (
            <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--text-muted)' }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>📦</div>
              <p style={{ marginBottom: 20 }}>Наборів не знайдено</p>
              <Link href="/admin/kits/new" style={{ padding: '10px 20px', background: '#10b981', color: '#fff', fontWeight: 700, borderRadius: 8, textDecoration: 'none', fontSize: 14 }}>Створити перший</Link>
            </div>
          )}

          {!loading && items.length > 0 && (
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    {['Назва', 'Категорія', 'Система', 'Статус', 'Оновлено', 'Дії'].map((h) => (
                      <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '12px 16px', maxWidth: 260 }}>
                        <Link href={`/admin/kits/${item.id}/edit`} style={{ color: 'var(--text)', textDecoration: 'none', fontWeight: 600 }}>{item.title}</Link>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>/{item.slug}</div>
                      </td>
                      <td style={{ padding: '12px 16px', color: 'var(--text-muted)' }}>{item.category ?? '—'}</td>
                      <td style={{ padding: '12px 16px', color: 'var(--text-muted)' }}>{item.system?.title ?? '—'}</td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 10px', borderRadius: 20, color: STATUS_COLOR[item.status], background: `${STATUS_COLOR[item.status]}18`, border: `1px solid ${STATUS_COLOR[item.status]}30` }}>
                          {STATUS_LABEL[item.status]}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{formatDate(item.updatedAt)}</td>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <Link href={`/admin/kits/${item.id}/edit`} style={{ padding: '5px 12px', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 6, color: '#10b981', fontSize: 12, fontWeight: 600, textDecoration: 'none', whiteSpace: 'nowrap' }}>Редагувати</Link>
                          {item.status === 'PUBLISHED' && <Link href={`/kits/${item.slug}`} target="_blank" style={{ padding: '5px 12px', background: 'rgba(34,211,238,0.08)', border: '1px solid rgba(34,211,238,0.25)', borderRadius: 6, color: '#22d3ee', fontSize: 12, fontWeight: 600, textDecoration: 'none', whiteSpace: 'nowrap' }}>↗</Link>}
                          <button onClick={() => void handleDelete(item.id, item.title)} disabled={deleting === item.id} style={{ padding: '5px 12px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 6, color: '#ef4444', fontSize: 12, fontWeight: 600, cursor: deleting === item.id ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap', opacity: deleting === item.id ? 0.5 : 1 }}>
                            {deleting === item.id ? '…' : 'Видалити'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}

export default function AdminKitsPage() {
  return (
    <AdminRouteShell requirement="ADMIN_OR_EDITOR">
      <AdminKitsContent />
    </AdminRouteShell>
  );
}
