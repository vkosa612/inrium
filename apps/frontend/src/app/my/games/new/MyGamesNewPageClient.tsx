'use client';

import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import GameForm from '@/components/games/GameForm';

export default function MyGamesNewPageClient() {
  return (
    <>
      <Header />
      <main style={{ maxWidth: 860, margin: '0 auto', padding: '32px 24px 80px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 24, fontSize: 13 }}>
          <Link href="/my/games" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>Мої ігри</Link>
          <span style={{ color: 'var(--border)' }}>/</span>
          <span style={{ color: 'var(--text-dim)' }}>Нова гра</span>
        </div>
        <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 6 }}>Створити гру</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 24 }}>Заповніть деталі ігрової сесії</p>
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, padding: 32 }}>
          <GameForm />
        </div>
      </main>
      <Footer />
    </>
  );
}
