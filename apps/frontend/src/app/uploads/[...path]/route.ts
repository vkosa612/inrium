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

  const segments = path.map((segment) => encodeURIComponent(segment)).join('/');
  const target = `${uploadOrigin()}/uploads/${segments}`;

  const res = await fetch(target, { cache: 'no-store' });
  if (!res.ok) {
    return new NextResponse(null, { status: res.status });
  }

  const body = await res.arrayBuffer();
  return new NextResponse(body, {
    status: 200,
    headers: {
      'Content-Type': res.headers.get('Content-Type') ?? 'application/octet-stream',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
}
