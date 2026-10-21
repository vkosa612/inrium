export const COVER_POSITION_MIN = 0;
export const COVER_POSITION_MAX = 1;
export const COVER_SCALE_MIN = 1;
export const COVER_SCALE_MAX = 3;
export const COVER_ASPECT_RATIO = 16 / 9;

export interface CoverFocus {
  x: number;
  y: number;
  scale: number;
}

export const DEFAULT_COVER_FOCUS: CoverFocus = { x: 0.5, y: 0.5, scale: 1 };

export interface CoverLayout {
  width: number;
  height: number;
  left: number;
  top: number;
  overflowX: number;
  overflowY: number;
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

export function normalizeCoverFocus(input?: Partial<CoverFocus> | null): CoverFocus {
  return {
    x: clamp(input?.x ?? DEFAULT_COVER_FOCUS.x, COVER_POSITION_MIN, COVER_POSITION_MAX),
    y: clamp(input?.y ?? DEFAULT_COVER_FOCUS.y, COVER_POSITION_MIN, COVER_POSITION_MAX),
    scale: clamp(input?.scale ?? DEFAULT_COVER_FOCUS.scale, COVER_SCALE_MIN, COVER_SCALE_MAX),
  };
}

export function coverFocusFromEntity(entity?: {
  coverPositionX?: number | null;
  coverPositionY?: number | null;
  coverScale?: number | null;
} | null): CoverFocus {
  return normalizeCoverFocus({
    x: entity?.coverPositionX ?? undefined,
    y: entity?.coverPositionY ?? undefined,
    scale: entity?.coverScale ?? undefined,
  });
}

export function coverFocusToPayload(focus: CoverFocus) {
  const n = normalizeCoverFocus(focus);
  return {
    coverPositionX: n.x,
    coverPositionY: n.y,
    coverScale: n.scale,
  };
}

/**
 * Геометрія шару зображення всередині кадру.
 * scale=1 — мінімальний cover-fit (без порожніх країв); x/y — частка переповнення (0 = лівий/верхній край).
 */
export function coverImageLayout(
  frameW: number,
  frameH: number,
  imgW: number,
  imgH: number,
  focus: CoverFocus,
): CoverLayout {
  const n = normalizeCoverFocus(focus);
  if (frameW <= 0 || frameH <= 0 || imgW <= 0 || imgH <= 0) {
    return { width: 0, height: 0, left: 0, top: 0, overflowX: 0, overflowY: 0 };
  }
  const base = Math.max(frameW / imgW, frameH / imgH);
  const width = imgW * base * n.scale;
  const height = imgH * base * n.scale;
  const overflowX = Math.max(0, width - frameW);
  const overflowY = Math.max(0, height - frameH);
  return {
    width,
    height,
    left: -n.x * overflowX,
    top: -n.y * overflowY,
    overflowX,
    overflowY,
  };
}

export function panCoverFocus(
  start: CoverFocus,
  dx: number,
  dy: number,
  overflowX: number,
  overflowY: number,
): CoverFocus {
  return normalizeCoverFocus({
    ...start,
    x: overflowX > 0 ? start.x - dx / overflowX : start.x,
    y: overflowY > 0 ? start.y - dy / overflowY : start.y,
  });
}
