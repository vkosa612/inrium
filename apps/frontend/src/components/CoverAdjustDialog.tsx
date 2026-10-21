'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  COVER_ASPECT_RATIO,
  COVER_SCALE_MAX,
  COVER_SCALE_MIN,
  coverImageLayout,
  normalizeCoverFocus,
  panCoverFocus,
  type CoverFocus,
} from '@/lib/cover-focus';

interface CoverAdjustDialogProps {
  src: string;
  initial: CoverFocus;
  aspectRatio?: number;
  onApply: (focus: CoverFocus) => void;
  onCancel: () => void;
}

export default function CoverAdjustDialog({
  src,
  initial,
  aspectRatio = COVER_ASPECT_RATIO,
  onApply,
  onCancel,
}: CoverAdjustDialogProps) {
  const frameRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{
    x: number;
    y: number;
    focus: CoverFocus;
    overflowX: number;
    overflowY: number;
  } | null>(null);
  const [focus, setFocus] = useState(() => normalizeCoverFocus(initial));
  const [frame, setFrame] = useState({ w: 0, h: 0 });
  const [natural, setNatural] = useState({ w: 0, h: 0 });

  useEffect(() => {
    const el = frameRef.current;
    if (!el) return;
    const measure = () => {
      const r = el.getBoundingClientRect();
      setFrame({ w: r.width, h: r.height });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [src]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onCancel]);

  const layout =
    frame.w > 0 && frame.h > 0 && natural.w > 0 && natural.h > 0
      ? coverImageLayout(frame.w, frame.h, natural.w, natural.h, focus)
      : null;

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (!layout) return;
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      dragRef.current = {
        x: e.clientX,
        y: e.clientY,
        focus,
        overflowX: layout.overflowX,
        overflowY: layout.overflowY,
      };
    },
    [focus, layout],
  );

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    const drag = dragRef.current;
    if (!drag) return;
    e.preventDefault();
    setFocus(
      panCoverFocus(
        drag.focus,
        e.clientX - drag.x,
        e.clientY - drag.y,
        drag.overflowX,
        drag.overflowY,
      ),
    );
  }, []);

  const endDrag = useCallback(() => {
    dragRef.current = null;
  }, []);

  const btn = (primary?: boolean): React.CSSProperties => ({
    padding: '8px 16px',
    borderRadius: 8,
    border: primary ? 'none' : '1px solid var(--border)',
    background: primary ? '#f59e0b' : 'transparent',
    color: primary ? '#111' : 'var(--text)',
    fontWeight: 700,
    fontSize: 13,
    cursor: 'pointer',
  });

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Налаштувати обкладинку"
      onClick={onCancel}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 80,
        background: 'rgba(0,0,0,0.72)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 'min(720px, 100%)',
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: 16,
          padding: 20,
        }}
      >
        <h2 style={{ fontSize: 18, fontWeight: 800, margin: '0 0 6px', color: 'var(--text)' }}>
          Налаштувати обкладинку
        </h2>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '0 0 16px' }}>
          Перетягніть зображення та змініть масштаб. Порожні краї не допускаються.
        </p>

        <div
          ref={frameRef}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          style={{
            position: 'relative',
            overflow: 'hidden',
            width: '100%',
            aspectRatio: String(aspectRatio),
            borderRadius: 12,
            border: '1px solid var(--border)',
            cursor: 'grab',
            touchAction: 'none',
            background: 'rgba(255,255,255,0.03)',
            marginBottom: 16,
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt=""
            draggable={false}
            onLoad={(e) => {
              const img = e.currentTarget;
              if (img.naturalWidth > 0) {
                setNatural({ w: img.naturalWidth, h: img.naturalHeight });
              }
            }}
            style={
              layout
                ? {
                    position: 'absolute',
                    left: layout.left,
                    top: layout.top,
                    width: layout.width,
                    height: layout.height,
                    maxWidth: 'none',
                    maxHeight: 'none',
                    objectFit: 'fill',
                    pointerEvents: 'none',
                    userSelect: 'none',
                    display: 'block',
                  }
                : {
                    position: 'absolute',
                    inset: 0,
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    pointerEvents: 'none',
                    display: 'block',
                  }
            }
          />
        </div>

        <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-dim)', marginBottom: 8 }}>
          Масштаб · {focus.scale.toFixed(2)}×
        </label>
        <input
          type="range"
          min={COVER_SCALE_MIN}
          max={COVER_SCALE_MAX}
          step={0.01}
          value={focus.scale}
          onChange={(e) => setFocus((f) => normalizeCoverFocus({ ...f, scale: Number(e.target.value) }))}
          style={{ width: '100%', marginBottom: 16, accentColor: '#f59e0b' }}
        />

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: 'flex-end' }}>
          <button type="button" onClick={() => setFocus({ ...focus, x: 0.5, y: 0.5 })} style={btn()}>
            Центрувати
          </button>
          <button type="button" onClick={onCancel} style={btn()}>
            Скасувати
          </button>
          <button type="button" onClick={() => onApply(normalizeCoverFocus(focus))} style={btn(true)}>
            Застосувати
          </button>
        </div>
      </div>
    </div>
  );
}
