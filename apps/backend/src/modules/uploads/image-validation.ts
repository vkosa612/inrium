/** Перевірка вмісту зображень без сторонніх залежностей: magic bytes + розміри (захист від decompression bomb). */

export const MAX_IMAGE_SIDE = 8192;
export const MAX_IMAGE_PIXELS = 40_000_000;

export type ImageMime = 'image/jpeg' | 'image/png' | 'image/webp';

export function matchesMagic(header: Buffer, mime: string): boolean {
  if (mime === 'image/jpeg') {
    return header.length >= 3 && header[0] === 0xff && header[1] === 0xd8 && header[2] === 0xff;
  }
  if (mime === 'image/png') {
    return (
      header.length >= 8 &&
      header.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
    );
  }
  if (mime === 'image/webp') {
    return (
      header.length >= 12 &&
      header.toString('ascii', 0, 4) === 'RIFF' &&
      header.toString('ascii', 8, 12) === 'WEBP'
    );
  }
  return false;
}

export interface ImageSize {
  width: number;
  height: number;
}

/** Повертає розміри або null, якщо заголовок пошкоджений/непідтримуваний. */
export function readImageSize(buf: Buffer, mime: string): ImageSize | null {
  try {
    if (mime === 'image/png') return readPng(buf);
    if (mime === 'image/jpeg') return readJpeg(buf);
    if (mime === 'image/webp') return readWebp(buf);
  } catch {
    return null;
  }
  return null;
}

function readPng(buf: Buffer): ImageSize | null {
  if (buf.length < 24 || buf.toString('ascii', 12, 16) !== 'IHDR') return null;
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

function readJpeg(buf: Buffer): ImageSize | null {
  let offset = 2;
  while (offset + 9 < buf.length) {
    if (buf[offset] !== 0xff) return null;
    const marker = buf[offset + 1];
    if (marker === 0xff) {
      offset += 1; // padding
      continue;
    }
    const isSof = marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;
    if (isSof) {
      return { height: buf.readUInt16BE(offset + 5), width: buf.readUInt16BE(offset + 7) };
    }
    offset += 2 + buf.readUInt16BE(offset + 2);
  }
  return null;
}

function readWebp(buf: Buffer): ImageSize | null {
  if (buf.length < 30) return null;
  const chunk = buf.toString('ascii', 12, 16);
  if (chunk === 'VP8 ') {
    if (buf[23] !== 0x9d || buf[24] !== 0x01 || buf[25] !== 0x2a) return null;
    return { width: buf.readUInt16LE(26) & 0x3fff, height: buf.readUInt16LE(28) & 0x3fff };
  }
  if (chunk === 'VP8L') {
    if (buf[20] !== 0x2f) return null;
    const bits = buf.readUInt32LE(21);
    return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 };
  }
  if (chunk === 'VP8X') {
    return { width: buf.readUIntLE(24, 3) + 1, height: buf.readUIntLE(27, 3) + 1 };
  }
  return null;
}

export function isReasonableSize(size: ImageSize): boolean {
  return (
    size.width > 0 &&
    size.height > 0 &&
    size.width <= MAX_IMAGE_SIDE &&
    size.height <= MAX_IMAGE_SIDE &&
    size.width * size.height <= MAX_IMAGE_PIXELS
  );
}
