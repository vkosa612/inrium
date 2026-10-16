import { registerDecorator, ValidationOptions } from 'class-validator';

const LOCAL_UPLOAD = /^\/uploads\/[A-Za-z0-9][A-Za-z0-9/_.-]*$/;

/**
 * Допустимі значення для полів-зображень: локальний `/uploads/...` або http(s)-посилання.
 * Відхиляє javascript:/data:/vbscript:, шляхи з `..`, облікові дані в URL, керівні символи.
 */
export function isSafeImageUrl(value: unknown): boolean {
  if (typeof value !== 'string') return false;
  if (value === '') return true; // порожнє значення = «очистити»
  if (value.length > 512) return false;
  // eslint-disable-next-line no-control-regex
  if (/[\u0000-\u001f\u007f\s]/.test(value)) return false;

  if (value.startsWith('/')) {
    return LOCAL_UPLOAD.test(value) && !value.includes('..') && !value.includes('//');
  }

  try {
    const url = new URL(value);
    return (url.protocol === 'https:' || url.protocol === 'http:') && !url.username && !url.password;
  } catch {
    return false;
  }
}

export function IsSafeImageUrl(options?: ValidationOptions) {
  return (target: object, propertyName: string) => {
    registerDecorator({
      name: 'isSafeImageUrl',
      target: target.constructor,
      propertyName,
      options: {
        message: 'Дозволені лише шляхи /uploads/... або http(s)-посилання на зображення',
        ...options,
      },
      validator: { validate: (value: unknown) => isSafeImageUrl(value) },
    });
  };
}
