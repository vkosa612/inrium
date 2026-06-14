'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { GameSystemFull, CreateSystemPayload, ContentStatus } from '@/lib/api';
import { apiCreateSystem, apiUpdateSystem } from '@/lib/api';

const STATUS_OPTIONS: { value: ContentStatus; label: string }[] = [
  { value: 'DRAFT', label: 'Чернетка' },
  { value: 'PUBLISHED', label: 'Опубліковано' },
  { value: 'ARCHIVED', label: 'Архів' },
];

const COMPLEXITY_OPTIONS = ['Початківець', 'Середній', 'Просунутий', 'Hardcore'];
const GENRE_OPTIONS = ['Фентезі', 'Горор/Розслідування', 'Дарк-фентезі', 'Готичний горор', 'Науково-фантастичний', 'Постапокаліптичний', 'Сучасний', 'Інше'];

const inputStyle = {
  width: '100%', background: 'var(--bg-card)', border: '1px solid var(--border)',
  borderRadius: 8, color: 'var(--text)', fontSize: 14, padding: '10px 14px',
  outline: 'none', boxSizing: 'border-box' as const,
};
const labelStyle = {
  display: 'block' as const, fontSize: 12, fontWeight: 600, color: 'var(--text-dim)',
  marginBottom: 6, textTransform: 'uppercase' as const, letterSpacing: '0.05em',
};

function slugify(title: string): string {
  const map: Record<string, string> = {
    а: 'a', б: 'b', в: 'v', г: 'h', ґ: 'g', д: 'd', е: 'e', є: 'ye', ж: 'zh', з: 'z',
    и: 'y', і: 'i', ї: 'yi', й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p',
    р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'kh', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'shch', ь: '', ю: 'yu', я: 'ya',
  };
  return title.toLowerCase().split('').map((c) => map[c] ?? c).join('')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').substring(0, 80);
}

interface SystemFormProps { initial?: GameSystemFull; }

export default function SystemForm({ initial }: SystemFormProps) {
  const router = useRouter();
  const isEdit = !!initial;

  const [title, setTitle] = useState(initial?.title ?? '');
  const [slug, setSlug] = useState(initial?.slug ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [shortDescription, setShortDescription] = useState(initial?.shortDescription ?? '');
  const [complexity, setComplexity] = useState(initial?.complexity ?? '');
  const [genre, setGenre] = useState(initial?.genre ?? '');
  const [tags, setTags] = useState((initial?.tags ?? []).join(', '));
  const [imageUrl, setImageUrl] = useState(initial?.imageUrl ?? '');
  const [status, setStatus] = useState<ContentStatus>(initial?.status ?? 'DRAFT');
  const [slugTouched, setSlugTouched] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (!slugTouched && title) setSlug(slugify(title));
  }, [title, slugTouched]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) { setError('Назва обов\'язкова'); return; }
    if (!description.trim()) { setError('Опис обов\'язковий'); return; }
    setSaving(true); setError(''); setSuccess('');

    const parsedTags = tags.split(',').map((t) => t.trim()).filter(Boolean);
    const payload: CreateSystemPayload = {
      title: title.trim(), slug: slug.trim() || undefined, description: description.trim(),
      shortDescription: shortDescription.trim() || undefined,
      complexity: complexity || undefined, genre: genre || undefined,
      tags: parsedTags, imageUrl: imageUrl.trim() || undefined, status,
    };

    try {
      if (isEdit && initial) {
        await apiUpdateSystem(initial.id, payload);
        setSuccess('Збережено!');
        setTimeout(() => router.push('/admin/systems'), 900);
      } else {
        const created = await apiCreateSystem(payload);
        setSuccess('Створено!');
        setTimeout(() => router.push(`/admin/systems/${created.id}/edit`), 800);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Невідома помилка');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <label style={labelStyle}>Назва *</label>
        <input style={inputStyle} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Назва ігрової системи" required />
      </div>
      <div>
        <label style={labelStyle}>Slug</label>
        <input style={inputStyle} value={slug} onChange={(e) => { setSlug(e.target.value); setSlugTouched(true); }} placeholder="auto-generated" />
        <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>URL: /systems/{slug || '…'}</p>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
        <div>
          <label style={labelStyle}>Статус *</label>
          <select style={inputStyle} value={status} onChange={(e) => setStatus(e.target.value as ContentStatus)}>
            {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <div>
          <label style={labelStyle}>Складність</label>
          <select style={inputStyle} value={complexity} onChange={(e) => setComplexity(e.target.value)}>
            <option value="">— не вказано —</option>
            {COMPLEXITY_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
        </div>
        <div>
          <label style={labelStyle}>Жанр</label>
          <select style={inputStyle} value={genre} onChange={(e) => setGenre(e.target.value)}>
            <option value="">— не вказано —</option>
            {GENRE_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
        </div>
      </div>
      <div>
        <label style={labelStyle}>Короткий опис</label>
        <textarea style={{ ...inputStyle, minHeight: 72, resize: 'vertical' }} value={shortDescription} onChange={(e) => setShortDescription(e.target.value)} placeholder="Коротка анотація (до 512 символів)" />
      </div>
      <div>
        <label style={labelStyle}>Повний опис *</label>
        <textarea style={{ ...inputStyle, minHeight: 280, resize: 'vertical', fontFamily: 'monospace', lineHeight: 1.6 }} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Детальний опис системи..." required />
      </div>
      <div>
        <label style={labelStyle}>Теги (через кому)</label>
        <input style={inputStyle} value={tags} onChange={(e) => setTags(e.target.value)} placeholder="фентезі, класика, пригоди" />
      </div>
      <div>
        <label style={labelStyle}>URL зображення</label>
        <input style={inputStyle} value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://example.com/image.jpg" type="url" />
      </div>

      {error && <div style={{ padding: '10px 16px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, fontSize: 13, color: '#ef4444' }}>{error}</div>}
      {success && <div style={{ padding: '10px 16px', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 8, fontSize: 13, color: '#10b981' }}>{success}</div>}

      <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', paddingTop: 8 }}>
        <button type="button" onClick={() => router.push('/admin/systems')} style={{ padding: '10px 20px', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 14 }}>
          Скасувати
        </button>
        <button type="submit" disabled={saving} style={{ padding: '10px 24px', borderRadius: 8, border: 'none', background: saving ? 'rgba(167,139,250,0.4)' : '#a78bfa', color: '#fff', fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', fontSize: 14 }}>
          {saving ? 'Зберігаю…' : isEdit ? 'Зберегти' : 'Створити'}
        </button>
      </div>
    </form>
  );
}
