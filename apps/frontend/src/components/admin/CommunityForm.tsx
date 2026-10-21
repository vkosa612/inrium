'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import ImageUpload from '@/components/ImageUpload';
import MarkdownEditor from '@/components/MarkdownEditor';
import AdminRouteShell from '@/components/admin/AdminRouteShell';
import { apiCreateCommunity, apiUpdateCommunity, type Community } from '@/lib/api';
import { coverFocusFromEntity, coverFocusToPayload } from '@/lib/cover-focus';

interface Props {
  initial?: Community;
}

function CommunityFormInner({ initial }: Props) {
  const router = useRouter();
  const isEdit = !!initial;

  const [name, setName] = useState(initial?.name ?? '');
  const [slug, setSlug] = useState(initial?.slug ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [coverImageUrl, setCoverImageUrl] = useState(initial?.coverImageUrl ?? '');
  const [coverFocus, setCoverFocus] = useState(() => coverFocusFromEntity(initial));
  const [isPublished, setIsPublished] = useState(initial?.isPublished ?? true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    const payload = {
      name: name.trim(),
      slug: slug.trim() || undefined,
      description: description.trim(),
      coverImageUrl: isEdit ? coverImageUrl.trim() : (coverImageUrl.trim() || undefined),
      ...coverFocusToPayload(coverFocus),
      isPublished,
    };
    try {
      if (isEdit && initial) {
        await apiUpdateCommunity(initial.id, payload);
      } else {
        await apiCreateCommunity(payload);
      }
      router.push('/admin/communities');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не вдалося зберегти');
    } finally {
      setSaving(false);
    }
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

  return (
    <>
      <Header />
      <main style={{ maxWidth: 760, margin: '0 auto', padding: '32px 24px 80px' }}>
        <div style={{ marginBottom: 24, fontSize: 13 }}>
          <Link href="/admin/communities" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>
            ← Спільноти
          </Link>
        </div>
        <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 24, color: 'var(--text)' }}>
          {isEdit ? 'Редагувати спільноту' : 'Нова спільнота'}
        </h1>
        <form onSubmit={(e) => void handleSubmit(e)} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-dim)', marginBottom: 6 }}>
              Назва *
            </label>
            <input style={inputStyle} value={name} onChange={(e) => setName(e.target.value)} required minLength={2} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-dim)', marginBottom: 6 }}>
              URL-ідентифікатор
            </label>
            <input style={inputStyle} value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="auto-from-name" />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-dim)', marginBottom: 6 }}>
              Опис *
            </label>
            <MarkdownEditor value={description} onChange={setDescription} minHeight={180} />
          </div>
          <ImageUpload
            label="Обкладинка"
            value={coverImageUrl}
            onChange={setCoverImageUrl}
            adjustable
            focus={coverFocus}
            onFocusChange={setCoverFocus}
          />
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: 'var(--text-dim)' }}>
            <input type="checkbox" checked={isPublished} onChange={(e) => setIsPublished(e.target.checked)} />
            Опубліковано
          </label>
          {error && (
            <div
              style={{
                padding: '10px 14px',
                background: 'rgba(239,68,68,0.08)',
                border: '1px solid rgba(239,68,68,0.25)',
                borderRadius: 8,
                fontSize: 13,
                color: '#ef4444',
              }}
            >
              {error}
            </div>
          )}
          <button
            type="submit"
            disabled={saving}
            style={{
              padding: '10px 22px',
              borderRadius: 8,
              border: 'none',
              background: saving ? 'rgba(247,151,31,0.4)' : '#f7971f',
              color: '#111',
              fontWeight: 700,
              cursor: saving ? 'wait' : 'pointer',
              alignSelf: 'flex-start',
            }}
          >
            {saving ? 'Зберігаю…' : 'Зберегти'}
          </button>
        </form>
      </main>
      <Footer />
    </>
  );
}

export default function CommunityForm({ initial }: Props) {
  return (
    <AdminRouteShell requirement="ADMIN">
      <CommunityFormInner initial={initial} />
    </AdminRouteShell>
  );
}
