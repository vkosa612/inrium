'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { useAuth } from '@/context/AuthContext';
import SystemForm from '@/components/admin/SystemForm';

export default function AdminSystemNewPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;
    if (!user) { router.replace('/login'); return; }
    if (user.role !== 'ADMIN' && user.role !== 'EDITOR') router.replace('/');
  }, [user, isLoading, router]);

  if (isLoading || !user) return <><Header /><main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><div style={{ color: 'var(--text-muted)' }}>Завантаження…</div></main></>;

  return (
    <>
      <Header />
      <main style={{ minHeight: '100vh' }}>
        <div style={{ maxWidth: 860, margin: '0 auto', padding: '32px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 24, fontSize: 13 }}>
            <Link href="/admin" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>Адмін</Link>
            <span style={{ color: 'var(--border)' }}>/</span>
            <Link href="/admin/systems" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>Ігрові системи</Link>
            <span style={{ color: 'var(--border)' }}>/</span>
            <span style={{ color: 'var(--text-dim)' }}>Нова система</span>
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)', marginBottom: 28 }}>Нова ігрова система</h1>
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, padding: '32px' }}>
            <SystemForm />
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
