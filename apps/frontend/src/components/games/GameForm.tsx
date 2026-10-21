'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import MarkdownEditor from '@/components/MarkdownEditor';
import ImageUpload from '@/components/ImageUpload';
import {
  apiCreateGame,
  apiGetSystems,
  apiUpdateGame,
  apiUploadGameCover,
  type CreateGamePayload,
  type GameListItem,
  type GameStatus,
} from '@/lib/api';
import { GAME_STATUS_LABEL, slugifyTitle, toDatetimeLocalValue } from '@/lib/game-labels';
import { coverFocusFromEntity, coverFocusToPayload } from '@/lib/cover-focus';

const STATUS_OPTIONS: { value: GameStatus; label: string }[] = [
  { value: 'DRAFT', label: GAME_STATUS_LABEL.DRAFT },
  { value: 'OPEN', label: GAME_STATUS_LABEL.OPEN },
  { value: 'FULL', label: GAME_STATUS_LABEL.FULL },
  { value: 'IN_PROGRESS', label: GAME_STATUS_LABEL.IN_PROGRESS },
  { value: 'FINISHED', label: GAME_STATUS_LABEL.FINISHED },
  { value: 'CANCELLED', label: GAME_STATUS_LABEL.CANCELLED },
];

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

interface GameFormProps {
  initial?: GameListItem;
}

export default function GameForm({ initial }: GameFormProps) {
  const router = useRouter();
  const isEdit = !!initial;

  const [title, setTitle] = useState(initial?.title ?? '');
  const [slug, setSlug] = useState(initial?.slug ?? '');
  const [slugTouched, setSlugTouched] = useState(!!initial);
  const [description, setDescription] = useState(initial?.description ?? '');
  const [status, setStatus] = useState<GameStatus>((initial?.status as GameStatus) ?? 'DRAFT');
  const [maxPlayers, setMaxPlayers] = useState(initial?.maxPlayers?.toString() ?? '');
  const [startsAt, setStartsAt] = useState(toDatetimeLocalValue(initial?.startsAt));
  const [gameSystemId, setGameSystemId] = useState(initial?.gameSystem?.id ?? '');
  const [coverImageUrl, setCoverImageUrl] = useState(initial?.coverImageUrl ?? '');
  const [coverFocus, setCoverFocus] = useState(() => coverFocusFromEntity(initial));
  const [systems, setSystems] = useState<Array<{ id: string; title: string }>>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    apiGetSystems({ limit: 100 })
      .then((r) => setSystems(r.items.map((s) => ({ id: s.id, title: s.title }))))
      .catch(() => { /* optional */ });
  }, []);

  useEffect(() => {
    if (!slugTouched && title) setSlug(slugifyTitle(title));
  }, [title, slugTouched]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    const payload: CreateGamePayload = {
      title: title.trim(),
      slug: slug.trim() || undefined,
      description: description.trim(),
      status,
      maxPlayers: maxPlayers ? parseInt(maxPlayers, 10) : undefined,
      startsAt: startsAt ? new Date(startsAt).toISOString() : undefined,
      gameSystemId: gameSystemId || undefined,
      coverImageUrl: isEdit ? coverImageUrl.trim() : (coverImageUrl.trim() || undefined),
      ...coverFocusToPayload(coverFocus),
    };
    try {
      if (isEdit && initial) {
        await apiUpdateGame(initial.id, payload);
        router.push('/my/games');
      } else {
        const created = await apiCreateGame(payload);
        router.push(`/my/games/${created.id}/edit`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не вдалося зберегти гру');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={(e) => void handleSubmit(e)} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div>
        <label style={labelStyle}>Назва *</label>
        <input style={inputStyle} value={title} onChange={(e) => setTitle(e.target.value)} required minLength={3} maxLength={200} />
      </div>
      <div>
        <label style={labelStyle}>URL-ідентифікатор</label>
        <input
          style={inputStyle}
          value={slug}
          onChange={(e) => { setSlug(e.target.value); setSlugTouched(true); }}
          pattern="[a-z0-9-]+"
          placeholder="auto-from-title"
        />
      </div>
      <div>
        <label style={labelStyle}>Опис *</label>
        <MarkdownEditor value={description} onChange={setDescription} minHeight={200} />
      </div>
      {isEdit && initial ? (
        <ImageUpload
          label="Обкладинка гри"
          value={coverImageUrl}
          onChange={setCoverImageUrl}
          uploadFn={(file) => apiUploadGameCover(initial.id, file)}
          adjustable
          focus={coverFocus}
          onFocusChange={setCoverFocus}
          helperText="JPG, PNG, WebP"
        />
      ) : (
        <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>
          Обкладинку можна завантажити після створення гри.
        </p>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div>
          <label style={labelStyle}>Статус</label>
          <select style={inputStyle} value={status} onChange={(e) => setStatus(e.target.value as GameStatus)}>
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label style={labelStyle}>Макс. гравців</label>
          <input style={inputStyle} type="number" min={1} max={100} value={maxPlayers} onChange={(e) => setMaxPlayers(e.target.value)} />
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div>
          <label style={labelStyle}>Дата і час</label>
          <input style={inputStyle} type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} />
        </div>
        <div>
          <label style={labelStyle}>Ігрова система</label>
          <select style={inputStyle} value={gameSystemId} onChange={(e) => setGameSystemId(e.target.value)}>
            <option value="">— не обрано —</option>
            {systems.map((s) => (
              <option key={s.id} value={s.id}>{s.title}</option>
            ))}
          </select>
        </div>
      </div>
      {error && (
        <div style={{ padding: '10px 14px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 8, fontSize: 13, color: '#ef4444' }}>
          {error}
        </div>
      )}
      <div style={{ display: 'flex', gap: 12 }}>
        <button type="submit" disabled={saving} style={{
          padding: '10px 22px', borderRadius: 8, border: 'none',
          background: saving ? 'rgba(16,185,129,0.4)' : '#10b981', color: '#111',
          fontWeight: 700, fontSize: 14, cursor: saving ? 'wait' : 'pointer',
        }}>
          {saving ? 'Зберігаю…' : isEdit ? 'Зберегти зміни' : 'Створити гру'}
        </button>
        <button type="button" onClick={() => router.back()} style={{
          padding: '10px 22px', borderRadius: 8, border: '1px solid var(--border)',
          background: 'transparent', color: 'var(--text-dim)', fontSize: 14, cursor: 'pointer',
        }}>
          Скасувати
        </button>
      </div>
    </form>
  );
}
