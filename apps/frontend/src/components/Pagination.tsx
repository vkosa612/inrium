'use client';

import { useRouter, usePathname, useSearchParams } from 'next/navigation';

interface Props {
  page: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
  accentColor?: string;
}

export default function Pagination({
  page,
  totalPages,
  hasNextPage,
  hasPrevPage,
  accentColor = '#a78bfa',
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  if (totalPages <= 1) return null;

  function goToPage(p: number) {
    const params = new URLSearchParams(searchParams.toString());
    if (p === 1) {
      params.delete('page');
    } else {
      params.set('page', String(p));
    }
    const qs = params.toString();
    router.push(`${pathname}${qs ? `?${qs}` : ''}`);
  }

  const pages = buildPageList(page, totalPages);

  const btnBase: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 36,
    height: 36,
    padding: '0 10px',
    borderRadius: 8,
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    border: '1px solid var(--border)',
    background: 'var(--bg-card)',
    color: 'var(--text-dim)',
    transition: 'all 0.15s',
    textDecoration: 'none',
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 32, flexWrap: 'wrap' }}>
      <button
        onClick={() => goToPage(page - 1)}
        disabled={!hasPrevPage}
        style={{
          ...btnBase,
          opacity: hasPrevPage ? 1 : 0.35,
          cursor: hasPrevPage ? 'pointer' : 'not-allowed',
        }}
      >
        ‹
      </button>

      {pages.map((p, i) =>
        p === '...' ? (
          <span key={`dot-${i}`} style={{ minWidth: 36, textAlign: 'center', color: 'var(--text-muted)', fontSize: 14 }}>…</span>
        ) : (
          <button
            key={p}
            onClick={() => goToPage(p as number)}
            style={{
              ...btnBase,
              background: p === page ? accentColor : 'var(--bg-card)',
              color: p === page ? '#fff' : 'var(--text-dim)',
              border: `1px solid ${p === page ? accentColor : 'var(--border)'}`,
            }}
          >
            {p}
          </button>
        ),
      )}

      <button
        onClick={() => goToPage(page + 1)}
        disabled={!hasNextPage}
        style={{
          ...btnBase,
          opacity: hasNextPage ? 1 : 0.35,
          cursor: hasNextPage ? 'pointer' : 'not-allowed',
        }}
      >
        ›
      </button>

      <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 4 }}>
        {page} / {totalPages}
      </span>
    </div>
  );
}

function buildPageList(current: number, total: number): Array<number | '...'> {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);

  const pages: Array<number | '...'> = [1];

  if (current > 3) pages.push('...');

  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  for (let i = start; i <= end; i++) pages.push(i);

  if (current < total - 2) pages.push('...');
  pages.push(total);

  return pages;
}
