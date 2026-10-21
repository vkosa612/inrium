'use client';

import { useCallback, useRef, useState } from 'react';
import { apiUploadImage, resolveMediaUrl, type UploadImageResult } from '@/lib/api';
import CoverAdjustDialog from '@/components/CoverAdjustDialog';
import CoverImage from '@/components/CoverImage';
import {
  COVER_ASPECT_RATIO,
  DEFAULT_COVER_FOCUS,
  type CoverFocus,
} from '@/lib/cover-focus';

const ACCEPT = 'image/jpeg,image/png,image/webp';
const MAX_MB = 5;

export interface ImageUploadProps {
  value: string;
  onChange: (url: string) => void;
  label?: string;
  error?: string;
  preview?: boolean;
  helperText?: string;
  uploadFn?: (file: File) => Promise<UploadImageResult>;
  /** Редактор кадру обкладинки (не для аватарів). */
  adjustable?: boolean;
  focus?: CoverFocus;
  onFocusChange?: (focus: CoverFocus) => void;
  aspectRatio?: number;
}

export default function ImageUpload({
  value,
  onChange,
  label = 'Зображення',
  error,
  preview = true,
  helperText,
  uploadFn,
  adjustable = false,
  focus,
  onFocusChange,
  aspectRatio = COVER_ASPECT_RATIO,
}: ImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [localError, setLocalError] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const [adjustOpen, setAdjustOpen] = useState(false);
  const currentFocus = focus ?? DEFAULT_COVER_FOCUS;

  const previewSrc = resolveMediaUrl(value);

  const uploadFile = useCallback(
    async (file: File) => {
      setLocalError('');
      if (!ACCEPT.split(',').includes(file.type)) {
        setLocalError('Дозволені лише JPG, PNG або WebP');
        return;
      }
      if (file.size > MAX_MB * 1024 * 1024) {
        setLocalError(`Максимальний розмір — ${MAX_MB} MB`);
        return;
      }

      setUploading(true);
      try {
        const result = uploadFn ? await uploadFn(file) : await apiUploadImage(file);
        onChange(result.url);
        onFocusChange?.(DEFAULT_COVER_FOCUS);
      } catch (err) {
        setLocalError(err instanceof Error ? err.message : 'Помилка завантаження');
      } finally {
        setUploading(false);
        if (inputRef.current) inputRef.current.value = '';
      }
    },
    [onChange, onFocusChange, uploadFn],
  );

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) void uploadFile(file);
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) void uploadFile(file);
  }

  const displayError = error ?? localError;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {label && (
        <span style={{
          fontSize: 12,
          fontWeight: 600,
          color: 'var(--text-dim)',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
        }}>
          {label}
        </span>
      )}

      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        style={{
          border: `2px dashed ${dragOver ? 'var(--accent)' : displayError ? '#ef4444' : 'var(--border)'}`,
          borderRadius: 12,
          padding: previewSrc ? 16 : '28px 20px',
          background: dragOver ? 'rgba(245,158,11,0.05)' : 'rgba(255,255,255,0.02)',
          transition: 'border-color 0.15s, background 0.15s',
        }}
      >
        {preview && previewSrc && (
          <div style={{ marginBottom: 16, position: 'relative' }}>
            {adjustable ? (
              <CoverImage
                src={previewSrc}
                alt="Попередній перегляд"
                focus={currentFocus}
                aspectRatio={aspectRatio}
                radius={8}
                style={{ border: '1px solid var(--border)' }}
              />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={previewSrc}
                alt="Попередній перегляд"
                style={{
                  width: '100%',
                  maxHeight: 220,
                  objectFit: 'cover',
                  borderRadius: 8,
                  border: '1px solid var(--border)',
                  display: 'block',
                }}
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            )}
          </div>
        )}

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPT}
            onChange={onFileChange}
            disabled={uploading}
            style={{ display: 'none' }}
          />
          <button
            type="button"
            disabled={uploading}
            onClick={() => inputRef.current?.click()}
            style={{
              padding: '8px 18px',
              borderRadius: 8,
              border: 'none',
              background: uploading ? 'rgba(245,158,11,0.4)' : '#f59e0b',
              color: '#111',
              fontWeight: 700,
              fontSize: 13,
              cursor: uploading ? 'not-allowed' : 'pointer',
            }}
          >
            {uploading ? 'Завантаження…' : previewSrc ? 'Замінити зображення' : 'Обрати файл'}
          </button>

          {previewSrc && adjustable && onFocusChange && (
            <button
              type="button"
              disabled={uploading}
              onClick={() => setAdjustOpen(true)}
              style={{
                padding: '8px 14px',
                borderRadius: 8,
                border: '1px solid var(--border-bright)',
                background: 'transparent',
                color: 'var(--text)',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Налаштувати обкладинку
            </button>
          )}

          {previewSrc && (
            <button
              type="button"
              disabled={uploading}
              onClick={() => {
                onChange('');
                onFocusChange?.(DEFAULT_COVER_FOCUS);
                setLocalError('');
              }}
              style={{
                padding: '8px 14px',
                borderRadius: 8,
                border: '1px solid var(--border)',
                background: 'transparent',
                color: 'var(--text-muted)',
                fontSize: 13,
                cursor: 'pointer',
              }}
            >
              Прибрати зображення
            </button>
          )}

          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            JPG, PNG, WebP · до {MAX_MB} MB
            {helperText ? ` · ${helperText}` : ''}
          </span>
        </div>

        {!previewSrc && (
          <p style={{ margin: '12px 0 0', fontSize: 12, color: 'var(--text-muted)' }}>
            Перетягніть файл сюди або натисніть «Обрати файл»
          </p>
        )}
      </div>

      {adjustOpen && previewSrc && onFocusChange && (
        <CoverAdjustDialog
          src={previewSrc}
          initial={currentFocus}
          aspectRatio={aspectRatio}
          onApply={(next) => {
            onFocusChange(next);
            setAdjustOpen(false);
          }}
          onCancel={() => setAdjustOpen(false)}
        />
      )}

      {displayError && (
        <div style={{
          padding: '8px 12px',
          background: 'rgba(239,68,68,0.08)',
          border: '1px solid rgba(239,68,68,0.25)',
          borderRadius: 6,
          fontSize: 12,
          color: '#ef4444',
        }}>
          {displayError}
        </div>
      )}
    </div>
  );
}
