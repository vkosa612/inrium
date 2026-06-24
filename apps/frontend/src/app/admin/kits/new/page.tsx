'use client';

import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import AdminRouteShell from '@/components/admin/AdminRouteShell';
import KitForm from '@/components/admin/KitForm';

function AdminKitNewContent() {
  return (
    <>
      <Header />
      <main style={{ minHeight: '100vh' }}>
        <div style={{ maxWidth: 860, margin: '0 auto', padding: '32px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 24, fontSize: 13 }}>
            <Link href="/admin" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>Адмін</Link>
            <span style={{ color: 'var(--border)' }}>/</span>
            <Link href="/admin/kits" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>Набори</Link>
            <span style={{ color: 'var(--border)' }}>/</span>
            <span style={{ color: 'var(--text-dim)' }}>Новий набір</span>
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)', marginBottom: 6 }}>Новий набір</h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 28 }}>Заповніть опис стартового набору</p>
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, padding: '32px' }}>
            <KitForm />
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}

export default function AdminKitNewPage() {
  return (
    <AdminRouteShell requirement="ADMIN_OR_EDITOR">
      <AdminKitNewContent />
    </AdminRouteShell>
  );
}
