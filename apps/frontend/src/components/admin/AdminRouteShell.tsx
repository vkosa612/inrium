'use client';

import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import {
  useAdminRouteGuard,
  type AdminRoleRequirement,
} from '@/hooks/useAdminRouteGuard';

interface AdminRouteShellProps {
  requirement?: AdminRoleRequirement;
  children: React.ReactNode;
}

export default function AdminRouteShell({
  requirement = 'ADMIN',
  children,
}: AdminRouteShellProps) {
  const { status } = useAdminRouteGuard(requirement);

  if (status === 'loading' || status === 'redirecting') {
    return (
      <>
        <Header />
        <main
          style={{
            minHeight: '60vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>
            {status === 'loading' ? 'Перевірка доступу…' : 'Перенаправлення на вхід…'}
          </p>
        </main>
        <Footer />
      </>
    );
  }

  if (status === 'forbidden') {
    const roleHint =
      requirement === 'ADMIN'
        ? 'адміністраторів (ADMIN)'
        : 'адміністраторів або редакторів (ADMIN / EDITOR)';

    return (
      <>
        <Header />
        <main
          style={{
            minHeight: '60vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 24,
          }}
        >
          <div style={{ maxWidth: 440, textAlign: 'center' }}>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)', marginBottom: 12 }}>
              Доступ заборонено
            </h1>
            <p style={{ color: 'var(--text-muted)', marginBottom: 20, lineHeight: 1.6, fontSize: 14 }}>
              Ця сторінка доступна лише для {roleHint}.
            </p>
            <Link
              href="/admin"
              style={{ color: 'var(--accent)', textDecoration: 'none', fontWeight: 600, fontSize: 14 }}
            >
              ← До адмін-панелі
            </Link>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  return <>{children}</>;
}
