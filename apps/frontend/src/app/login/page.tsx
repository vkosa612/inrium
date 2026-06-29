'use client';

import Link from 'next/link';
import { Suspense, useEffect, useState, type FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { apiLogin } from '@/lib/api';
import { safeNextPath } from '@/lib/auth-redirect';

function LoginForm() {
  const { user, isLoading, login } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = safeNextPath(searchParams.get('next') ?? searchParams.get('redirect'));
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [flash, setFlash] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const msg = sessionStorage.getItem('inrium_flash_message');
    if (msg) {
      setFlash(msg);
      sessionStorage.removeItem('inrium_flash_message');
    }
  }, []);

  useEffect(() => {
    if (!isLoading && user) router.replace(nextPath);
  }, [user, isLoading, router, nextPath]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const result = await apiLogin(email, password);
      login(result);
      router.push(nextPath);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Помилка входу');
    } finally {
      setSubmitting(false);
    }
  }

  if (isLoading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
        Завантаження…
      </div>
    );
  }

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
          Вхід до акаунту
        </h1>
        <p style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 28 }}>
          Ще немає акаунту?{' '}
          <Link href="/register" style={{ color: 'var(--accent)', textDecoration: 'none' }}>Реєстрація</Link>
        </p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Field label="Email">
            <Input
              type="email"
              value={email}
              onChange={setEmail}
              placeholder="your@email.com"
              hasError={!!error}
              required
            />
          </Field>

          <Field label="Пароль">
            <Input
              type="password"
              value={password}
              onChange={setPassword}
              placeholder="••••••••"
              hasError={!!error}
              required
            />
          </Field>

          <div style={{ textAlign: 'right', marginTop: -8 }}>
            <Link href="/forgot-password" style={{ fontSize: 13, color: 'var(--accent)', textDecoration: 'none' }}>
              Забули пароль?
            </Link>
          </div>

          {flash && (
            <div style={{ padding: '10px 14px', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 8, fontSize: 13, color: '#10b981' }}>
              {flash}
            </div>
          )}

          {error && <ErrorBox>{error}</ErrorBox>}

          <SubmitButton loading={submitting}>
            {submitting ? 'Вхід...' : 'Увійти'}
          </SubmitButton>
        </form>

        <div
          style={{
            marginTop: 24,
            padding: '12px 14px',
            background: 'rgba(167,139,250,0.06)',
            border: '1px solid rgba(167,139,250,0.15)',
            borderRadius: 8,
          }}
        >
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6, fontWeight: 500 }}>Тестові акаунти:</p>
          <div style={{ fontSize: 12, color: 'var(--text-dim)', display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span>admin@inrium.local / Admin12345!</span>
            <span>editor@inrium.local / Editor12345!</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
          Завантаження…
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}

// ─── Shared form primitives (local, auth pages only) ─────────────────────────

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--text-dim)', marginBottom: 6 }}>
        {label}
      </label>
      {children}
    </div>
  );
}

function Input({
  type, value, onChange, placeholder, hasError, required,
}: {
  type: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  hasError?: boolean;
  required?: boolean;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      required={required}
      style={{
        width: '100%',
        padding: '10px 14px',
        background: 'rgba(255,255,255,0.04)',
        border: `1px solid ${hasError ? '#ef4444' : 'var(--border)'}`,
        borderRadius: 8,
        color: 'var(--text)',
        fontSize: 14,
        outline: 'none',
        boxSizing: 'border-box',
      }}
      onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--accent)'; }}
      onBlur={(e) => { e.currentTarget.style.borderColor = hasError ? '#ef4444' : 'var(--border)'; }}
    />
  );
}

function ErrorBox({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      padding: '10px 14px',
      background: 'rgba(239,68,68,0.1)',
      border: '1px solid rgba(239,68,68,0.3)',
      borderRadius: 8,
      fontSize: 13,
      color: '#f87171',
    }}>
      {children}
    </div>
  );
}

function SubmitButton({ loading, children }: { loading: boolean; children: React.ReactNode }) {
  return (
    <button
      type="submit"
      disabled={loading}
      style={{
        marginTop: 4,
        padding: '11px',
        background: loading ? 'var(--border)' : 'var(--accent)',
        color: '#fff',
        border: 'none',
        borderRadius: 8,
        fontSize: 15,
        fontWeight: 600,
        cursor: loading ? 'not-allowed' : 'pointer',
        transition: 'background-color 0.15s',
      }}
    >
      {children}
    </button>
  );
}
