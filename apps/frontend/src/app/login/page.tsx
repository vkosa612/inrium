'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState, type FormEvent } from 'react';
import { useAuth } from '@/context/AuthContext';
import { apiLogin } from '@/lib/api';

export default function LoginPage() {
  const { user, isLoading, login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Redirect if already logged in
  useEffect(() => {
    if (!isLoading && user) router.replace('/');
  }, [user, isLoading, router]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const result = await apiLogin(email, password);
      login(result);
      router.push('/');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Помилка входу');
    } finally {
      setSubmitting(false);
    }
  }

  if (isLoading) return null;

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
