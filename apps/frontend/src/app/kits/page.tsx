import type { Metadata } from 'next';
import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { apiGetKits, type Kit } from '@/lib/api';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Набори — INRIUM',
  description: 'Стартові набори, наборі GM та гравця для настільних рольових ігор',
};

const CATEGORY_COLOR: Record<string, string> = {
  'Стартовий': '#10b981',
  'GM': '#f59e0b',
  'Гравець': '#22d3ee',
  'One-Shot': '#ec4899',
  'Цифровий': '#a78bfa',
};

function KitCard({ kit }: { kit: Kit }) {
  const catColor = CATEGORY_COLOR[kit.category ?? ''] ?? '#6b7280';

  return (
    <Link href={`/kits/${kit.slug}`} style={{ textDecoration: 'none', display: 'block' }}>
      <article
        className="card-hover"
        style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: 12,
          padding: '20px 24px',
          cursor: 'pointer',
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
        }}
      >
        {/* Category + price row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', gap: 8 }}>
            {kit.category && (
              <span style={{
                fontSize: 11, fontWeight: 600, padding: '2px 10px', borderRadius: 20,
                color: catColor, background: `${catColor}18`, border: `1px solid ${catColor}30`,
              }}>
                {kit.category}
              </span>
            )}
          </div>
          {kit.priceText && (
            <span style={{ fontSize: 12, fontWeight: 700, color: '#10b981' }}>{kit.priceText}</span>
          )}
        </div>

        {/* Title */}
        <h2 style={{ fontSize: 17, fontWeight: 700, color: 'var(--text)', margin: 0, lineHeight: 1.3 }}>
          {kit.title}
        </h2>

        {/* Short desc */}
        {kit.shortDescription && (
          <p className="line-clamp-2" style={{ fontSize: 13, color: 'var(--text-dim)', lineHeight: 1.6, margin: 0 }}>
            {kit.shortDescription}
          </p>
        )}

        {/* Linked system */}
        {kit.system && (
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            🎲 {kit.system.title}
          </div>
        )}

        <div style={{ fontSize: 12, color: '#10b981', fontWeight: 600, marginTop: 4 }}>
          Переглянути →
        </div>
      </article>
    </Link>
  );
}

export default async function KitsPage() {
  let kits: Kit[] = [];
  let total = 0;
  let fromApi = true;

  try {
    const result = await apiGetKits({ limit: 24 });
    kits = result.items;
    total = result.total;
  } catch {
    fromApi = false;
  }

  return (
    <>
      <Header />
      <main style={{ minHeight: '100vh' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '40px 24px' }}>
          <div style={{ marginBottom: 36 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
              <div style={{ width: 3, height: 28, background: '#10b981', borderRadius: 2 }} />
              <h1 style={{ fontSize: 28, fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.02em' }}>
                Набори
              </h1>
              {fromApi && (
                <span style={{ fontSize: 13, color: 'var(--text-muted)', background: 'var(--bg-card)', border: '1px solid var(--border)', padding: '2px 10px', borderRadius: 20 }}>
                  {total}
                </span>
              )}
            </div>
            <p style={{ fontSize: 14, color: 'var(--text-muted)' }}>
              Стартові набори, набори GM і гравця, цифрові інструменти для кампаній
              {!fromApi && <span style={{ color: '#f59e0b', marginLeft: 8 }}>· Сервер недоступний</span>}
            </p>
          </div>

          {kits.length === 0 && fromApi && (
            <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--text-muted)' }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>📦</div>
              <p>Набори поки не додані</p>
            </div>
          )}

          {!fromApi && (
            <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--text-muted)' }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>⚡</div>
              <p>Не вдалося завантажити дані.</p>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 14 }}>
            {kits.map((kit) => (
              <KitCard key={kit.id} kit={kit} />
            ))}
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
