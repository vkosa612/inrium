'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import {
  apiApplyToGame,
  apiCancelGameApplication,
  apiGetMyGameApplication,
  type ApplicationStatus,
  type GameApplication,
} from '@/lib/api';
import { APPLICATION_STATUS_COLOR, APPLICATION_STATUS_LABEL } from '@/lib/game-labels';

interface Props {
  gameId: string;
  gameSlug: string;
  gameStatus: string;
  masterId?: string;
}

export default function GameApplyButton({ gameId, gameSlug, gameStatus, masterId }: Props) {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [application, setApplication] = useState<GameApplication | null>(null);
  const [checking, setChecking] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    if (!user) {
      setApplication(null);
      return;
    }
    setChecking(true);
    try {
      const res = await apiGetMyGameApplication(gameId);
      setApplication(res.application);
    } catch {
      setApplication(null);
    } finally {
      setChecking(false);
    }
  }, [user, gameId]);

  useEffect(() => {
    if (authLoading) return;
    void refresh();
  }, [authLoading, refresh]);

  if (gameStatus !== 'OPEN') return null;

  if (user && masterId && user.id === masterId) {
    return (
      <p style={{ fontSize: 14, color: 'var(--text-muted)' }}>
        Ви — майстер цієї гри.{' '}
        <Link href={`/my/games/${gameId}/applications`} style={{ color: '#10b981' }}>Переглянути заявки →</Link>
      </p>
    );
  }

  async function handleApply() {
    if (!user) {
      router.push(`/login?redirect=/games/${gameSlug}`);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const created = await apiApplyToGame(gameId, message.trim() || undefined);
      setApplication(created);
      setMessage('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не вдалося подати заявку');
    } finally {
      setLoading(false);
    }
  }

  async function handleCancel() {
    if (!application) return;
    setLoading(true);
    setError('');
    try {
      const updated = await apiCancelGameApplication(gameId, application.id);
      setApplication(updated);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не вдалося скасувати заявку');
    } finally {
      setLoading(false);
    }
  }

  if (authLoading || checking) {
    return <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Перевірка заявки…</p>;
  }

  if (application && application.status !== 'CANCELLED' && application.status !== 'REJECTED') {
    const color = APPLICATION_STATUS_COLOR[application.status] ?? '#6b7280';
    const status = application.status as ApplicationStatus;
    return (
      <div>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 16px',
          borderRadius: 8, background: `${color}12`, border: `1px solid ${color}35`,
          fontSize: 14, color,
        }}>
          Ваша заявка: <strong>{APPLICATION_STATUS_LABEL[status] ?? status}</strong>
        </div>
        {status === 'PENDING' && (
          <button type="button" onClick={() => void handleCancel()} disabled={loading} style={{
            display: 'block', marginTop: 12, padding: '10px 18px', borderRadius: 8,
            border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-dim)',
            fontSize: 13, cursor: loading ? 'wait' : 'pointer',
          }}>
            {loading ? 'Скасування…' : 'Скасувати заявку'}
          </button>
        )}
        {error && <p style={{ color: '#ef4444', fontSize: 13, marginTop: 8 }}>{error}</p>}
      </div>
    );
  }

  return (
    <div>
      {user && (
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Коротке повідомлення майстру (необов'язково)"
          maxLength={500}
          rows={2}
          style={{
            width: '100%', maxWidth: 480, marginBottom: 12, padding: '10px 12px', borderRadius: 8,
            border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text)',
            fontSize: 14, resize: 'vertical',
          }}
        />
      )}
      <button
        type="button"
        onClick={() => void handleApply()}
        disabled={loading}
        style={{
          padding: '12px 24px', borderRadius: 8, border: 'none',
          background: 'linear-gradient(135deg, #f7971f, #ffd200)', color: '#0c0c14',
          fontWeight: 700, cursor: loading ? 'wait' : 'pointer', fontSize: 14,
        }}
      >
        {loading ? 'Надсилання…' : user ? 'Подати заявку' : 'Увійти, щоб подати заявку'}
      </button>
      {error && <p style={{ color: '#ef4444', fontSize: 13, marginTop: 8 }}>{error}</p>}
    </div>
  );
}
