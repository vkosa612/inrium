import { describe, expect, it } from 'vitest';
import { safeNextPath } from '@/lib/auth-redirect';

describe('safeNextPath', () => {
  it.each([
    ['/my/games', '/my/games'],
    ['/games/abc?x=1#top', '/games/abc?x=1#top'],
    ['  /profile  ', '/profile'],
  ])('залишає внутрішній шлях %s', (input, expected) => {
    expect(safeNextPath(input)).toBe(expected);
  });

  it.each([
    [null],
    [undefined],
    [''],
    ['   '],
    ['https://evil.example'],
    ['//evil.example/path'],
    ['/\\evil.example'],
    ['\\\\evil.example'],
    ['javascript:alert(1)'],
    ['/path\nSet-Cookie: a=b'],
    ['evil.example'],
  ])('відхиляє небезпечне значення %p → /', (input) => {
    expect(safeNextPath(input)).toBe('/');
  });

  it.each([['/login'], ['/login?next=/x'], ['/register'], ['/forgot-password'], ['/reset-password?token=1'], ['/login/']])(
    'не повертає на сторінку автентифікації %s (цикл редіректів) → /',
    (input) => {
      expect(safeNextPath(input)).toBe('/');
    },
  );
});
