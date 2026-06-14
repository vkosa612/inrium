import type { Metadata } from 'next';
import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import FilterBar from '@/components/FilterBar';
import { apiGetKits, apiGetSystems, type Kit } from '@/lib/api';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Набори — INRIUM',
  description: 'Стартові набори, набори GM та гравця для настільних рольових ігор',
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
      <article className="card-hover" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: '20px 24px', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', gap: 8 }}>
            {kit.category && (
              <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 10px', borderRadius: 20, color: catColor, background: `${catColor}18`, border: `1px solid ${catColor}30` }}>
                {kit.category}
              </span>
            )}
          </div>
          {kit.priceText && <span style={{ fontSize: 12, fontWeight: 700, color: '#10b981' }}>{kit.priceText}</span>}
        </div>

        <h2 style={{ fontSize: 17, fontWeight: 700, color: 'var(--text)', margin: 0, lineHeight: 1.3 }}>{kit.title}</h2>

        {kit.shortDescription && (
          <p className="line-clamp-2" style={{ fontSize: 13, color: 'var(--text-dim)', lineHeight: 1.6, margin: 0 }}>{kit.shortDescription}</p>
        )}

        {kit.system && <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>🎲 {kit.system.title}</div>}

        <div style={{ fontSize: 12, color: '#10b981', fontWeight: 600, marginTop: 4 }}>Переглянути →</div>
      </article>
    </Link>
  );
}

interface Props {
  searchParams: Promise<{ category?: string; system?: string; search?: string }>;
}

export default async function KitsPage({ searchParams }: Props) {
  const sp = await searchParams;
  const { category, system, search } = sp;

  let kits: Kit[] = [];
  let total = 0;
  let systemOptions: { label: string; value: string }[] = [];

  try {
    const [kitsResult, systemsResult] = await Promise.all([
      apiGetKits({ category, system, search, limit: 30 }),
      apiGetSystems({ limit: 50 }),
    ]);
    kits = kitsResult.items;
    total = kitsResult.total;
    systemOptions = systemsResult.items.map((s) => ({ label: s.title, value: s.slug }));
  } catch { /* non-critical */ }

  const activeFilters: Record<string, string | undefined> = { category, system, search };

  return (
    <>
      <Header />
      <main style={{ minHeight: '100vh' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '40px 24px' }}>
          <div style={{ marginBottom: 28 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
              <div style={{ width: 3, height: 28, background: '#10b981', borderRadius: 2 }} />
              <h1 style={{ fontSize: 28, fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.02em' }}>Набори</h1>
              <span style={{ fontSize: 13, color: 'var(--text-muted)', background: 'var(--bg-card)', border: '1px solid var(--border)', padding: '2px 10px', borderRadius: 20 }}>{total}</span>
            </div>
            <p style={{ fontSize: 14, color: 'var(--text-muted)' }}>Стартові набори, набори GM і гравця, цифрові інструменти для кампаній</p>
          </div>

          <FilterBar
            accentColor="#10b981"
            activeValues={activeFilters}
            fields={[
              { param: 'search', placeholder: 'Пошук наборів…', type: 'text' },
              { param: 'category', placeholder: 'Всі категорії', options: [
                { label: 'Стартовий', value: 'Стартовий' },
                { label: 'GM', value: 'GM' },
                { label: 'Гравець', value: 'Гравець' },
                { label: 'One-Shot', value: 'One-Shot' },
                { label: 'Цифровий', value: 'Цифровий' },
              ]},
              ...(systemOptions.length > 0 ? [{
                param: 'system',
                placeholder: 'Всі системи',
                options: systemOptions,
              }] : []),
            ]}
          />

          {kits.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 14 }}>
              {kits.map((k) => <KitCard key={k.id} kit={k} />)}
            </div>
          )}

          {kits.length === 0 && (
            <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--text-muted)' }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>📦</div>
              <p style={{ marginBottom: 12 }}>{category || system || search ? 'Нічого не знайдено за фільтрами' : 'Набори поки не додані'}</p>
              {(category || system || search) && (
                <Link href="/kits" style={{ fontSize: 13, color: '#10b981', textDecoration: 'none' }}>← Скинути фільтри</Link>
              )}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
