'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { apiDeleteGame, apiGetMyGames, type MyGameItem } from '@/lib/api';
import { formatGameDate, GAME_STATUS_LABEL } from '@/lib/game-labels';
import { formatApiError } from '@/lib/formatApiError';

export default function MyGamesPageClient() {
  const [games, setGames] = useState<MyGameItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setGames(await apiGetMyGames());
    } catch (err) {
      setError(formatApiError(err, 'Не вдалося завантажити ігри'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleDelete(id: string, title: string) {
    if (!confirm(`Видалити гру «${title}»?`)) return;
    setDeletingId(id);
    try {
      await apiDeleteGame(id);
      setGames((prev) => prev.filter((g) => g.id !== id));
    } catch (err) {
      setError(formatApiError(err, 'Не вдалося видалити гру'));
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <>
      <Header />
      <main style={{ maxWidth: 960, margin: '0 auto', padding: '32px 24px 80px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, marginBottom: 28, flexWrap: 'wrap' }}>
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 800, margin: '0 0 6px' }}>Мої ігри</h1>
            <p style={{ margin: 0, color: 'var(--text-dim)', fontSize: 14 }}>Керуйте своїми ігровими сесіями та заявками</p>
          </div>
          <Link href="/my/games/new" style={{
            padding: '10px 20px', borderRadius: 8, background: '#10b981', color: '#111',
            fontWeight: 700, fontSize: 14, textDecoration: 'none',
          }}>
            + Створити гру
          </Link>
        </div>

        {error && (
          <div style={{ marginBottom: 16, padding: '10px 14px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 8, fontSize: 13, color: '#ef4444' }}>
            {error}
          </div>
        )}

        {loading ? (
          <p style={{ color: 'var(--text-muted)' }}>Завантаження ігор…</p>
        ) : games.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12 }}>
            <p style={{ color: 'var(--text-dim)', marginBottom: 16 }}>У вас ще немає ігор. Створіть першу сесію для гравців.</p>
            <Link href="/my/games/new" style={{ color: '#10b981', fontWeight: 600 }}>Створити гру →</Link>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {games.map((game) => (
              <article key={game.id} style={{
                padding: '20px 24px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12,
                display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'center', justifyContent: 'space-between',
              }}>
                <div style={{ flex: 1, minWidth: 200 }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 6 }}>
                    <Link href={`/games/${game.slug}`} style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', textDecoration: 'none' }}>
                      {game.title}
                    </Link>
                    <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 12, background: 'rgba(16,185,129,0.12)', color: '#10b981' }}>
                      {GAME_STATUS_LABEL[game.status] ?? game.status}
                    </span>
                  </div>
                  <p style={{ margin: 0, fontSize: 13, color: 'var(--text-muted)' }}>
                    {formatGameDate(game.startsAt)}
                    {game.maxPlayers != null && ` · ${game.approvedCount}/${game.maxPlayers} гравців`}
                    {game.pendingApplicationCount > 0 && (
                      <span style={{ color: '#f59e0b' }}> · {game.pendingApplicationCount} нових заявок</span>
                    )}
                  </p>
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <Link href={`/my/games/${game.id}/applications`} style={{
                    padding: '8px 14px', borderRadius: 8, border: '1px solid var(--border)', color: 'var(--text)',
                    fontSize: 13, textDecoration: 'none', fontWeight: 600,
                  }}>
                    Заявки ({game.applicationCount})
                  </Link>
                  <Link href={`/my/games/${game.id}/edit`} style={{
                    padding: '8px 14px', borderRadius: 8, border: '1px solid var(--border)', color: 'var(--text-dim)',
                    fontSize: 13, textDecoration: 'none',
                  }}>
                    Редагувати
                  </Link>
                  <button type="button" disabled={deletingId === game.id} onClick={() => void handleDelete(game.id, game.title)} style={{
                    padding: '8px 14px', borderRadius: 8, border: '1px solid rgba(239,68,68,0.3)',
                    background: 'transparent', color: '#f87171', fontSize: 13, cursor: deletingId === game.id ? 'wait' : 'pointer',
                  }}>
                    {deletingId === game.id ? '…' : 'Видалити'}
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </main>
      <Footer />
    </>
  );
}
