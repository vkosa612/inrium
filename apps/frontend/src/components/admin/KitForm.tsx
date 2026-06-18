'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { KitFull, CreateKitPayload, ContentStatus, GameSystem } from '@/lib/api';
import { apiCreateKit, apiUpdateKit, apiGetSystems } from '@/lib/api';
import MarkdownEditor from '@/components/MarkdownEditor';
import ImageUpload from '@/components/ImageUpload';

const STATUS_OPTIONS: { value: ContentStatus; label: string }[] = [
  { value: 'DRAFT', label: 'Чернетка' },
  { value: 'PUBLISHED', label: 'Опубліковано' },
  { value: 'ARCHIVED', label: 'Архів' },
];
const CATEGORY_OPTIONS = ['Стартовий', 'GM', 'Гравець', 'One-Shot', 'Цифровий', 'Інший'];

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

interface KitFormProps { initial?: KitFull; }

export default function KitForm({ initial }: KitFormProps) {
  const router = useRouter();
  const isEdit = !!initial;

  const [title, setTitle] = useState(initial?.title ?? '');
  const [slug, setSlug] = useState(initial?.slug ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [shortDescription, setShortDescription] = useState(initial?.shortDescription ?? '');
  const [category, setCategory] = useState(initial?.category ?? '');
  const [priceText, setPriceText] = useState(initial?.priceText ?? '');
  const [imageUrl, setImageUrl] = useState(initial?.imageUrl ?? '');
  const [status, setStatus] = useState<ContentStatus>(initial?.status ?? 'DRAFT');
  const [systemId, setSystemId] = useState(initial?.system?.id ?? '');
  const [systems, setSystems] = useState<GameSystem[]>([]);
  const [slugTouched, setSlugTouched] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    apiGetSystems({ limit: 50 }).then((r) => setSystems(r.items)).catch(() => {});
  }, []);

  useEffect(() => {
    if (!slugTouched && title) setSlug(slugify(title));
  }, [title, slugTouched]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) { setError('Назва обов\'язкова'); return; }
    if (!description.trim()) { setError('Опис обов\'язковий'); return; }
    setSaving(true); setError(''); setSuccess('');

    const payload: CreateKitPayload = {
      title: title.trim(), slug: slug.trim() || undefined, description: description.trim(),
      shortDescription: shortDescription.trim() || undefined,
      category: category || undefined, priceText: priceText.trim() || undefined,
      imageUrl: imageUrl.trim() || undefined, status,
      systemId: systemId || undefined,
    };

    try {
      if (isEdit && initial) {
        await apiUpdateKit(initial.id, payload);
        setSuccess('Збережено!');
        setTimeout(() => router.push('/admin/kits'), 900);
      } else {
        const created = await apiCreateKit(payload);
        setSuccess('Створено!');
        setTimeout(() => router.push(`/admin/kits/${created.id}/edit`), 800);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Невідома помилка');
    } finally { setSaving(false); }
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <label style={labelStyle}>Назва *</label>
        <input style={inputStyle} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Назва набору" required />
      </div>
      <div>
        <label style={labelStyle}>Slug</label>
        <input style={inputStyle} value={slug} onChange={(e) => { setSlug(e.target.value); setSlugTouched(true); }} placeholder="auto-generated" />
        <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>URL: /kits/{slug || '…'}</p>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
        <div>
          <label style={labelStyle}>Статус *</label>
          <select style={inputStyle} value={status} onChange={(e) => setStatus(e.target.value as ContentStatus)}>
            {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <div>
          <label style={labelStyle}>Категорія</label>
          <select style={inputStyle} value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="">— не вказано —</option>
            {CATEGORY_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
        </div>
        <div>
          <label style={labelStyle}>Ціна</label>
          <input style={inputStyle} value={priceText} onChange={(e) => setPriceText(e.target.value)} placeholder="Безкоштовно / $19.99" />
        </div>
      </div>
      <div>
        <label style={labelStyle}>Ігрова система</label>
        <select style={inputStyle} value={systemId} onChange={(e) => setSystemId(e.target.value)}>
          <option value="">— без прив'язки —</option>
          {systems.map((s) => <option key={s.id} value={s.id}>{s.title}</option>)}
        </select>
      </div>
      <div>
        <label style={labelStyle}>Короткий опис</label>
        <textarea style={{ ...inputStyle, minHeight: 72, resize: 'vertical' }} value={shortDescription} onChange={(e) => setShortDescription(e.target.value)} placeholder="Коротка анотація" />
      </div>
      <MarkdownEditor
        label="Повний опис *"
        value={description}
        onChange={setDescription}
        placeholder="Детальний опис набору у форматі Markdown..."
        minHeight={300}
      />
      <ImageUpload
        label="Зображення набору"
        value={imageUrl}
        onChange={setImageUrl}
      />

      {error && <div style={{ padding: '10px 16px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, fontSize: 13, color: '#ef4444' }}>{error}</div>}
      {success && <div style={{ padding: '10px 16px', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 8, fontSize: 13, color: '#10b981' }}>{success}</div>}

      <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', paddingTop: 8 }}>
        <button type="button" onClick={() => router.push('/admin/kits')} style={{ padding: '10px 20px', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 14 }}>Скасувати</button>
        <button type="submit" disabled={saving} style={{ padding: '10px 24px', borderRadius: 8, border: 'none', background: saving ? 'rgba(16,185,129,0.4)' : '#10b981', color: '#fff', fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', fontSize: 14 }}>
          {saving ? 'Зберігаю…' : isEdit ? 'Зберегти' : 'Створити'}
        </button>
      </div>
    </form>
  );
}
