'use client';

import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { apiApplyToGame } from '@/lib/api';

interface Props {
  gameId: string;
  gameSlug: string;
  status: string;
}

export default function GameApplyButton({ gameId, gameSlug, status }: Props) {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  if (status !== 'OPEN') return null;

  async function handleApply() {
    if (!user) {
      router.push(`/login?redirect=/games/${gameSlug}`);
      return;
    }
    setLoading(true);
    setError('');
    try {
      await apiApplyToGame(gameId);
      setDone(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Помилка');
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <p style={{ color: '#10b981', fontSize: 14, margin: 0 }}>Заявку надіслано! Очікуйте рішення майстра.</p>
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleApply}
        disabled={loading}
        style={{
          padding: '12px 24px',
          borderRadius: 8,
          border: 'none',
          background: 'linear-gradient(135deg, #f7971f, #ffd200)',
          color: '#0c0c14',
          fontWeight: 700,
          cursor: loading ? 'wait' : 'pointer',
          fontSize: 14,
        }}
      >
        {loading ? 'Надсилання…' : user ? 'Подати заявку' : 'Увійти, щоб подати заявку'}
      </button>
      {error && <p style={{ color: '#ef4444', fontSize: 13, marginTop: 8 }}>{error}</p>}
    </div>
  );
}
