import {
  BadRequestException,
  Injectable,
  PayloadTooLargeException,
  UnsupportedMediaTypeException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomBytes } from 'crypto';
import { createWriteStream, existsSync, mkdirSync } from 'fs';
import { readFile, stat, unlink } from 'fs/promises';
import { join } from 'path';
import { pipeline } from 'stream/promises';
import type { MultipartFile } from '@fastify/multipart';
import { isReasonableSize, matchesMagic, readImageSize } from './image-validation';

const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp']);
const EXT_BY_MIME: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};
const MAX_BYTES = 5 * 1024 * 1024;

export interface UploadImageResult {
  url: string;
  filename: string;
  mimeType: string;
  size: number;
}

/**
 * Локальне сховище зображень. Інтерфейс навмисно мінімальний (`saveImage`), щоб за потреби
 * його можна було замінити на S3-сумісне сховище без змін у контролерах.
 *
 * Безпека: ім'я файлу та розширення генеруються сервером (клієнтське ім'я ігнорується),
 * тип визначається за вмістом (magic bytes), розміри обмежені, будь-яка помилка прибирає частково записаний файл.
 */
@Injectable()
export class UploadsService {
  private readonly uploadsRoot: string;

  constructor(config: ConfigService) {
    this.uploadsRoot = config.get<string>('UPLOADS_DIR', join(process.cwd(), 'uploads'));
    this.ensureDir(this.uploadsRoot);
  }

  async saveImage(file: MultipartFile): Promise<UploadImageResult> {
    const mimeType = file.mimetype?.toLowerCase() ?? '';
    if (!ALLOWED_MIME.has(mimeType)) {
      throw new UnsupportedMediaTypeException('Дозволені лише JPG, PNG або WebP');
    }

    const ext = EXT_BY_MIME[mimeType];
    const now = new Date();
    const relDir = join('images', String(now.getUTCFullYear()), String(now.getUTCMonth() + 1).padStart(2, '0'));
    const absDir = join(this.uploadsRoot, relDir);
    this.ensureDir(absDir);

    const filename = `${randomBytes(16).toString('hex')}${ext}`;
    const absPath = join(absDir, filename);

    try {
      await pipeline(file.file, createWriteStream(absPath, { flags: 'wx', mode: 0o640 }));
      if (file.file.truncated) {
        throw new PayloadTooLargeException('Максимальний розмір файлу — 5 MB');
      }

      const { size } = await stat(absPath);
      if (size === 0) throw new BadRequestException('Порожній файл');
      if (size > MAX_BYTES) throw new PayloadTooLargeException('Максимальний розмір файлу — 5 MB');

      const content = await readFile(absPath);
      if (!matchesMagic(content, mimeType)) {
        throw new UnsupportedMediaTypeException('Вміст файлу не відповідає заявленому типу');
      }
      const dimensions = readImageSize(content, mimeType);
      if (!dimensions) {
        throw new BadRequestException('Не вдалося прочитати розміри зображення (файл пошкоджений)');
      }
      if (!isReasonableSize(dimensions)) {
        throw new BadRequestException('Розміри зображення завеликі (максимум 8192×8192 пікселів)');
      }

      return {
        url: `/uploads/${relDir.replace(/\\/g, '/')}/${filename}`,
        filename,
        mimeType,
        size,
      };
    } catch (err) {
      await unlink(absPath).catch(() => undefined); // не лишаємо сміття на диску
      const code = (err as { code?: string })?.code;
      if (code === 'FST_REQ_FILE_TOO_LARGE') {
        throw new PayloadTooLargeException('Максимальний розмір файлу — 5 MB');
      }
      throw err;
    }
  }

  private ensureDir(dir: string): void {
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
  }
}
