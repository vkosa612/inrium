import type { ReactNode } from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

interface StaticInfoPageProps {
  title: string;
  children: ReactNode;
}

export default function StaticInfoPage({ title, children }: StaticInfoPageProps) {
  return (
    <>
      <Header />
      <main style={{ maxWidth: 800, margin: '0 auto', padding: '40px 24px 80px' }}>
        <h1 style={{ fontSize: 32, fontWeight: 700, marginBottom: 24, color: 'var(--text)' }}>{title}</h1>
        <div
          style={{
            fontSize: 15,
            lineHeight: 1.75,
            color: 'var(--text-dim)',
          }}
        >
          {children}
        </div>
      </main>
      <Footer />
    </>
  );
}
