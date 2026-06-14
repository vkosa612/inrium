import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { apiGetHome, type HomeData, type ContentItem, type GameSystem, type Kit } from '@/lib/api';

export const dynamic = 'force-dynamic';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const TYPE_LABEL: Record<string, string> = {
  NEWS: 'Новини', ARTICLE: 'Стаття', GAME_SYSTEM: 'Ігрова система',
  KIT: 'Набір', HELP_PAGE: 'Довідка',
};
const TYPE_COLOR: Record<string, string> = {
  NEWS: '#f59e0b', ARTICLE: '#ec4899', GAME_SYSTEM: '#22d3ee', KIT: '#10b981', HELP_PAGE: '#f97316',
};
const COMPLEXITY_COLOR: Record<string, string> = {
  'Початківець': '#10b981', 'Середній': '#f59e0b', 'Просунутий': '#ef4444', 'Hardcore': '#a855f7',
};

function formatDate(d: string | null) {
  if (!d) return '';
  return new Date(d).toLocaleDateString('uk-UA', { day: 'numeric', month: 'short', year: 'numeric' });
}

// ─── Section header ───────────────────────────────────────────────────────────

function SectionHeader({ title, href, accent = '#a78bfa', count }: { title: string; href: string; accent?: string; count?: number }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 3, height: 22, background: accent, borderRadius: 2 }} />
        <h2 style={{ fontSize: 20, fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.01em' }}>{title}</h2>
        {count !== undefined && (
          <span style={{ fontSize: 12, color: 'var(--text-muted)', background: 'var(--bg-card)', border: '1px solid var(--border)', padding: '1px 8px', borderRadius: 20 }}>{count}</span>
        )}
      </div>
      <Link href={href} style={{ fontSize: 13, color: accent, fontWeight: 600, textDecoration: 'none' }}>
        Всі →
      </Link>
    </div>
  );
}

// ─── Content card ─────────────────────────────────────────────────────────────

function ContentCard({ item, compact = false }: { item: ContentItem; compact?: boolean }) {
  const color = TYPE_COLOR[item.type] ?? '#a78bfa';
  const label = TYPE_LABEL[item.type] ?? item.type;

  if (compact) {
    return (
      <Link href={`/content/${item.slug}`} style={{ textDecoration: 'none', display: 'block' }}>
        <div className="card-hover" style={{ display: 'flex', gap: 14, padding: '14px 0', borderBottom: '1px solid var(--border)', cursor: 'pointer' }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
              <span style={{ fontSize: 10, fontWeight: 700, color, background: `${color}18`, border: `1px solid ${color}30`, padding: '2px 8px', borderRadius: 12 }}>{label}</span>
            </div>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', lineHeight: 1.4, marginBottom: 4 }}>{item.title}</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{formatDate(item.publishedAt ?? item.createdAt)}</div>
          </div>
        </div>
      </Link>
    );
  }

  return (
    <Link href={`/content/${item.slug}`} style={{ textDecoration: 'none', display: 'block' }}>
      <article className="card-hover" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: '20px', cursor: 'pointer', height: '100%', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 11, fontWeight: 600, color, background: `${color}18`, border: `1px solid ${color}30`, padding: '2px 10px', borderRadius: 20 }}>{label}</span>
          {item.isFeatured && <span style={{ fontSize: 11, color: '#a78bfa', fontWeight: 600 }}>★ Обране</span>}
          <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--text-muted)' }}>{formatDate(item.publishedAt ?? item.createdAt)}</span>
        </div>
        <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', lineHeight: 1.35, margin: 0 }}>{item.title}</h3>
        {item.excerpt && <p className="line-clamp-2" style={{ fontSize: 13, color: 'var(--text-dim)', lineHeight: 1.6, margin: 0, flex: 1 }}>{item.excerpt}</p>}
        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{item.author?.displayName}{item.author && item.category && ' · '}{item.category?.name}</div>
      </article>
    </Link>
  );
}

// ─── System card ──────────────────────────────────────────────────────────────

