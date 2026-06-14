import { notFound } from 'next/navigation';
import Link from 'next/link';
import { fetchContentBySlug } from '@/lib/api';

export const dynamic = 'force-dynamic';

const TYPE_LABEL: Record<string, string> = {
  NEWS: 'Новини',
  ARTICLE: 'Стаття',
  GAME_SYSTEM: 'Ігрова система',
  KIT: 'Набір',
  HELP_PAGE: 'Довідка',
};

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function ContentSlugPage({ params }: Props) {
  const { slug } = await params;

  let item;
  try {
    item = await fetchContentBySlug(slug);
  } catch {
    notFound();
  }

  const publishedDate = item.publishedAt ?? item.createdAt;
  const formattedDate = new Date(publishedDate).toLocaleDateString('uk-UA', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <div className="max-w-3xl mx-auto px-4 py-12">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-gray-500 mb-8">
          <Link href="/" className="hover:text-amber-400 transition-colors">
            Головна
          </Link>
          <span>/</span>
          <Link
            href={item.type === 'NEWS' ? '/news' : '/articles'}
            className="hover:text-amber-400 transition-colors"
          >
            {TYPE_LABEL[item.type] ?? item.type}
          </Link>
          <span>/</span>
          <span className="text-gray-400 truncate max-w-xs">{item.title}</span>
        </nav>

        {/* Cover image */}
        {item.coverImageUrl && (
          <div className="relative w-full h-64 rounded-xl overflow-hidden mb-8">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={item.coverImageUrl}
              alt={item.title}
              className="w-full h-full object-cover"
            />
          </div>
        )}

        {/* Meta */}
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <span className="px-2 py-1 rounded text-xs font-semibold bg-amber-500/20 text-amber-400 uppercase tracking-wide">
            {TYPE_LABEL[item.type] ?? item.type}
          </span>
          {item.category && (
            <span className="px-2 py-1 rounded text-xs bg-gray-800 text-gray-400">
              {item.category.name}
            </span>
          )}
          <time className="text-sm text-gray-500">{formattedDate}</time>
          {item.author && (
            <span className="text-sm text-gray-500">
              &nbsp;· {item.author.displayName}
            </span>
          )}
        </div>

        {/* Title */}
        <h1 className="text-3xl sm:text-4xl font-bold text-white leading-tight mb-4">
          {item.title}
        </h1>

        {/* Excerpt */}
        {item.excerpt && (
          <p className="text-lg text-gray-400 leading-relaxed mb-8 border-l-4 border-amber-500/50 pl-4">
            {item.excerpt}
          </p>
        )}

        {/* Content */}
        <article className="prose prose-invert prose-amber max-w-none">
          {item.content.split('\n').map((line, idx) =>
            line.trim() === '' ? (
              <br key={idx} />
            ) : (
              <p key={idx} className="text-gray-300 leading-relaxed mb-4">
                {line}
              </p>
            ),
          )}
        </article>

        {/* Tags */}
        {item.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-10 pt-6 border-t border-gray-800">
            {item.tags.map(({ tag }) => (
              <span
                key={tag.id}
                className="px-3 py-1 rounded-full text-xs bg-gray-800 text-gray-400 hover:text-amber-400 transition-colors"
              >
                #{tag.name}
              </span>
            ))}
          </div>
        )}

        {/* Back link */}
        <div className="mt-10">
          <Link
            href={item.type === 'NEWS' ? '/news' : '/articles'}
            className="inline-flex items-center gap-2 text-amber-400 hover:text-amber-300 transition-colors text-sm"
          >
            ← Назад до {TYPE_LABEL[item.type] ?? item.type}
          </Link>
        </div>
      </div>
    </div>
  );
}
