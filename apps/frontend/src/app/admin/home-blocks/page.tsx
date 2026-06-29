'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import AdminRouteShell from '@/components/admin/AdminRouteShell';
import { apiFetchAuth } from '@/lib/api';
import { formatApiError } from '@/lib/formatApiError';
import { homeBlockTypeLabel } from '@/lib/labels';

interface HomeBlock {
  id: string;
  type: string;
  title: string;
  subtitle: string | null;
  position: number;
  enabled: boolean;
}

function AdminHomeBlocksContent() {
  const [blocks, setBlocks] = useState<HomeBlock[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setBlocks(await apiFetchAuth<HomeBlock[]>('/home-blocks/admin/list'));
    } catch (e) {
      setError(formatApiError(e));
      setBlocks([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function toggleEnabled(block: HomeBlock) {
    setSaving(block.id);
    try {
      await apiFetchAuth(`/home-blocks/${block.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ enabled: !block.enabled }),
      });
      await load();
    } catch (e) {
      alert(formatApiError(e, 'Не вдалося зберегти'));
    } finally {
      setSaving(null);
    }
  }

  return (
    <>
      <Header />
      <main style={{ maxWidth: 900, margin: '0 auto', padding: '32px 24px 80px' }}>
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, fontSize: 13 }}>
            <Link href="/admin" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>← Адмін</Link>
          </div>
          <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 6 }}>Блоки головної</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 14, margin: 0 }}>
            Увімкнення та вимкнення секцій на головній сторінці
          </p>
        </div>

        {error && (
          <div style={{ marginBottom: 16, padding: '10px 14px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 8, fontSize: 13, color: '#ef4444' }}>
            {error}
          </div>
        )}

        {loading ? (
          <p style={{ color: 'var(--text-muted)' }}>Завантаження блоків…</p>
        ) : blocks.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 24px', color: 'var(--text-muted)' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🏠</div>
            <p style={{ margin: 0, fontSize: 15 }}>Блоків головної сторінки не знайдено.</p>
            <p style={{ margin: '8px 0 0', fontSize: 13, color: 'var(--text-dim)' }}>
              Блоки створюються під час ініціалізації бази даних.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {blocks.map((block) => (
              <div
                key={block.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 16,
                  padding: '16px 20px',
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border)',
                  borderRadius: 10,
                }}
              >
                <div>
                  <div style={{ fontWeight: 700, color: 'var(--text)' }}>{block.title}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    {homeBlockTypeLabel(block.type)} · позиція {block.position}
                    {block.subtitle ? ` · ${block.subtitle}` : ''}
                  </div>
                </div>
                <button
                  type="button"
                  disabled={saving === block.id}
                  onClick={() => void toggleEnabled(block)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: 8,
                    border: '1px solid var(--border)',
                    background: block.enabled ? 'rgba(16,185,129,0.15)' : 'transparent',
                    color: block.enabled ? '#10b981' : 'var(--text-dim)',
                    cursor: saving === block.id ? 'wait' : 'pointer',
                    fontSize: 13,
                  }}
                >
                  {saving === block.id ? '…' : block.enabled ? 'Увімкнено' : 'Вимкнено'}
                </button>
              </div>
            ))}
          </div>
        )}
      </main>
      <Footer />
    </>
  );
}

export default function AdminHomeBlocksPage() {
  return (
    <AdminRouteShell requirement="ADMIN_OR_EDITOR">
      <AdminHomeBlocksContent />
    </AdminRouteShell>
  );
}