function SystemCard({ system }: { system: GameSystem }) {
  const complexityColor = COMPLEXITY_COLOR[system.complexity ?? ''] ?? '#6b7280';
  return (
    <Link href={`/systems/${system.slug}`} style={{ textDecoration: 'none', display: 'block' }}>
      <div className="card-hover" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: '20px', cursor: 'pointer' }}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
          {system.genre && <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 10px', borderRadius: 20, color: '#a78bfa', background: 'rgba(139,92,246,0.12)', border: '1px solid rgba(139,92,246,0.25)' }}>{system.genre}</span>}
          {system.complexity && <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 10px', borderRadius: 20, color: complexityColor, background: `${complexityColor}18`, border: `1px solid ${complexityColor}30` }}>{system.complexity}</span>}
        </div>
        <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text)', marginBottom: 8, lineHeight: 1.3 }}>{system.title}</div>
        {system.shortDescription && <p className="line-clamp-2" style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.5, margin: 0 }}>{system.shortDescription}</p>}
        <div style={{ fontSize: 12, color: '#a78bfa', fontWeight: 600, marginTop: 12 }}>Детальніше →</div>
      </div>
    </Link>
  );
}

// ─── Kit card ─────────────────────────────────────────────────────────────────

function KitCard({ kit }: { kit: Kit }) {
  return (
    <Link href={`/kits/${kit.slug}`} style={{ textDecoration: 'none', display: 'block' }}>
      <div className="card-hover" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: '20px', cursor: 'pointer' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
          {kit.category && <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 10px', borderRadius: 20, color: '#10b981', background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.25)' }}>{kit.category}</span>}
          {kit.priceText && <span style={{ fontSize: 12, fontWeight: 700, color: '#10b981' }}>{kit.priceText}</span>}
        </div>
        <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>{kit.title}</div>
        {kit.shortDescription && <p className="line-clamp-2" style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.5, margin: 0 }}>{kit.shortDescription}</p>}
        {kit.system && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 10 }}>🎲 {kit.system.title}</div>}
        <div style={{ fontSize: 12, color: '#10b981', fontWeight: 600, marginTop: 10 }}>Переглянути →</div>
      </div>
    </Link>
  );
}

// ─── Hero ─────────────────────────────────────────────────────────────────────

