'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import GameForm from '@/components/games/GameForm';
import { useRequireGameMaster } from '@/components/games/useRequireGameMaster';
import { apiGetGameById, type GameListItem } from '@/lib/api';

interface Props {
  id: string;
}

export default function MyGameEditPageClient({ id }: Props) {
  const { user, isLoading, allowed } = useRequireGameMaster();
  const [game, setGame] = useState<GameListItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setGame(await apiGetGameById(id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Гру не знайдено');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (!allowed) return;
    void load();
  }, [allowed, load]);

  if (isLoading || !user) {
    return (
      <>
        <Header />
        <main style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <p style={{ color: 'var(--text-muted)' }}>Завантаження…</p>
        </main>
        <Footer />
      </>
    );
  }

  if (!allowed) return null;

  return (
    <>
      <Header />
      <main style={{ maxWidth: 860, margin: '0 auto', padding: '32px 24px 80px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 24, fontSize: 13 }}>
          <Link href="/my/games" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>Мої ігри</Link>
          <span style={{ color: 'var(--border)' }}>/</span>
          <span style={{ color: 'var(--text-dim)' }}>Редагування</span>
        </div>
        <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 24 }}>Редагувати гру</h1>
        {loading ? (
          <p style={{ color: 'var(--text-muted)' }}>Завантаження…</p>
        ) : error ? (
          <p style={{ color: '#ef4444' }}>{error}</p>
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
