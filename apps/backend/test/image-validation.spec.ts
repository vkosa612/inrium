import { isSafeImageUrl } from '../src/common/validators/safe-image-url.validator';
import {
  isReasonableSize,
  matchesMagic,
  readImageSize,
} from '../src/modules/uploads/image-validation';
import { makeJpeg, makePng, makeWebp } from './support/images';

describe('image-validation', () => {
  it('читає розміри PNG / JPEG / WebP', () => {
    expect(readImageSize(makePng(320, 200), 'image/png')).toEqual({ width: 320, height: 200 });
    expect(readImageSize(makeJpeg(640, 480), 'image/jpeg')).toEqual({ width: 640, height: 480 });
    expect(readImageSize(makeWebp(1024, 768), 'image/webp')).toEqual({ width: 1024, height: 768 });
  });

  it('magic bytes: відповідність і невідповідність типу', () => {
    expect(matchesMagic(makePng(), 'image/png')).toBe(true);
    expect(matchesMagic(makePng(), 'image/jpeg')).toBe(false);
    expect(matchesMagic(makeJpeg(), 'image/jpeg')).toBe(true);
    expect(matchesMagic(makeWebp(), 'image/webp')).toBe(true);
    expect(matchesMagic(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>'), 'image/png')).toBe(false);
    expect(matchesMagic(Buffer.from('GIF89a......'), 'image/png')).toBe(false);
    // Лише перші 4 байти PNG-підпису недостатньо
    expect(matchesMagic(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0, 0, 0, 0, 0]), 'image/png')).toBe(false);
  });

  it('пошкоджені/обрізані заголовки → null, а не виняток', () => {
    expect(readImageSize(Buffer.from([0x89, 0x50]), 'image/png')).toBeNull();
    expect(readImageSize(Buffer.from([0xff, 0xd8, 0xff]), 'image/jpeg')).toBeNull();
    expect(readImageSize(Buffer.alloc(10), 'image/webp')).toBeNull();
    expect(readImageSize(makePng(), 'image/gif')).toBeNull();
  });

  it('ліміти розмірів: сторона та загальна кількість пікселів', () => {
    expect(isReasonableSize({ width: 1920, height: 1080 })).toBe(true);
    expect(isReasonableSize({ width: 8192, height: 4000 })).toBe(true);
    expect(isReasonableSize({ width: 8193, height: 10 })).toBe(false);
    expect(isReasonableSize({ width: 8192, height: 8192 })).toBe(false); // 67 Mpx > 40 Mpx
    expect(isReasonableSize({ width: 0, height: 10 })).toBe(false);
  });
});

describe('isSafeImageUrl', () => {
  it.each([
    '/uploads/images/2026/10/abcdef0123456789.png',
    'https://example.com/a.jpg',
    'http://example.com/a.jpg',
    '',
  ])('приймає %p', (value) => {
    expect(isSafeImageUrl(value)).toBe(true);
  });

  it.each([
    'javascript:alert(1)',
    'JaVaScRiPt:alert(1)',
    'data:image/svg+xml;base64,PHN2Zz4=',
    'vbscript:msgbox(1)',
    '/uploads/../etc/passwd',
    '/uploads/images/../../secret',
    '//evil.example/x.png',
    '/other/path.png',
    'https://user:pass@example.com/a.png',
    'https://example.com/a b.png',
    'https://example.com/\u0000a.png',
    'ftp://example.com/a.png',
    `https://example.com/${'a'.repeat(600)}`,
    'not a url',
    123 as unknown as string,
  ])('відхиляє %p', (value) => {
    expect(isSafeImageUrl(value)).toBe(false);
  });
});
