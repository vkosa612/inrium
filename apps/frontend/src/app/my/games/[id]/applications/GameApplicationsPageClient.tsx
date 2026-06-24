'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import {
  apiApproveGameApplication,
  apiGetGameApplications,
  apiGetGameById,
  apiRejectGameApplication,
  type GameApplication,
  type GameListItem,
} from '@/lib/api';
import { APPLICATION_STATUS_COLOR, APPLICATION_STATUS_LABEL, formatGameDate, GAME_STATUS_LABEL } from '@/lib/game-labels';
import { formatApiError } from '@/lib/formatApiError';

interface Props {
  gameId: string;
}

export default function GameApplicationsPageClient({ gameId }: Props) {
  const [game, setGame] = useState<GameListItem | null>(null);
  const [applications, setApplications] = useState<GameApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actingId, setActingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [g, apps] = await Promise.all([
        apiGetGameById(gameId),
        apiGetGameApplications(gameId),
      ]);
      setGame(g);
      setApplications(apps);
    } catch (err) {
      setError(formatApiError(err, 'Не вдалося завантажити заявки'));
    } finally {
      setLoading(false);
    }
  }, [gameId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleAction(appId: string, action: 'approve' | 'reject') {
    setActingId(appId);
    setError('');
    try {
      const updated = action === 'approve'
        ? await apiApproveGameApplication(gameId, appId)
        : await apiRejectGameApplication(gameId, appId);
      setApplications((prev) => prev.map((a) => (a.id === appId ? { ...a, ...updated } : a)));
      if (game) {
        setGame(await apiGetGameById(gameId));
      }
    } catch (err) {
      setError(formatApiError(err, 'Не вдалося оновити заявку'));
    } finally {
      setActingId(null);
    }
  }

  return (
    <>
      <Header />
      <main style={{ maxWidth: 800, margin: '0 auto', padding: '32px 24px 80px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 24, fontSize: 13 }}>
          <Link href="/my/games" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>Мої ігри</Link>
          <span style={{ color: 'var(--border)' }}>/</span>
          <span style={{ color: 'var(--text-dim)' }}>Заявки</span>
        </div>

        {game && (
          <div style={{ marginBottom: 24 }}>
            <h1 style={{ fontSize: 24, fontWeight: 800, margin: '0 0 8px' }}>{game.title}</h1>
            <p style={{ margin: 0, fontSize: 14, color: 'var(--text-muted)' }}>
              {GAME_STATUS_LABEL[game.status]} · {formatGameDate(game.startsAt)}
              {game.maxPlayers != null && ` · ${game.approvedCount}/${game.maxPlayers} гравців`}
            </p>
            <Link href={`/games/${game.slug}`} style={{ fontSize: 13, color: '#10b981', textDecoration: 'none' }}>
              Публічна сторінка →
            </Link>
          </div>
        )}

        {error && (
          <div style={{ marginBottom: 16, padding: '10px 14px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 8, fontSize: 13, color: '#ef4444' }}>
            {error}
          </div>
        )}

        {loading ? (
          <p style={{ color: 'var(--text-muted)' }}>Завантаження заявок…</p>
        ) : applications.length === 0 ? (
          <p style={{ color: 'var(--text-dim)' }}>Поки немає заявок на цю гру.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {applications.map((app) => {
              const color = APPLICATION_STATUS_COLOR[app.status] ?? '#6b7280';
              const isPending = app.status === 'PENDING';
              return (
                <article key={app.id} style={{
                  padding: '18px 20px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12,
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 6 }}>
                        {app.user && (
                          <Link href={`/users/${app.user.id}`} style={{ fontWeight: 700, color: 'var(--text)', textDecoration: 'none' }}>
                            {app.user.displayName}
                          </Link>
                        )}
                        <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 12, color, background: `${color}18`, border: `1px solid ${color}35` }}>
                          {APPLICATION_STATUS_LABEL[app.status] ?? app.status}
                        </span>
                      </div>
                      {app.message && (
                        <p style={{ margin: '0 0 6px', fontSize: 14, color: 'var(--text-dim)', fontStyle: 'italic' }}>«{app.message}»</p>
                      )}
                      <p style={{ margin: 0, fontSize: 12, color: 'var(--text-muted)' }}>
                        {new Date(app.createdAt).toLocaleString('uk-UA')}
                      </p>
                    </div>
                    {isPending && (
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button type="button" disabled={actingId === app.id} onClick={() => void handleAction(app.id, 'approve')} style={{
                          padding: '8px 14px', borderRadius: 8, border: 'none', background: '#10b981', color: '#111',
                          fontWeight: 600, fontSize: 13, cursor: actingId === app.id ? 'wait' : 'pointer',
                        }}>
                          Схвалити
                        </button>
                        <button type="button" disabled={actingId === app.id} onClick={() => void handleAction(app.id, 'reject')} style={{
                          padding: '8px 14px', borderRadius: 8, border: '1px solid rgba(239,68,68,0.4)', background: 'transparent',
                          color: '#f87171', fontSize: 13, cursor: actingId === app.id ? 'wait' : 'pointer',
                        }}>
                          Відхилити
                        </button>
                      </div>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </main>
      <Footer />
    </>
  );
}
