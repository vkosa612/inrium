import type { Metadata } from 'next';
import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import PaginationWrapper from '@/components/PaginationWrapper';
import { apiGetGames, type GameListItem } from '@/lib/api';
import { formatApprovedPlayerNames, recruitmentStatusLabel } from '@/lib/game-labels';

export const dynamic = 'force-dynamic';

const ITEMS_PER_PAGE = 12;

export const metadata: Metadata = {
  title: 'Ігрові сесії — INRIUM',
  description: 'Відкриті настільні RPG-сесії: знайдіть гру або станьте майстром.',
};

const STATUS_LABEL: Record<string, string> = {
  OPEN: 'Відкрита для заявок',
  FULL: 'Закрита для заявок',
  IN_PROGRESS: 'Триває',
  FINISHED: 'Завершена',
};

function formatDate(d: string | null) {
  if (!d) return 'Дата уточнюється';
  return new Date(d).toLocaleString('uk-UA', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function GameCard({ game }: { game: GameListItem }) {
  const playersLine = formatApprovedPlayerNames(game.approvedPlayers ?? []);
  return (
    <Link href={`/games/${game.slug}`} style={{ textDecoration: 'none', display: 'block' }}>
      <article
        className="card-hover"
        style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: 14,
          padding: 24,
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}
      >
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <span
            style={{
              fontSize: 11,
              fontWeight: 600,
              padding: '2px 10px',
              borderRadius: 20,
              color: '#10b981',
              background: 'rgba(16,185,129,0.12)',
              border: '1px solid rgba(16,185,129,0.25)',
            }}
          >
            {STATUS_LABEL[game.status] ?? recruitmentStatusLabel(game.status)}
          </span>
          {game.gameSystem && (
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{game.gameSystem.title}</span>
          )}
        </div>
        <h2 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text)', margin: 0 }}>{game.title}</h2>
        <p className="line-clamp-3" style={{ fontSize: 13, color: 'var(--text-dim)', lineHeight: 1.6, margin: 0, flex: 1 }}>
          {game.description}
        </p>
        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
          <div>📅 {formatDate(game.startsAt)}</div>
          <div style={{ marginTop: 4 }}>
            🧙 {game.master.displayName}
            {game.maxPlayers != null && ` · Гравці: ${game.approvedCount} / ${game.maxPlayers}`}
          </div>
          {playersLine && (
            <div style={{ marginTop: 4, color: 'var(--text-dim)' }}>
              👥 {playersLine}
            </div>
          )}
        </div>
      </article>
    </Link>
  );
}

interface Props {
  searchParams: Promise<{ search?: string; page?: string }>;
}

export default async function GamesPage({ searchParams }: Props) {
  const sp = await searchParams;
  const search = sp.search;
  const page = Math.max(1, parseInt(sp.page ?? '1', 10) || 1);

  let items: GameListItem[] = [];
  let total = 0;
  let totalPages = 1;
  let hasNextPage = false;
  let hasPrevPage = false;

  try {
    const result = await apiGetGames({ search, page, limit: ITEMS_PER_PAGE });
    items = result.items;
    total = result.total;
    totalPages = result.totalPages;
    hasNextPage = result.hasNextPage ?? false;
    hasPrevPage = result.hasPrevPage ?? false;
  } catch {
    /* non-critical */
  }

  return (
    <>
      <Header />
      <main style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 24px 80px' }}>
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ fontSize: 32, fontWeight: 800, marginBottom: 8 }}>Ігрові сесії</h1>
          <p style={{ color: 'var(--text-dim)', fontSize: 15, margin: 0 }}>
            Відкриті настільні RPG-ігри від майстрів спільноти
          </p>
        </div>

        {items.length === 0 ? (
          <p style={{ color: 'var(--text-dim)' }}>Наразі немає відкритих ігор. Загляньте пізніше!</p>
        ) : (
          <>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                gap: 20,
                marginBottom: 32,
              }}
            >
              {items.map((game) => (
                <GameCard key={game.id} game={game} />
              ))}
            </div>
            <PaginationWrapper
              page={page}
              totalPages={totalPages}
              hasNextPage={hasNextPage}
              hasPrevPage={hasPrevPage}
              accentColor="#10b981"
            />
          </>
        )}
      </main>
      <Footer />
    </>
  );
}
