'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState, type FormEvent } from 'react';
import { apiResetPassword } from '@/lib/api';

function ResetPasswordContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token') ?? '';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    if (!token) {
      setError('Недійсне посилання для скидання пароля.');
      return;
    }
    if (password.length < 8) {
      setError('Пароль має містити щонайменше 8 символів.');
      return;
    }
    if (password !== confirm) {
      setError('Паролі не співпадають.');
      return;
    }
    setLoading(true);
    try {
      const res = await apiResetPassword(token, password);
      setSuccess(res.message || 'Пароль змінено.');
      setTimeout(() => router.push('/login'), 2000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Не вдалося змінити пароль.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--bg)', padding: 24 }}>
      <Link href="/" style={{ textDecoration: 'none', marginBottom: 32 }}>
        <span style={{ fontSize: 28, fontWeight: 800, letterSpacing: '0.12em', color: 'var(--accent)', textTransform: 'uppercase' }}>INRIUM</span>
      </Link>
      <div style={{ width: '100%', maxWidth: 420, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, padding: '36px 32px' }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text)', marginBottom: 24 }}>Новий пароль</h1>
        {!token ? (
          <div style={{ padding: '10px 14px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, fontSize: 13, color: '#f87171' }}>
            Посилання недійсне. <Link href="/forgot-password" style={{ color: 'var(--accent)' }}>Запросити нове</Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--text-dim)', marginBottom: 6 }}>Новий пароль</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} style={{ width: '100%', padding: '10px 14px', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)', fontSize: 14, boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--text-dim)', marginBottom: 6 }}>Підтвердження</label>
              <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required minLength={8} style={{ width: '100%', padding: '10px 14px', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)', fontSize: 14, boxSizing: 'border-box' }} />
            </div>
            {error && <div style={{ padding: '10px 14px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, fontSize: 13, color: '#f87171' }}>{error}</div>}
            {success && <div style={{ padding: '10px 14px', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)', borderRadius: 8, fontSize: 13, color: '#10b981' }}>{success}</div>}
            <button type="submit" disabled={loading} style={{ padding: 11, background: loading ? 'var(--border)' : 'var(--accent)', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer' }}>
              {loading ? 'Зберігаємо…' : 'Змінити пароль'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>Завантаження…</div>}>
      <ResetPasswordContent />
    </Suspense>
  );
}
