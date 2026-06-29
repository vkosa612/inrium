'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState, type FormEvent } from 'react';
import { useAuth } from '@/context/AuthContext';
import { apiRegister } from '@/lib/api';

export default function RegisterPage() {
  const { user, isLoading, login } = useAuth();
  const router = useRouter();
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isLoading && user) router.replace('/');
  }, [user, isLoading, router]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');

    if (password.length < 8) { setError('Пароль: мінімум 8 символів'); return; }
    if (!/(?=.*[A-Za-z])(?=.*\d)/.test(password)) { setError('Пароль повинен містити літери та цифри'); return; }

    setSubmitting(true);
    try {
      const result = await apiRegister(email, password, displayName);
      login(result);
      router.push('/');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Помилка реєстрації');
    } finally {
      setSubmitting(false);
    }
  }

  if (isLoading) return null;

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '10px 14px',
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid var(--border)',
    borderRadius: 8,
    color: 'var(--text)',
    fontSize: 14,
    outline: 'none',
    boxSizing: 'border-box',
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: 13,
    fontWeight: 500,
    color: 'var(--text-dim)',
    marginBottom: 6,
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'var(--bg)',
        padding: '24px',
      }}
    >
      <Link href="/" style={{ textDecoration: 'none', marginBottom: 32 }}>
        <span style={{ fontSize: 28, fontWeight: 800, letterSpacing: '0.12em', color: 'var(--accent)', textTransform: 'uppercase' }}>
          INRIUM
        </span>
      </Link>

      <div
        style={{
          width: '100%',
          maxWidth: 420,
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: 16,
          padding: '36px 32px',
        }}
      >
        <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>
          Реєстрація
        </h1>
        <p style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 28 }}>
          Вже є акаунт?{' '}
          <Link href="/login" style={{ color: 'var(--accent)', textDecoration: 'none' }}>Увійти</Link>
        </p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={labelStyle}>Ім&apos;я гравця</label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              required
              minLength={2}
              maxLength={64}
              placeholder="Хоробрий Мандрівник"
              style={inputStyle}
              onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--accent)'; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; }}
            />
          </div>

          <div>
            <label style={labelStyle}>Електронна пошта</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="name@example.com"
              style={inputStyle}
              onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--accent)'; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; }}
            />
          </div>

          <div>
            <label style={labelStyle}>Пароль</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              placeholder="Мінімум 8 символів, є літери і цифри"
              style={inputStyle}
              onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--accent)'; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; }}
            />
            <p style={{ marginTop: 5, fontSize: 11, color: 'var(--text-muted)' }}>
              Мінімум 8 символів, обов&apos;язково літери і цифри
            </p>
          </div>

          {error && (
            <div style={{
              padding: '10px 14px',
              background: 'rgba(239,68,68,0.1)',
              border: '1px solid rgba(239,68,68,0.3)',
              borderRadius: 8,
              fontSize: 13,
              color: '#f87171',
            }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            style={{
              marginTop: 4,
              padding: '11px',
              background: submitting ? 'var(--border)' : 'var(--accent)',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              fontSize: 15,
              fontWeight: 600,
              cursor: submitting ? 'not-allowed' : 'pointer',
            }}
          >
            {submitting ? 'Реєстрація...' : 'Зареєструватися'}
          </button>

          <p style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'center', lineHeight: 1.5 }}>
            Реєструючись, ви погоджуєтесь з умовами використання платформи
          </p>
        </form>
      </div>
    </div>
  );
}
