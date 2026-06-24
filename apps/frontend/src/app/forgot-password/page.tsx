'use client';

import Link from 'next/link';
import { useState, type FormEvent } from 'react';
import { apiRequestPasswordReset } from '@/lib/api';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');
    try {
      const res = await apiRequestPasswordReset(email.trim());
      setMessage(res.message || 'Якщо email існує, ми надіслали інструкції.');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Помилка запиту');
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
        <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>Скидання пароля</h1>
        <p style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 24 }}>
          Введіть email — ми надішлемо посилання для скидання пароля.
        </p>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--text-dim)', marginBottom: 6 }}>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{ width: '100%', padding: '10px 14px', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)', fontSize: 14, boxSizing: 'border-box' }}
            />
          </div>
          {error && <div style={{ padding: '10px 14px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, fontSize: 13, color: '#f87171' }}>{error}</div>}
          {message && <div style={{ padding: '10px 14px', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)', borderRadius: 8, fontSize: 13, color: '#10b981' }}>{message}</div>}
          <button type="submit" disabled={loading} style={{ padding: 11, background: loading ? 'var(--border)' : 'var(--accent)', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer' }}>
            {loading ? 'Надсилаємо…' : 'Надіслати посилання'}
          </button>
        </form>
        <p style={{ marginTop: 20, fontSize: 13 }}>
          <Link href="/login" style={{ color: 'var(--accent)', textDecoration: 'none' }}>← Повернутися до входу</Link>
        </p>
      </div>
    </div>
  );
}
