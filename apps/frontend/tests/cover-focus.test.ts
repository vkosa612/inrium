import { describe, expect, it } from 'vitest';
import {
  COVER_SCALE_MAX,
  coverFocusFromEntity,
  coverFocusToPayload,
  coverImageLayout,
  DEFAULT_COVER_FOCUS,
  normalizeCoverFocus,
  panCoverFocus,
} from '@/lib/cover-focus';

describe('coverImageLayout', () => {
  it('scale=1 на кадрі з тими самими пропорціями заповнює без зсуву', () => {
    const layout = coverImageLayout(800, 450, 1600, 900, { x: 0.5, y: 0.5, scale: 1 });
    expect(layout.width).toBeCloseTo(800);
    expect(layout.height).toBeCloseTo(450);
    expect(layout.overflowX).toBeCloseTo(0);
    expect(layout.overflowY).toBeCloseTo(0);
    expect(layout.left).toBeCloseTo(0);
    expect(layout.top).toBeCloseTo(0);
  });

  it('масштаб 2× при центрі зсуває на половину переповнення', () => {
    const layout = coverImageLayout(800, 450, 1600, 900, { x: 0.5, y: 0.5, scale: 2 });
    expect(layout.width).toBeCloseTo(1600);
    expect(layout.height).toBeCloseTo(900);
    expect(layout.overflowX).toBeCloseTo(800);
    expect(layout.overflowY).toBeCloseTo(450);
    expect(layout.left).toBeCloseTo(-400);
    expect(layout.top).toBeCloseTo(-225);
  });

  it('x=0 / y=0 показує лівий верхній край без порожнин', () => {
    const layout = coverImageLayout(800, 450, 1600, 900, { x: 0, y: 0, scale: 2 });
    expect(layout.left).toBeCloseTo(0);
    expect(layout.top).toBeCloseTo(0);
    expect(layout.left + layout.width).toBeGreaterThanOrEqual(800);
    expect(layout.top + layout.height).toBeGreaterThanOrEqual(450);
  });

  it('квадратне зображення в 16/9 кадрі обрізає по вертикалі (cover-fit)', () => {
    const layout = coverImageLayout(800, 450, 1000, 1000, { x: 0.5, y: 0.5, scale: 1 });
    expect(layout.width).toBeCloseTo(800);
    expect(layout.height).toBeCloseTo(800);
    expect(layout.overflowX).toBeCloseTo(0);
    expect(layout.overflowY).toBeCloseTo(350);
    expect(layout.left).toBeCloseTo(0);
    expect(layout.top).toBeCloseTo(-175);
  });
});

describe('panCoverFocus', () => {
  it('нормалізує зсув відносно переповнення', () => {
    const next = panCoverFocus({ x: 0.5, y: 0.5, scale: 2 }, 80, 45, 800, 450);
    expect(next.x).toBeCloseTo(0.4);
    expect(next.y).toBeCloseTo(0.4);
  });

  it('не змінює фокус, якщо переповнення нульове (немає порожніх країв)', () => {
    const next = panCoverFocus({ x: 0.5, y: 0.5, scale: 1 }, 200, 200, 0, 0);
    expect(next.x).toBe(0.5);
    expect(next.y).toBe(0.5);
  });

  it('затискає фокус у [0, 1]', () => {
    const next = panCoverFocus({ x: 0, y: 0, scale: 2 }, 10_000, 10_000, 100, 100);
    expect(next.x).toBe(0);
    expect(next.y).toBe(0);
  });
});

describe('normalizeCoverFocus', () => {
  it('підставляє типові значення для старих матеріалів', () => {
    expect(normalizeCoverFocus(null)).toEqual(DEFAULT_COVER_FOCUS);
    expect(coverFocusFromEntity({})).toEqual(DEFAULT_COVER_FOCUS);
  });

  it('затискає масштаб і позицію', () => {
    const n = normalizeCoverFocus({ x: 2, y: -1, scale: 99 });
    expect(n.x).toBe(1);
    expect(n.y).toBe(0);
    expect(n.scale).toBe(COVER_SCALE_MAX);
  });

  it('coverFocusToPayload віддає нормалізовані поля API', () => {
    expect(coverFocusToPayload({ x: 0.25, y: 0.75, scale: 1.5 })).toEqual({
      coverPositionX: 0.25,
      coverPositionY: 0.75,
      coverScale: 1.5,
    });
  });
});
