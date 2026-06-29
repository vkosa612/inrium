import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import GameApplyButton from '@/components/GameApplyButton';
import MarkdownContent from '@/components/MarkdownContent';
import { apiGetGameBySlug, resolveMediaUrl } from '@/lib/api';
import { recruitmentStatusLabel } from '@/lib/game-labels';

export const dynamic = 'force-dynamic';

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://inrium.ua';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  try {
    const game = await apiGetGameBySlug(slug);
    return {
      title: `${game.title} — Ігри — INRIUM`,
      description: game.description.slice(0, 160),
      alternates: { canonical: `${BASE_URL}/games/${slug}` },
    };
  } catch {
    return { title: 'Ігрова сесія — INRIUM' };
  }
}

function formatDate(d: string | null) {
  if (!d) return 'Дата уточнюється';
  return new Date(d).toLocaleString('uk-UA', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function GameDetailPage({ params }: Props) {
  const { slug } = await params;

  let game;
  try {
    game = await apiGetGameBySlug(slug);
  } catch {
    notFound();
  }

  const coverSrc = resolveMediaUrl(game.coverImageUrl);

  return (
    <>
      <Header />
      <main style={{ maxWidth: 800, margin: '0 auto', padding: '40px 24px 80px' }}>
        <Link href="/games" style={{ color: '#f7971f', fontSize: 13, textDecoration: 'none' }}>
          ← Усі ігри
        </Link>

        {coverSrc && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={coverSrc}
            alt={game.title}
            style={{
              width: '100%',
              maxHeight: 320,
              objectFit: 'cover',
              borderRadius: 12,
              marginTop: 16,
              marginBottom: 8,
              border: '1px solid var(--border)',
            }}
          />
        )}

        <h1 style={{ fontSize: 32, fontWeight: 800, margin: '16px 0 8px' }}>{game.title}</h1>
        <p style={{ color: '#10b981', fontSize: 14, marginBottom: 24 }}>
          {recruitmentStatusLabel(game.status)}
        </p>

        <div
          style={{
            display: 'grid',
            gap: 12,
            marginBottom: 32,
            padding: 20,
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: 12,
            fontSize: 14,
            color: 'var(--text-dim)',
          }}
        >
          <div>📅 <strong style={{ color: 'var(--text)' }}>{formatDate(game.startsAt)}</strong></div>
          <div>
            🧙 Майстер:{' '}
            <Link href={`/users/${game.master.id}`} style={{ color: '#f7971f' }}>
              {game.master.displayName}
            </Link>
          </div>
          {game.gameSystem && (
            <div>
              🎲 Система:{' '}
              <Link href={`/systems/${game.gameSystem.slug}`} style={{ color: '#a78bfa' }}>
                {game.gameSystem.title}
              </Link>
            </div>
          )}
          {game.maxPlayers != null && (
            <div>
              👥 Гравці: {game.approvedCount} / {game.maxPlayers}
            </div>
          )}
        </div>

        <div style={{ marginBottom: 32 }}>
          <MarkdownContent content={game.description} />
        </div>

        <GameApplyButton gameId={game.id} gameSlug={game.slug} gameStatus={game.status} masterId={game.master.id} />

        <section style={{ marginTop: 48 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>Учасники</h2>
          {game.applications.length === 0 ? (
            <p style={{ fontSize: 14, color: 'var(--text-muted)', margin: 0 }}>
              Поки що немає схвалених гравців.
            </p>
          ) : (
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {game.applications.map((app) => (
                <li
                  key={app.id}
                  style={{
                    padding: '10px 14px',
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border)',
                    borderRadius: 8,
                    fontSize: 14,
                  }}
                >
                  Гравець:{' '}
                  <Link href={`/users/${app.user.id}`} style={{ color: '#f7971f', fontWeight: 600, textDecoration: 'none' }}>
                    {app.user.displayName}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
      <Footer />
    </>
  );
}
