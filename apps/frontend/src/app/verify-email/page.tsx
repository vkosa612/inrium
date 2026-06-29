'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { apiVerifyEmail } from '@/lib/api';

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('Посилання для підтвердження недійсне або відсутній токен.');
      return;
    }
    setStatus('loading');
    apiVerifyEmail(token)
      .then((res) => {
        setStatus('success');
        setMessage(res.message || 'Пошту успішно підтверджено.');
      })
      .catch((err: unknown) => {
        setStatus('error');
        setMessage(err instanceof Error ? err.message : 'Не вдалося підтвердити email.');
      });
  }, [token]);

  return (
    <AuthCard title="Підтвердження email">
      {status === 'loading' && <p style={{ color: 'var(--text-muted)' }}>Перевіряємо…</p>}
      {status === 'success' && (
        <>
          <SuccessBox>{message}</SuccessBox>
          <Link href="/login" style={{ color: 'var(--accent)', fontSize: 14, textDecoration: 'none' }}>Увійти →</Link>
        </>
      )}
      {status === 'error' && (
        <>
          <ErrorBox>{message}</ErrorBox>
          <Link href="/" style={{ color: 'var(--text-muted)', fontSize: 14, textDecoration: 'none' }}>На головну</Link>
        </>
      )}
      {status === 'idle' && null}
    </AuthCard>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<AuthShell><p style={{ color: 'var(--text-muted)' }}>Завантаження…</p></AuthShell>}>
      <VerifyEmailContent />
    </Suspense>
  );
}

function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--bg)', padding: 24 }}>
      <Link href="/" style={{ textDecoration: 'none', marginBottom: 32 }}>
        <span style={{ fontSize: 28, fontWeight: 800, letterSpacing: '0.12em', color: 'var(--accent)', textTransform: 'uppercase' }}>INRIUM</span>
      </Link>
      <div style={{ width: '100%', maxWidth: 420, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, padding: '36px 32px' }}>
        {children}
      </div>
    </div>
  );
}

function AuthCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <AuthShell>
      <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text)', marginBottom: 20 }}>{title}</h1>
      {children}
    </AuthShell>
  );
}

function SuccessBox({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ padding: '12px 14px', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)', borderRadius: 8, fontSize: 14, color: '#10b981', marginBottom: 16 }}>
      {children}
    </div>
  );
}

function ErrorBox({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ padding: '12px 14px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, fontSize: 14, color: '#f87171', marginBottom: 16 }}>
      {children}
    </div>
  );
}
