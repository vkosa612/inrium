import { BadRequestException, UnsupportedMediaTypeException } from '@nestjs/common';
import type { MultipartFile } from '@fastify/multipart';
import type { FastifyRequest } from 'fastify';

/**
 * Безпечно читає один файл із multipart-запиту. Повертає 4xx (а не 500) для не-multipart тіла
 * або запиту без файлу.
 */
export async function readUploadedFile(req: FastifyRequest): Promise<MultipartFile> {
  if (!req.isMultipart()) {
    throw new UnsupportedMediaTypeException('Очікується multipart/form-data з полем "file"');
  }
  let data: MultipartFile | undefined;
  try {
    data = await req.file();
  } catch (err) {
    const code = (err as { code?: string })?.code ?? '';
    if (code === 'FST_REQ_FILE_TOO_LARGE') throw err;
    throw new BadRequestException('Некоректний multipart-запит');
  }
  if (!data) {
    throw new BadRequestException('Файл не передано (очікується поле "file")');
  }
  return data;
}