function HeroSection({ stats }: { stats: HomeData['stats'] }) {
  return (
    <section style={{
      position: 'relative', borderRadius: 16, overflow: 'hidden',
      border: '1px solid var(--border)', padding: '52px 48px',
      background: 'linear-gradient(135deg, rgba(139,92,246,0.12) 0%, rgba(12,12,20,0.95) 50%, rgba(245,158,11,0.06) 100%)',
    }}>
      {/* Decorative grid */}
      <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(255,255,255,0.012) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.012) 1px, transparent 1px)', backgroundSize: '40px 40px', pointerEvents: 'none' }} />
      {/* Glow */}
      <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(circle at 20% 40%, rgba(139,92,246,0.18) 0%, transparent 55%), radial-gradient(circle at 80% 60%, rgba(245,158,11,0.08) 0%, transparent 45%)', pointerEvents: 'none' }} />

      <div style={{ position: 'relative', zIndex: 1, maxWidth: 680 }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 11, fontWeight: 700, color: '#a78bfa', background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.3)', padding: '4px 14px', borderRadius: 20, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 20 }}>
          🎲 TTRPG-портал
        </div>

        <h1 style={{ fontSize: 'clamp(28px, 4vw, 48px)', fontWeight: 900, lineHeight: 1.15, color: 'var(--text)', letterSpacing: '-0.03em', marginBottom: 20 }}>
          INRIUM — <span style={{ color: '#a78bfa' }}>ваш провідник</span> у світ настільних рольових ігор
        </h1>

        <p style={{ fontSize: 16, color: 'var(--text-dim)', lineHeight: 1.7, marginBottom: 32, maxWidth: 560 }}>
          Системи, новини, статті, набори та спільнота для гравців і майстрів. Все необхідне для ваших кампаній в одному місці.
        </p>

        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 36 }}>
          <Link href="/systems" style={{ padding: '12px 24px', borderRadius: 10, background: '#a78bfa', color: '#fff', fontWeight: 700, fontSize: 15, textDecoration: 'none' }}>
            🎲 Ігрові системи
          </Link>
          <Link href="/articles" style={{ padding: '12px 24px', borderRadius: 10, border: '1px solid var(--border-bright)', color: 'var(--text)', fontWeight: 600, fontSize: 15, textDecoration: 'none' }}>
            Статті
          </Link>
          <Link href="/kits" style={{ padding: '12px 24px', borderRadius: 10, border: '1px solid var(--border-bright)', color: 'var(--text)', fontWeight: 600, fontSize: 15, textDecoration: 'none' }}>
            Набори
          </Link>
        </div>

        {/* Stats row */}
        <div style={{ display: 'flex', gap: 28, flexWrap: 'wrap' }}>
          {[
            { label: 'Систем', value: stats.systems, color: '#a78bfa' },
            { label: 'Наборів', value: stats.kits, color: '#10b981' },
            { label: 'Статей', value: stats.articles, color: '#ec4899' },
            { label: 'Новин', value: stats.news, color: '#f59e0b' },
          ].map((s) => (
            <div key={s.label} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 26, fontWeight: 900, color: s.color, lineHeight: 1 }}>{s.value}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function HomePage() {
  let data: HomeData | null = null;
  try {
    data = await apiGetHome();
  } catch {
    // Graceful fallback — show empty sections
  }

  const featured = data?.featured ?? [];
  const latestNews = data?.latestNews ?? [];
  const latestArticles = data?.latestArticles ?? [];
  const systems = data?.systems ?? [];
  const kits = data?.kits ?? [];
  const stats = data?.stats ?? { news: 0, articles: 0, systems: 0, kits: 0 };

  return (
    <>
      <Header />
      <main style={{ minHeight: '100vh' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 24px 64px' }}>

          {/* ── Hero ── */}
          <div style={{ marginBottom: 48 }}>
            <HeroSection stats={stats} />
          </div>

          {/* ── Featured ── */}
          {featured.length > 0 && (
            <section style={{ marginBottom: 52 }}>
              <SectionHeader title="Рекомендовано" href="/articles" accent="#a78bfa" />
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 14 }}>
                {featured.map((item) => <ContentCard key={item.id} item={item} />)}
              </div>
            </section>
          )}

          {/* ── News + Articles 2-col ── */}
          <section style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32, marginBottom: 52 }}>
            {/* News */}
            <div>
              <SectionHeader title="Останні новини" href="/news" accent="#f59e0b" count={stats.news} />
              {latestNews.length === 0 ? (
                <div style={{ padding: '32px 0', textAlign: 'center', color: 'var(--text-muted)' }}>Новин поки немає</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {latestNews.map((item) => <ContentCard key={item.id} item={item} compact />)}
                </div>
              )}
            </div>

            {/* Articles */}
            <div>
              <SectionHeader title="Нові статті" href="/articles" accent="#ec4899" count={stats.articles} />
              {latestArticles.length === 0 ? (
                <div style={{ padding: '32px 0', textAlign: 'center', color: 'var(--text-muted)' }}>Статей поки немає</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {latestArticles.map((item) => <ContentCard key={item.id} item={item} compact />)}
                </div>
              )}
            </div>
          </section>

          {/* ── Systems ── */}
          <section style={{ marginBottom: 52 }}>
            <SectionHeader title="Ігрові системи" href="/systems" accent="#a78bfa" count={stats.systems} />
            {systems.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>🎲 Системи скоро з'являться</div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 14 }}>
                {systems.map((s) => <SystemCard key={s.id} system={s} />)}
              </div>
            )}
          </section>

          {/* ── Kits ── */}
          <section style={{ marginBottom: 40 }}>
            <SectionHeader title="Набори" href="/kits" accent="#10b981" count={stats.kits} />
            {kits.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>📦 Набори скоро з'являться</div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 14 }}>
                {kits.map((k) => <KitCard key={k.id} kit={k} />)}
              </div>
            )}
          </section>

          {/* ── CTA strip ── */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginTop: 16 }}>
            {[
              { icon: '🔍', title: 'Пошук по сайту', desc: 'Знайди системи, набори і матеріали', href: '/search', color: '#a78bfa' },
              { icon: '📰', title: 'Всі новини', desc: 'Стеж за оновленнями TTRPG', href: '/news', color: '#f59e0b' },
              { icon: '✍️', title: 'Читати статті', desc: 'Гайди, огляди, рецензії', href: '/articles', color: '#ec4899' },
            ].map((c) => (
              <Link key={c.href} href={c.href} style={{ textDecoration: 'none', display: 'block' }}>
                <div className="card-hover" style={{ background: 'var(--bg-card)', border: `1px solid ${c.color}25`, borderRadius: 12, padding: '20px', textAlign: 'center', cursor: 'pointer' }}>
                  <div style={{ fontSize: 28, marginBottom: 8 }}>{c.icon}</div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: c.color, marginBottom: 4 }}>{c.title}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{c.desc}</div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
