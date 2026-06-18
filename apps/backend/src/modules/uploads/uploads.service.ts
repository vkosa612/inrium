import {
  BadRequestException,
  Injectable,
  PayloadTooLargeException,
  UnsupportedMediaTypeException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createWriteStream, existsSync, mkdirSync, statSync, unlinkSync } from 'fs';
import { open } from 'fs/promises';
import { join } from 'path';
import { pipeline } from 'stream/promises';
import { randomBytes } from 'crypto';
import type { MultipartFile } from '@fastify/multipart';

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
      throw new UnsupportedMediaTypeException(
        'Allowed types: image/jpeg, image/png, image/webp',
      );
    }

    const ext = EXT_BY_MIME[mimeType];
    const now = new Date();
    const year = String(now.getUTCFullYear());
    const month = String(now.getUTCMonth() + 1).padStart(2, '0');
    const relDir = join('images', year, month);
    const absDir = join(this.uploadsRoot, relDir);
    this.ensureDir(absDir);

    const token = randomBytes(8).toString('hex');
    const filename = `${token}${ext}`;
    const absPath = join(absDir, filename);

    try {
      await pipeline(file.file, createWriteStream(absPath));
    } catch (err) {
      const code = (err as { code?: string })?.code;
      if (code === 'FST_REQ_FILE_TOO_LARGE') {
        throw new PayloadTooLargeException('Max file size is 5 MB');
      }
      throw err;
    }

    const { size } = statSync(absPath);
    if (size > MAX_BYTES) {
      unlinkSync(absPath);
      throw new PayloadTooLargeException('Max file size is 5 MB');
    }
    if (size === 0) {
      unlinkSync(absPath);
      throw new BadRequestException('Empty file');
    }

    const header = await this.readFileHeader(absPath);
    if (!this.matchesMagic(header, mimeType)) {
      unlinkSync(absPath);
      throw new UnsupportedMediaTypeException('File content does not match declared type');
    }

    const urlPath = `/uploads/${relDir.replace(/\\/g, '/')}/${filename}`;
    return { url: urlPath, filename, mimeType, size };
  }

  private ensureDir(dir: string): void {
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
  }

  private async readFileHeader(path: string): Promise<Buffer> {
    const fh = await open(path, 'r');
    try {
      const buf = Buffer.alloc(12);
      await fh.read(buf, 0, 12, 0);
      return buf;
    } finally {
      await fh.close();
    }
  }

  private matchesMagic(header: Buffer, mimeType: string): boolean {
    if (mimeType === 'image/jpeg') {
      return header[0] === 0xff && header[1] === 0xd8 && header[2] === 0xff;
    }
    if (mimeType === 'image/png') {
      return header[0] === 0x89 && header[1] === 0x50 && header[2] === 0x4e && header[3] === 0x47;
    }
    if (mimeType === 'image/webp') {
      return (
        header.toString('ascii', 0, 4) === 'RIFF' &&
        header.toString('ascii', 8, 12) === 'WEBP'
      );
    }
    return false;
  }
}
