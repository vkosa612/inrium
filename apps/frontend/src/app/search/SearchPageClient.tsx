'use client';

import { useEffect, useState, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiSearch, type SearchResult } from '@/lib/api';

const TYPE_LABEL: Record<string, string> = {
  content: 'Матеріал',
  help: 'Довідка',
  system: 'Ігрова система',
  kit: 'Набір',
};

const TYPE_COLOR: Record<string, string> = {
  content: '#a78bfa',
  help: '#f7971f',
  system: '#22d3ee',
  kit: '#10b981',
};

const SUBTYPE_LABEL: Record<string, string> = {
  NEWS: 'Новини', ARTICLE: 'Стаття', GAME_SYSTEM: 'Ігрова система',
  KIT: 'Набір', HELP_PAGE: 'Довідка',
};

function ResultCard({ result }: { result: SearchResult }) {
  const color = TYPE_COLOR[result.type] ?? '#a78bfa';
  const typeLabel = result.subtype
    ? (SUBTYPE_LABEL[result.subtype] ?? result.subtype)
    : (TYPE_LABEL[result.type] ?? result.type);

  return (
    <Link href={result.url} style={{ textDecoration: 'none', display: 'block' }}>
      <article className="card-hover" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, padding: '16px 20px', cursor: 'pointer', display: 'flex', gap: 16, alignItems: 'flex-start' }}>
        <div style={{ width: 36, height: 36, borderRadius: 8, background: `${color}18`, border: `1px solid ${color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 16 }}>
          {result.type === 'content' ? '📄' : result.type === 'help' ? '📖' : result.type === 'system' ? '🎲' : '📦'}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', gap: 8, marginBottom: 4, alignItems: 'center' }}>
            <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color, background: `${color}18`, border: `1px solid ${color}30`, padding: '2px 8px', borderRadius: 12 }}>
              {typeLabel}
            </span>
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
              {new Date(result.updatedAt).toLocaleDateString('uk-UA', { day: 'numeric', month: 'short', year: 'numeric' })}
            </span>
          </div>
          <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', marginBottom: 4, lineHeight: 1.35 }}>{result.title}</div>
          {result.excerpt && (
            <p className="line-clamp-2" style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.5, margin: 0 }}>{result.excerpt}</p>
          )}
        </div>
        <div style={{ fontSize: 16, color, flexShrink: 0 }}>→</div>
      </article>
    </Link>
  );
}

function SearchContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialQ = searchParams?.get('q') ?? '';

  const [input, setInput] = useState(initialQ);
  const [query, setQuery] = useState(initialQ);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searched, setSearched] = useState(false);

  const doSearch = useCallback(async (q: string) => {
    if (q.trim().length < 2) {
      setResults([]); setTotal(0); setSearched(false); return;
    }
    setLoading(true); setError(''); setSearched(true);
    try {
      const res = await apiSearch(q);
      setResults(res.results); setTotal(res.total);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Помилка пошуку');
      setResults([]); setTotal(0);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    if (query.trim().length >= 2) void doSearch(query);
    else { setResults([]); setTotal(0); setSearched(false); }
  }, [query, doSearch]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const q = input.trim();
    if (!q) return;
    setQuery(q);
    router.replace(`/search?q=${encodeURIComponent(q)}`);
  }

  const grouped = {
    content: results.filter((r) => r.type === 'content'),
    help: results.filter((r) => r.type === 'help'),
    system: results.filter((r) => r.type === 'system'),
    kit: results.filter((r) => r.type === 'kit'),
  };

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '40px 24px' }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 26, fontWeight: 800, color: 'var(--text)', marginBottom: 6 }}>🔍 Пошук</h1>
        <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Шукай по матеріалах, ігрових системах та наборах</p>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', gap: 10, marginBottom: 36 }}>
        <input
          autoFocus
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Введи запит, наприклад: dnd, pathfinder, стартовий…"
          style={{ flex: 1, background: 'var(--bg-card)', border: '2px solid var(--border-bright)', borderRadius: 10, color: 'var(--text)', fontSize: 16, padding: '12px 18px', outline: 'none' }}
          onFocus={(e) => { (e.target as HTMLInputElement).style.borderColor = '#a78bfa'; }}
          onBlur={(e) => { (e.target as HTMLInputElement).style.borderColor = 'var(--border-bright)'; }}
        />
        <button type="submit" style={{ padding: '12px 24px', borderRadius: 10, background: '#a78bfa', color: '#fff', fontWeight: 700, fontSize: 15, border: 'none', cursor: 'pointer', flexShrink: 0 }}>
          Шукати
        </button>
        {query && (
          <button type="button" onClick={() => { setInput(''); setQuery(''); router.replace('/search'); }}
            style={{ padding: '12px 14px', borderRadius: 10, background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 15 }}>
            ✕
          </button>
        )}
      </form>

      {loading && <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-muted)' }}>Шукаємо…</div>}

      {error && (
        <div style={{ padding: '12px 16px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 8, color: '#ef4444', fontSize: 13, marginBottom: 20 }}>
          {error}
        </div>
      )}

      {!loading && searched && total === 0 && !error && (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
          <div style={{ fontSize: 40, marginBottom: 14 }}>😕</div>
          <p style={{ marginBottom: 8, fontSize: 16, fontWeight: 600, color: 'var(--text-dim)' }}>Нічого не знайдено за запитом «{query}»</p>
          <p style={{ fontSize: 13 }}>Спробуй інший запит або перегляньте розділи вручну</p>
        </div>
      )}

      {!loading && total > 0 && (
        <div>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 24 }}>
            Знайдено: <strong style={{ color: 'var(--text)' }}>{total}</strong> результатів за «{query}»
          </p>

          {grouped.content.length > 0 && (
            <section style={{ marginBottom: 32 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#a78bfa', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 3, height: 14, background: '#a78bfa', borderRadius: 2, display: 'inline-block' }} />
                Матеріали · {grouped.content.length}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {grouped.content.map((r) => <ResultCard key={r.id} result={r} />)}
              </div>
            </section>
          )}

          {grouped.help.length > 0 && (
            <section style={{ marginBottom: 32 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#f7971f', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 3, height: 14, background: '#f7971f', borderRadius: 2, display: 'inline-block' }} />
                Довідка · {grouped.help.length}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {grouped.help.map((r) => <ResultCard key={r.id} result={r} />)}
              </div>
            </section>
          )}

          {grouped.system.length > 0 && (
            <section style={{ marginBottom: 32 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#22d3ee', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 3, height: 14, background: '#22d3ee', borderRadius: 2, display: 'inline-block' }} />
                Ігрові системи · {grouped.system.length}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {grouped.system.map((r) => <ResultCard key={r.id} result={r} />)}
              </div>
            </section>
          )}

          {grouped.kit.length > 0 && (
            <section style={{ marginBottom: 32 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#10b981', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 3, height: 14, background: '#10b981', borderRadius: 2, display: 'inline-block' }} />
                Набори · {grouped.kit.length}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {grouped.kit.map((r) => <ResultCard key={r.id} result={r} />)}
              </div>
            </section>
          )}
        </div>
      )}

      {!searched && !loading && (
        <div style={{ textAlign: 'center', padding: '48px 0' }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>🔍</div>
          <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 24 }}>Введіть мінімум 2 символи для пошуку</p>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
            {['dnd', 'pathfinder', 'cthulhu', 'набір', 'стартовий'].map((hint) => (
              <button key={hint} onClick={() => { setInput(hint); setQuery(hint); router.replace(`/search?q=${encodeURIComponent(hint)}`); }}
                style={{ padding: '6px 14px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 20, color: 'var(--text-dim)', fontSize: 13, cursor: 'pointer' }}>
                {hint}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function SearchPageClient() {
  return (
    <Suspense fallback={
      <div style={{ maxWidth: 800, margin: '0 auto', padding: '40px 24px', textAlign: 'center', color: 'var(--text-muted)' }}>
        Завантаження…
      </div>
    }>
      <SearchContent />
    </Suspense>
  );
}
