'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { ContentItemAdmin, CreateContentPayload, ContentType, ContentStatus } from '@/lib/api';
import { apiCreateContent, apiUpdateContent } from '@/lib/api';
import MarkdownEditor from '@/components/MarkdownEditor';

const TYPE_OPTIONS: { value: ContentType; label: string }[] = [
  { value: 'NEWS', label: 'Новини' },
  { value: 'ARTICLE', label: 'Стаття' },
  { value: 'GAME_SYSTEM', label: 'Ігрова система' },
  { value: 'KIT', label: 'Набір' },
  { value: 'HELP_PAGE', label: 'Довідка' },
];

const STATUS_OPTIONS: { value: ContentStatus; label: string }[] = [
  { value: 'DRAFT', label: 'Чернетка' },
  { value: 'PUBLISHED', label: 'Опубліковано' },
  { value: 'ARCHIVED', label: 'Архів' },
];

interface ContentFormProps {
  initial?: ContentItemAdmin;
}

function slugify(title: string): string {
  const map: Record<string, string> = {
    а: 'a', б: 'b', в: 'v', г: 'h', ґ: 'g', д: 'd', е: 'e',
    є: 'ye', ж: 'zh', з: 'z', и: 'y', і: 'i', ї: 'yi', й: 'y',
    к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r',
    с: 's', т: 't', у: 'u', ф: 'f', х: 'kh', ц: 'ts', ч: 'ch',
    ш: 'sh', щ: 'shch', ь: '', ю: 'yu', я: 'ya',
  };
  return title
    .toLowerCase()
    .split('')
    .map((c) => map[c] ?? c)
    .join('')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 80);
}

const inputStyle = {
  width: '100%',
  background: 'var(--bg-card)',
  border: '1px solid var(--border)',
  borderRadius: 8,
  color: 'var(--text)',
  fontSize: 14,
  padding: '10px 14px',
  outline: 'none',
  boxSizing: 'border-box' as const,
};

const labelStyle = {
  display: 'block' as const,
  fontSize: 12,
  fontWeight: 600,
  color: 'var(--text-dim)',
  marginBottom: 6,
  textTransform: 'uppercase' as const,
  letterSpacing: '0.05em',
};

export default function ContentForm({ initial }: ContentFormProps) {
  const router = useRouter();
  const isEdit = !!initial;

  const [title, setTitle] = useState(initial?.title ?? '');
  const [slug, setSlug] = useState(initial?.slug ?? '');
  const [type, setType] = useState<ContentType>(initial?.type ?? 'ARTICLE');
  const [status, setStatus] = useState<ContentStatus>(initial?.status ?? 'DRAFT');
  const [excerpt, setExcerpt] = useState(initial?.excerpt ?? '');
  const [content, setContent] = useState(initial?.content ?? '');
  const [coverImageUrl, setCoverImageUrl] = useState(initial?.coverImageUrl ?? '');
  const [isFeatured, setIsFeatured] = useState(initial?.isFeatured ?? false);

  const [slugTouched, setSlugTouched] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Auto-generate slug from title when not manually edited
  useEffect(() => {
    if (!slugTouched && title) {
      setSlug(slugify(title));
    }
  }, [title, slugTouched]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) { setError('Заголовок обов\'язковий'); return; }
    if (!content.trim()) { setError('Текст матеріалу обов\'язковий'); return; }

    setSaving(true);
    setError('');
    setSuccess('');

    const payload: CreateContentPayload = {
      title: title.trim(),
      slug: slug.trim() || undefined,
      type,
      status,
      excerpt: excerpt.trim() || undefined,
      content: content.trim(),
      coverImageUrl: coverImageUrl.trim() || undefined,
      isFeatured,
    };

    try {
      if (isEdit && initial) {
        await apiUpdateContent(initial.id, payload);
        setSuccess('Збережено!');
        setTimeout(() => router.push('/admin/content'), 1000);
      } else {
        const created = await apiCreateContent(payload);
        setSuccess('Створено!');
        setTimeout(() => router.push(`/admin/content/${created.id}/edit`), 800);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Невідома помилка');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Title */}
      <div>
        <label style={labelStyle}>Заголовок *</label>
        <input
          style={inputStyle}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Назва матеріалу"
          required
        />
      </div>

      {/* Slug */}
      <div>
        <label style={labelStyle}>Slug</label>
        <input
          style={inputStyle}
          value={slug}
          onChange={(e) => { setSlug(e.target.value); setSlugTouched(true); }}
          placeholder="auto-generated-from-title"
        />
        <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
          URL: /content/{slug || '…'}
        </p>
      </div>

      {/* Type + Status row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div>
          <label style={labelStyle}>Тип *</label>
          <select
            style={inputStyle}
            value={type}
            onChange={(e) => setType(e.target.value as ContentType)}
          >
            {TYPE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label style={labelStyle}>Статус *</label>
          <select
            style={inputStyle}
            value={status}
            onChange={(e) => setStatus(e.target.value as ContentStatus)}
          >
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Excerpt */}
      <div>
        <label style={labelStyle}>Короткий опис</label>
        <textarea
          style={{ ...inputStyle, minHeight: 72, resize: 'vertical' }}
          value={excerpt}
          onChange={(e) => setExcerpt(e.target.value)}
          placeholder="Короткий анонс матеріалу (необов'язково)"
        />
      </div>

      {/* Content */}
      <MarkdownEditor
        label="Текст матеріалу *"
        value={content}
        onChange={setContent}
        placeholder="Повний текст матеріалу у форматі Markdown..."
        minHeight={340}
        error={!content.trim() && saving ? 'Текст матеріалу обов\'язковий' : undefined}
      />

      {/* Cover image */}
      <div>
        <label style={labelStyle}>URL обкладинки</label>
        <input
          style={inputStyle}
          value={coverImageUrl}
          onChange={(e) => setCoverImageUrl(e.target.value)}
          placeholder="https://example.com/image.jpg"
          type="url"
        />
      </div>

      {/* Featured checkbox */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <input
          type="checkbox"
          id="isFeatured"
          checked={isFeatured}
          onChange={(e) => setIsFeatured(e.target.checked)}
          style={{ width: 18, height: 18, accentColor: 'var(--accent)' }}
        />
        <label htmlFor="isFeatured" style={{ fontSize: 14, color: 'var(--text-dim)', cursor: 'pointer' }}>
          Виділений матеріал (featured)
        </label>
      </div>

      {/* Messages */}
      {error && (
        <div style={{ padding: '10px 16px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, fontSize: 13, color: '#ef4444' }}>
          {error}
        </div>
      )}
      {success && (
        <div style={{ padding: '10px 16px', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 8, fontSize: 13, color: '#10b981' }}>
          {success}
        </div>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', paddingTop: 8 }}>
        <button
          type="button"
          onClick={() => router.push('/admin/content')}
          style={{
            padding: '10px 20px',
            borderRadius: 8,
            border: '1px solid var(--border)',
            background: 'transparent',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            fontSize: 14,
          }}
        >
          Скасувати
        </button>
        <button
          type="submit"
          disabled={saving}
          style={{
            padding: '10px 24px',
            borderRadius: 8,
            border: 'none',
            background: saving ? 'rgba(245,158,11,0.4)' : '#f59e0b',
            color: '#111',
            fontWeight: 700,
            cursor: saving ? 'not-allowed' : 'pointer',
            fontSize: 14,
          }}
        >
          {saving ? 'Зберігаю…' : isEdit ? 'Зберегти' : 'Створити'}
        </button>
      </div>
    </form>
  );
}
