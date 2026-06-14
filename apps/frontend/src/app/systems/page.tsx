import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
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
      <article
        className="card-hover"
        style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: 14,
          padding: '24px',
          cursor: 'pointer',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}
      >
        {/* Image placeholder or cover */}
        {system.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={system.imageUrl}
            alt={system.title}
            style={{ width: '100%', height: 140, objectFit: 'cover', borderRadius: 8 }}
          />
        ) : (
          <div
            style={{
              width: '100%',
              height: 100,
              borderRadius: 8,
              background: 'linear-gradient(135deg, rgba(139,92,246,0.15) 0%, rgba(245,158,11,0.08) 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 32,
              flexShrink: 0,
            }}
          >
            🎲
          </div>
        )}

        {/* Genre + complexity */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {system.genre && (
            <span style={{
              fontSize: 11, fontWeight: 600, padding: '2px 10px', borderRadius: 20,
              color: '#a78bfa', background: 'rgba(139,92,246,0.12)', border: '1px solid rgba(139,92,246,0.25)',
            }}>
              {system.genre}
            </span>
          )}
          {system.complexity && (
            <span style={{
              fontSize: 11, fontWeight: 600, padding: '2px 10px', borderRadius: 20,
              color: complexityColor, background: `${complexityColor}18`, border: `1px solid ${complexityColor}30`,
            }}>
              {system.complexity}
            </span>
          )}
        </div>

        {/* Title */}
        <h2 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text)', lineHeight: 1.3, margin: 0 }}>
          {system.title}
        </h2>

        {/* Short desc */}
        {system.shortDescription && (
          <p className="line-clamp-2" style={{ fontSize: 13, color: 'var(--text-dim)', lineHeight: 1.6, margin: 0, flex: 1 }}>
            {system.shortDescription}
          </p>
        )}

        {/* Tags */}
        {system.tags.length > 0 && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {system.tags.slice(0, 3).map((tag) => (
              <span key={tag} style={{ fontSize: 11, color: 'var(--text-muted)', background: 'var(--border)', padding: '2px 8px', borderRadius: 12 }}>
                #{tag}
              </span>
            ))}
          </div>
        )}

        <div style={{ fontSize: 12, color: '#a78bfa', fontWeight: 600, marginTop: 'auto' }}>
          Детальніше →
        </div>
      </article>
    </Link>
  );
}

export default async function SystemsPage() {
  let systems: GameSystem[] = [];
  let total = 0;
  let fromApi = true;

  try {
    const result = await apiGetSystems({ limit: 24 });
    systems = result.items;
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
              <div style={{ width: 3, height: 28, background: '#a78bfa', borderRadius: 2 }} />
              <h1 style={{ fontSize: 28, fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.02em' }}>
                Ігрові системи
              </h1>
              {fromApi && (
                <span style={{ fontSize: 13, color: 'var(--text-muted)', background: 'var(--bg-card)', border: '1px solid var(--border)', padding: '2px 10px', borderRadius: 20 }}>
                  {total}
                </span>
              )}
            </div>
            <p style={{ fontSize: 14, color: 'var(--text-muted)' }}>
              Огляди настільних рольових систем — від класичних до авангардних
              {!fromApi && <span style={{ color: '#f59e0b', marginLeft: 8 }}>· Сервер недоступний</span>}
            </p>
          </div>

          {systems.length === 0 && fromApi && (
            <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--text-muted)' }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>🎲</div>
              <p>Ігрові системи поки не додані</p>
            </div>
          )}

          {!fromApi && (
            <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--text-muted)' }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>⚡</div>
              <p>Не вдалося завантажити дані. Перевірте підключення.</p>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
            {systems.map((system) => (
              <SystemCard key={system.id} system={system} />
            ))}
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
