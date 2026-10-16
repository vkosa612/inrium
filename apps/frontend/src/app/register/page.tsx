'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState, type FormEvent } from 'react';
import { useAuth } from '@/context/AuthContext';
import { CaptchaWidget, isCaptchaEnabled } from '@/components/CaptchaWidget';
import { apiRegister } from '@/lib/api';

export default function RegisterPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [doneMessage, setDoneMessage] = useState('');
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [captchaReset, setCaptchaReset] = useState(0);
  const captchaOn = isCaptchaEnabled();

  useEffect(() => {
    if (!isLoading && user) router.replace('/');
  }, [user, isLoading, router]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');

    if (password.length < 8) { setError('Пароль: мінімум 8 символів'); return; }
    if (!/(?=.*[A-Za-z])(?=.*\d)/.test(password)) { setError('Пароль повинен містити літери та цифри'); return; }

    if (captchaOn && !captchaToken) { setError('Підтвердіть, що ви не робот.'); return; }

    setSubmitting(true);
    try {
      // Сервер відповідає однаково незалежно від того, чи email уже зареєстровано (захист від перебору).
      const result = await apiRegister(email.trim(), password, displayName.trim(), captchaToken ?? undefined);
      setDoneMessage(result.message || 'Запит прийнято. Перевірте пошту та увійдіть.');
      setPassword('');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Помилка реєстрації');
      setCaptchaReset((n) => n + 1);
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
        {doneMessage ? (
          <div data-testid="register-done">
            <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text)', marginBottom: 12 }}>
              Запит прийнято
            </h1>
            <p style={{ fontSize: 14, color: 'var(--text-dim)', lineHeight: 1.6, marginBottom: 20 }}>
              {doneMessage}
            </p>
            <Link href="/login" style={{ color: 'var(--accent)', textDecoration: 'none', fontSize: 14 }}>
              Перейти до входу →
            </Link>
          </div>
        ) : (
          <>
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

          <CaptchaWidget onToken={setCaptchaToken} resetKey={captchaReset} />

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
            Реєструючись, ви погоджуєтесь з{' '}
            <Link href="/terms" style={{ color: 'var(--accent)', textDecoration: 'none' }}>умовами використання</Link>{' '}
            та{' '}
            <Link href="/privacy" style={{ color: 'var(--accent)', textDecoration: 'none' }}>політикою приватності</Link>{' '}
            платформи (чернетки документів).
          </p>
        </form>
          </>
        )}
      </div>
    </div>
  );
}
