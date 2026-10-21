import type { Metadata } from 'next';
import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import PaginationWrapper from '@/components/PaginationWrapper';
import { apiGetCommunities, resolveMediaUrl, type Community } from '@/lib/api';
import CoverImage from '@/components/CoverImage';
import { coverFocusFromEntity } from '@/lib/cover-focus';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Спільноти — INRIUM',
  description: 'RPG-спільноти та клуби на INRIUM.',
};

interface Props {
  searchParams: Promise<{ search?: string; page?: string }>;
}

export default async function CommunitiesPage({ searchParams }: Props) {
  const sp = await searchParams;
  const page = Math.max(1, parseInt(sp.page ?? '1', 10) || 1);

  let items: Community[] = [];
  let totalPages = 1;
  let hasNextPage = false;
  let hasPrevPage = false;

  try {
    const result = await apiGetCommunities({ search: sp.search, page, limit: 12 });
    items = result.items;
    totalPages = result.totalPages;
    hasNextPage = result.hasNextPage ?? false;
    hasPrevPage = result.hasPrevPage ?? false;
  } catch {
    /* non-critical */
  }

  return (
    <>
      <Header />
      <main style={{ maxWidth: 900, margin: '0 auto', padding: '32px 24px 80px' }}>
        <h1 style={{ fontSize: 32, fontWeight: 800, marginBottom: 24 }}>Спільноти</h1>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {items.map((c) => {
            const coverSrc = resolveMediaUrl(c.coverImageUrl);
            return (
            <Link key={c.id} href={`/communities/${c.slug}`} style={{ textDecoration: 'none' }}>
              <article
                className="card-hover"
                style={{
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border)',
                  borderRadius: 12,
                  overflow: 'hidden',
                }}
              >
                {coverSrc ? (
                  <CoverImage
                    src={coverSrc}
                    alt=""
                    focus={coverFocusFromEntity(c)}
                    height={120}
                  />
                ) : (
                  <div
                    style={{
                      width: '100%',
                      height: 80,
                      background: 'linear-gradient(135deg, rgba(167,139,250,0.15) 0%, rgba(16,185,129,0.08) 100%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 28,
                    }}
                    aria-hidden
                  >
                    👥
                  </div>
                )}
                <div style={{ padding: 24 }}>
                <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', margin: '0 0 8px' }}>{c.name}</h2>
                <p className="line-clamp-2" style={{ margin: 0, fontSize: 14, color: 'var(--text-dim)' }}>{c.description}</p>
                </div>
              </article>
            </Link>
            );
          })}
        </div>
        {items.length > 0 && (
          <div style={{ marginTop: 32 }}>
            <PaginationWrapper
              page={page}
              totalPages={totalPages}
              hasNextPage={hasNextPage}
              hasPrevPage={hasPrevPage}
              accentColor="#a78bfa"
            />
          </div>
        )}
      </main>
      <Footer />
    </>
  );
}
