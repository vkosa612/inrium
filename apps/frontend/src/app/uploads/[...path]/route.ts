import { NextRequest, NextResponse } from 'next/server';

function uploadOrigin(): string {
  if (process.env.BACKEND_UPLOAD_ORIGIN) {
    return process.env.BACKEND_UPLOAD_ORIGIN.replace(/\/$/, '');
  }
  const backendUrl = process.env.BACKEND_URL ?? 'http://localhost:4200/api';
  return backendUrl.replace(/\/api\/?$/, '');
}

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  const { path } = await context.params;
  if (!path?.length) {
    return new NextResponse(null, { status: 404 });
  }

  // Жодних `.`/`..`/порожніх сегментів: URL нормалізується fetch'ем і вивів би запит за межі /uploads.
  if (path.some((segment) => segment === '' || segment === '.' || segment === '..' || segment.includes('\0'))) {
    return new NextResponse(null, { status: 404 });
  }

  const segments = path.map((segment) => encodeURIComponent(segment)).join('/');
  const target = `${uploadOrigin()}/uploads/${segments}`;

  const res = await fetch(target, { cache: 'no-store' });
  if (!res.ok) {
    return new NextResponse(null, { status: res.status });
  }

  // Віддаємо лише зображення; будь-що інше (навіть якщо backend помилково віддав) не проксуємо.
  const contentType = res.headers.get('Content-Type') ?? '';
  if (!/^image\/(png|jpeg|webp)\b/i.test(contentType)) {
    return new NextResponse(null, { status: 404 });
  }

  const body = await res.arrayBuffer();
  return new NextResponse(body, {
    status: 200,
    headers: {
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=31536000, immutable',
      'X-Content-Type-Options': 'nosniff',
      'Content-Security-Policy': "default-src 'none'; sandbox",
    },
  });
}
