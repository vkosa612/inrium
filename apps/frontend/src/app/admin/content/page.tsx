'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import AdminRouteShell from '@/components/admin/AdminRouteShell';
import {
  apiGetAdminContentList,
  apiDeleteContent,
  type ContentItemAdmin,
  type ContentType,
  type ContentStatus,
} from '@/lib/api';
import { formatApiError } from '@/lib/formatApiError';

const TYPE_LABEL: Record<ContentType, string> = {
  NEWS: 'Новини',
  ARTICLE: 'Стаття',
  GAME_SYSTEM: 'Ігрова система',
  KIT: 'Набір',
  HELP_PAGE: 'Довідка',
};

const TYPE_COLOR: Record<ContentType, string> = {
  NEWS: '#f59e0b',
  ARTICLE: '#ec4899',
  GAME_SYSTEM: '#22d3ee',
  KIT: '#10b981',
  HELP_PAGE: '#f97316',
};

const STATUS_COLOR: Record<ContentStatus, string> = {
  DRAFT: '#6b7280',
  PUBLISHED: '#10b981',
  ARCHIVED: '#ef4444',
};

const STATUS_LABEL: Record<ContentStatus, string> = {
  DRAFT: 'Чернетка',
  PUBLISHED: 'Опубліковано',
  ARCHIVED: 'Архів',
};

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('uk-UA', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function Badge({ label, color }: { label: string; color: string }) {
  return (
    <span
      style={{
        fontSize: 11,
        fontWeight: 600,
        padding: '2px 10px',
        borderRadius: 20,
        color,
        background: `${color}18`,
        border: `1px solid ${color}30`,
        whiteSpace: 'nowrap',
      }}
    >
      {label}
    </span>
  );
}

function AdminContentContent() {
  const [items, setItems] = useState<ContentItemAdmin[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleting, setDeleting] = useState<string | null>(null);

  // Filters
  const [typeFilter, setTypeFilter] = useState<ContentType | ''>('');
  const [statusFilter, setStatusFilter] = useState<ContentStatus | ''>('');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await apiGetAdminContentList({
        type: typeFilter || undefined,
        status: statusFilter || undefined,
        search: search || undefined,
        limit: 50,
      });
      setItems(result.items);
      setTotal(result.total);
    } catch (e) {
      setError(formatApiError(e));
    } finally {
      setLoading(false);
    }
  }, [typeFilter, statusFilter, search]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleDelete(id: string, title: string) {
    if (!window.confirm(`Видалити "${title}"?\nЦю дію не можна скасувати.`)) return;
    setDeleting(id);
    try {
      await apiDeleteContent(id);
      setItems((prev) => prev.filter((i) => i.id !== id));
      setTotal((t) => t - 1);
    } catch (e) {
      alert(formatApiError(e, 'Помилка видалення'));
    } finally {
      setDeleting(null);
    }
  }

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSearch(searchInput);
  }

  return (
    <>
      <Header />
      <main style={{ minHeight: '100vh' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 24px' }}>

          {/* ── Header ── */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                <Link href="/admin" style={{ color: 'var(--text-muted)', fontSize: 13, textDecoration: 'none' }}>
                  ← Адмін
                </Link>
                <span style={{ color: 'var(--border)', fontSize: 13 }}>/</span>
                <span style={{ fontSize: 13, color: 'var(--text-dim)' }}>Контент</span>
              </div>
              <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text)' }}>
                Управління контентом
                <span style={{ marginLeft: 10, fontSize: 14, fontWeight: 500, color: 'var(--text-muted)', background: 'var(--bg-card)', border: '1px solid var(--border)', padding: '2px 10px', borderRadius: 20 }}>
                  {total}
                </span>
              </h1>
            </div>
            <Link
              href="/admin/content/new"
              style={{
                padding: '10px 20px',
                background: '#f59e0b',
                color: '#111',
                fontWeight: 700,
                borderRadius: 8,
                textDecoration: 'none',
                fontSize: 14,
              }}
            >
              + Новий матеріал
            </Link>
          </div>

          {/* ── Filters ── */}
          <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as ContentType | '')}
              style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
                borderRadius: 8,
                color: 'var(--text)',
                fontSize: 13,
                padding: '8px 12px',
              }}
            >
              <option value="">Всі типи</option>
              {(Object.keys(TYPE_LABEL) as ContentType[]).map((t) => (
                <option key={t} value={t}>{TYPE_LABEL[t]}</option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as ContentStatus | '')}
              style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
                borderRadius: 8,
                color: 'var(--text)',
                fontSize: 13,
                padding: '8px 12px',
              }}
            >
              <option value="">Всі статуси</option>
              {(Object.keys(STATUS_LABEL) as ContentStatus[]).map((s) => (
                <option key={s} value={s}>{STATUS_LABEL[s]}</option>
              ))}
            </select>

            <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: 8, flex: 1, minWidth: 200 }}>
              <input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Пошук за назвою або slug…"
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
              {search && (
                <button
                  type="button"
                  onClick={() => { setSearch(''); setSearchInput(''); }}
                  style={{
                    padding: '8px 12px',
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    fontSize: 13,
                  }}
                >
                  ✕
                </button>
              )}
            </form>
          </div>

          {/* ── Error ── */}
          {error && (
            <div style={{ padding: '12px 16px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 8, color: '#ef4444', fontSize: 13, marginBottom: 16 }}>
              {error}
            </div>
          )}

          {/* ── Loading ── */}
          {loading && (
            <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
              Завантаження…
            </div>
          )}

          {/* ── Empty ── */}
          {!loading && items.length === 0 && !error && (
            <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--text-muted)' }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>📭</div>
              <p style={{ marginBottom: 20 }}>Матеріалів не знайдено</p>
              <Link
                href="/admin/content/new"
                style={{
                  padding: '10px 20px',
                  background: '#f59e0b',
                  color: '#111',
                  fontWeight: 700,
                  borderRadius: 8,
                  textDecoration: 'none',
                  fontSize: 14,
                }}
              >
                Створити перший матеріал
              </Link>
            </div>
          )}

          {/* ── Table ── */}
          {!loading && items.length > 0 && (
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    {['Назва', 'Тип', 'Статус', 'Автор', 'Оновлено', 'Дії'].map((h) => (
                      <th
                        key={h}
                        style={{
                          padding: '12px 16px',
                          textAlign: 'left',
                          fontSize: 11,
                          fontWeight: 700,
                          color: 'var(--text-muted)',
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr
                      key={item.id}
                      style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.15s' }}
                      onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.02)')}
                      onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = 'transparent')}
                    >
                      <td style={{ padding: '12px 16px', maxWidth: 300 }}>
                        <Link
                          href={`/admin/content/${item.id}/edit`}
                          style={{ color: 'var(--text)', textDecoration: 'none', fontWeight: 600 }}
                        >
                          {item.title}
                        </Link>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                          /{item.slug}
                        </div>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <Badge
                          label={TYPE_LABEL[item.type] ?? item.type}
                          color={TYPE_COLOR[item.type] ?? '#a78bfa'}
                        />
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <Badge
                          label={STATUS_LABEL[item.status] ?? item.status}
                          color={STATUS_COLOR[item.status] ?? '#6b7280'}
                        />
                      </td>
                      <td style={{ padding: '12px 16px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                        {item.author?.displayName ?? '—'}
                      </td>
                      <td style={{ padding: '12px 16px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                        {formatDate(item.updatedAt)}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <Link
                            href={`/admin/content/${item.id}/edit`}
                            style={{
                              padding: '5px 12px',
                              background: 'rgba(245,158,11,0.1)',
                              border: '1px solid rgba(245,158,11,0.3)',
                              borderRadius: 6,
                              color: '#f59e0b',
                              fontSize: 12,
                              fontWeight: 600,
                              textDecoration: 'none',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            Редагувати
                          </Link>
                          {item.status === 'PUBLISHED' && (
                            <Link
                              href={`/content/${item.slug}`}
                              target="_blank"
                              style={{
                                padding: '5px 12px',
                                background: 'rgba(16,185,129,0.08)',
                                border: '1px solid rgba(16,185,129,0.25)',
                                borderRadius: 6,
                                color: '#10b981',
                                fontSize: 12,
                                fontWeight: 600,
                                textDecoration: 'none',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              Переглянути ↗
                            </Link>
                          )}
                          <button
                            onClick={() => void handleDelete(item.id, item.title)}
                            disabled={deleting === item.id}
                            style={{
                              padding: '5px 12px',
                              background: 'rgba(239,68,68,0.08)',
                              border: '1px solid rgba(239,68,68,0.25)',
                              borderRadius: 6,
                              color: '#ef4444',
                              fontSize: 12,
                              fontWeight: 600,
                              cursor: deleting === item.id ? 'not-allowed' : 'pointer',
                              whiteSpace: 'nowrap',
                              opacity: deleting === item.id ? 0.5 : 1,
                            }}
                          >
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

export default function AdminContentPage() {
  return (
    <AdminRouteShell requirement="ADMIN_OR_EDITOR">
      <AdminContentContent />
    </AdminRouteShell>
  );
}
