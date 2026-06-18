'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { useAuth } from '@/context/AuthContext';
import { apiFetchAuth } from '@/lib/api';

interface HomeBlock {
  id: string;
  type: string;
  title: string;
  subtitle: string | null;
  position: number;
  enabled: boolean;
}

export default function AdminHomeBlocksPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [blocks, setBlocks] = useState<HomeBlock[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetchAuth<HomeBlock[]>('/home-blocks/admin/list');
      setBlocks(data);
    } catch {
      setBlocks([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      router.replace('/login');
      return;
    }
    if (user.role !== 'ADMIN' && user.role !== 'EDITOR') {
      router.replace('/');
      return;
    }
    void load();
  }, [user, isLoading, router, load]);

  async function toggleEnabled(block: HomeBlock) {
    setSaving(block.id);
    try {
      await apiFetchAuth(`/home-blocks/${block.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ enabled: !block.enabled }),
      });
      await load();
    } finally {
      setSaving(null);
    }
  }

  if (isLoading || !user) return null;

  return (
    <>
      <Header />
      <main style={{ maxWidth: 900, margin: '0 auto', padding: '32px 24px 80px' }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 24 }}>Блоки головної</h1>
        {loading ? (
          <p style={{ color: 'var(--text-dim)' }}>Завантаження…</p>
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
                    {block.type} · pos {block.position}
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
                    cursor: 'pointer',
                    fontSize: 13,
                  }}
                >
                  {block.enabled ? 'Увімкнено' : 'Вимкнено'}
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
