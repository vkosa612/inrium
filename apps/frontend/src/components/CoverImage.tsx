'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  coverImageLayout,
  DEFAULT_COVER_FOCUS,
  normalizeCoverFocus,
  type CoverFocus,
} from '@/lib/cover-focus';

interface CoverImageProps {
  src: string;
  alt: string;
  focus?: Partial<CoverFocus> | null;
  /** Якщо задано — кадр тримає ці пропорції (напр. 16/9). Інакше заповнює батьківський блок. */
  aspectRatio?: number;
  /** Фіксована висота кадру (картки зі старим layout). Ігнорується, якщо задано aspectRatio. */
  height?: number | string;
  radius?: number | string;
  style?: React.CSSProperties;
  className?: string;
}

export default function CoverImage({
  src,
  alt,
  focus,
  aspectRatio,
  height,
  radius = 0,
  style,
  className,
}: CoverImageProps) {
  const frameRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [frame, setFrame] = useState({ w: 0, h: 0 });
  const [natural, setNatural] = useState({ w: 0, h: 0 });
  const nFocus = normalizeCoverFocus(focus ?? DEFAULT_COVER_FOCUS);

  useEffect(() => {
    setNatural({ w: 0, h: 0 });
    const img = imgRef.current;
    if (img?.complete && img.naturalWidth > 0) {
      setNatural({ w: img.naturalWidth, h: img.naturalHeight });
    }
  }, [src]);

  const measureFrame = useCallback(() => {
    const el = frameRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setFrame((prev) =>
      Math.abs(prev.w - rect.width) < 0.5 && Math.abs(prev.h - rect.height) < 0.5
        ? prev
        : { w: rect.width, h: rect.height },
    );
  }, []);

  useEffect(() => {
    measureFrame();
    const el = frameRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => measureFrame());
    ro.observe(el);
    return () => ro.disconnect();
  }, [measureFrame, src]);

  const ready = frame.w > 0 && frame.h > 0 && natural.w > 0 && natural.h > 0;
  const layout = ready
    ? coverImageLayout(frame.w, frame.h, natural.w, natural.h, nFocus)
    : null;

  return (
    <div
      ref={frameRef}
      className={className}
      style={{
        position: 'relative',
        overflow: 'hidden',
        width: '100%',
        flexShrink: 0,
        ...(aspectRatio ? { aspectRatio: String(aspectRatio) } : { height: height ?? '100%' }),
        borderRadius: radius,
        background: 'rgba(255,255,255,0.03)',
        ...style,
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        ref={imgRef}
        src={src}
        alt={alt}
        draggable={false}
        onLoad={(e) => {
          const img = e.currentTarget;
          setNatural({ w: img.naturalWidth, h: img.naturalHeight });
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
                objectPosition: `${nFocus.x * 100}% ${nFocus.y * 100}%`,
                pointerEvents: 'none',
                userSelect: 'none',
                display: 'block',
              }
        }
      />
    </div>
  );
}
