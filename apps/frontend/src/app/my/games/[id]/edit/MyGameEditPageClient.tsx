'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import GameForm from '@/components/games/GameForm';
import { apiGetGameById, type GameListItem } from '@/lib/api';
import { formatApiError } from '@/lib/formatApiError';

interface Props {
  id: string;
}

export default function MyGameEditPageClient({ id }: Props) {
  const [game, setGame] = useState<GameListItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setGame(await apiGetGameById(id));
    } catch (err) {
      setError(formatApiError(err, 'Гру не знайдено'));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <>
      <Header />
      <main style={{ maxWidth: 860, margin: '0 auto', padding: '32px 24px 80px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 24, fontSize: 13 }}>
          <Link href="/my/games" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>Мої ігри</Link>
          <span style={{ color: 'var(--border)' }}>/</span>
          <span style={{ color: 'var(--text-dim)' }}>Редагування</span>
        </div>
        <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 6 }}>Редагувати гру</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 24 }}>Оновіть деталі ігрової сесії</p>
        {loading ? (
          <p style={{ color: 'var(--text-muted)' }}>Завантаження гри…</p>
        ) : error ? (
          <div style={{ padding: '12px 16px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 8, color: '#ef4444', fontSize: 13 }}>
            {error}
            <div style={{ marginTop: 12 }}>
              <Link href="/my/games" style={{ color: '#10b981', fontWeight: 600, textDecoration: 'none' }}>← Назад до моїх ігор</Link>
            </div>
          </div>
        ) : game ? (
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, padding: 32 }}>
            <GameForm initial={game} />
          </div>
        ) : null}
      </main>
      <Footer />
    </>
  );
}
