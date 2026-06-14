import type { Metadata } from 'next';
import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import FilterBar from '@/components/FilterBar';
import { apiGetSystems, type GameSystem } from '@/lib/api';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Ігрові системи — INRIUM',
  description: 'Огляд настільних рольових ігрових систем: D&D, Pathfinder, Call of Cthulhu та інші',
};

const COMPLEXITY_COLOR: Record<string, string> = {
  'Початківець': '#10b981',
  'Середній': '#f59e0b',
  'Просунутий': '#ef4444',
  'Hardcore': '#a855f7',
};

function SystemCard({ system }: { system: GameSystem }) {
  const complexityColor = COMPLEXITY_COLOR[system.complexity ?? ''] ?? '#6b7280';

  return (
    <Link href={`/systems/${system.slug}`} style={{ textDecoration: 'none', display: 'block' }}>
      <article className="card-hover" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, padding: '24px', cursor: 'pointer', height: '100%', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {system.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={system.imageUrl} alt={system.title} style={{ width: '100%', height: 140, objectFit: 'cover', borderRadius: 8 }} />
        ) : (
          <div style={{ width: '100%', height: 100, borderRadius: 8, background: 'linear-gradient(135deg, rgba(139,92,246,0.15) 0%, rgba(245,158,11,0.08) 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, flexShrink: 0 }}>
            🎲
          </div>
        )}

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {system.genre && (
            <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 10px', borderRadius: 20, color: '#a78bfa', background: 'rgba(139,92,246,0.12)', border: '1px solid rgba(139,92,246,0.25)' }}>
              {system.genre}
            </span>
          )}
          {system.complexity && (
            <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 10px', borderRadius: 20, color: complexityColor, background: `${complexityColor}18`, border: `1px solid ${complexityColor}30` }}>
              {system.complexity}
            </span>
          )}
        </div>

        <h2 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text)', lineHeight: 1.3, margin: 0 }}>{system.title}</h2>

        {system.shortDescription && (
          <p className="line-clamp-2" style={{ fontSize: 13, color: 'var(--text-dim)', lineHeight: 1.6, margin: 0, flex: 1 }}>{system.shortDescription}</p>
        )}

        {system.tags.length > 0 && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {system.tags.slice(0, 3).map((tag) => (
              <span key={tag} style={{ fontSize: 11, color: 'var(--text-muted)', background: 'var(--border)', padding: '2px 8px', borderRadius: 12 }}>#{tag}</span>
            ))}
          </div>
        )}

        <div style={{ fontSize: 12, color: '#a78bfa', fontWeight: 600, marginTop: 'auto' }}>Детальніше →</div>
      </article>
    </Link>
  );
}

interface Props {
  searchParams: Promise<{ genre?: string; complexity?: string; tag?: string; search?: string }>;
}

export default async function SystemsPage({ searchParams }: Props) {
  const sp = await searchParams;
  const { genre, complexity, tag, search } = sp;

  let systems: GameSystem[] = [];
  let total = 0;

  try {
    const result = await apiGetSystems({ genre, complexity, tag, search, limit: 24 });
    systems = result.items;
    total = result.total;
  } catch { /* non-critical */ }

  const activeFilters: Record<string, string | undefined> = { genre, complexity, tag, search };

  return (
    <>
      <Header />
      <main style={{ minHeight: '100vh' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '40px 24px' }}>
          <div style={{ marginBottom: 28 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
              <div style={{ width: 3, height: 28, background: '#a78bfa', borderRadius: 2 }} />
              <h1 style={{ fontSize: 28, fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.02em' }}>Ігрові системи</h1>
              <span style={{ fontSize: 13, color: 'var(--text-muted)', background: 'var(--bg-card)', border: '1px solid var(--border)', padding: '2px 10px', borderRadius: 20 }}>{total}</span>
            </div>
            <p style={{ fontSize: 14, color: 'var(--text-muted)' }}>Огляди настільних рольових систем — від класичних до авангардних</p>
          </div>

          <FilterBar
            accentColor="#a78bfa"
            activeValues={activeFilters}
            fields={[
              { param: 'search', placeholder: 'Пошук систем…', type: 'text' },
              { param: 'genre', placeholder: 'Всі жанри', options: [
                { label: 'Фентезі', value: 'Фентезі' },
                { label: 'Жахи', value: 'Жахи' },
                { label: 'Готика', value: 'Готика' },
                { label: 'Постапокаліпсис', value: 'Постапокаліпсис' },
                { label: 'Sci-Fi', value: 'Sci-Fi' },
              ]},
              { param: 'complexity', placeholder: 'Будь-яка складність', options: [
                { label: 'Початківець', value: 'Початківець' },
                { label: 'Середній', value: 'Середній' },
                { label: 'Просунутий', value: 'Просунутий' },
                { label: 'Hardcore', value: 'Hardcore' },
              ]},
            ]}
          />

          {systems.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
              {systems.map((s) => <SystemCard key={s.id} system={s} />)}
            </div>
          )}

          {systems.length === 0 && (
            <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--text-muted)' }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>🎲</div>
              <p style={{ marginBottom: 12 }}>{genre || complexity || tag || search ? 'Нічого не знайдено за фільтрами' : 'Ігрові системи поки не додані'}</p>
              {(genre || complexity || tag || search) && (
                <Link href="/systems" style={{ fontSize: 13, color: '#a78bfa', textDecoration: 'none' }}>← Скинути фільтри</Link>
              )}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
