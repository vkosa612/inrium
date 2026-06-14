/**
 * API client for INRIUM backend.
 *
 * Server-side (RSC): uses BACKEND_URL (internal Docker network or localhost).
 * Client-side: uses NEXT_PUBLIC_API_URL (browser-accessible).
 */

function getBaseUrl(): string {
  if (typeof window === 'undefined') {
    // Server-side: prefer internal Docker URL
    return process.env.BACKEND_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4200/api';
  }
  // Client-side: always use public URL
  return process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4200/api';
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
  timestamp: string;
}

interface ApiError {
  success: false;
  statusCode: number;
  message: string;
  error: string;
}

async function apiFetch<T>(
  path: string,
  options?: RequestInit,
): Promise<T> {
  const url = `${getBaseUrl()}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  const body = await res.json() as ApiResponse<T> | ApiError;

  if (!res.ok || !body.success) {
    const err = body as ApiError;
    throw new Error(err.message ?? `API error ${res.status}`);
  }

  return (body as ApiResponse<T>).data;
}

// ─── Content ─────────────────────────────────────────────────────────────────

export interface ContentAuthor {
  id: string;
  displayName: string;
  avatarUrl: string | null;
}

export interface ContentCategory {
  id: string;
  name: string;
  slug: string;
}

export interface ContentItem {
  id: string;
  slug: string;
  type: 'NEWS' | 'ARTICLE' | 'GAME_SYSTEM' | 'KIT' | 'HELP_PAGE';
  status: 'PUBLISHED';
  title: string;
  excerpt: string | null;
  coverImageUrl: string | null;
  isFeatured: boolean;
  publishedAt: string | null;
  createdAt: string;
  author: ContentAuthor | null;
  category: ContentCategory | null;
  tags: Array<{ tag: { id: string; name: string; slug: string } }>;
}

export interface ContentItemFull extends ContentItem {
  content: string;
}

export interface ContentList {
  items: ContentItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ContentQuery {
  type?: string;
  page?: number;
  limit?: number;
  category?: string;
  search?: string;
}

function buildQuery(params: Record<string, string | number | undefined>): string {
  const q = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== '')
    .map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`)
    .join('&');
  return q ? `?${q}` : '';
}

export async function fetchContent(query: ContentQuery = {}): Promise<ContentList> {
  const qs = buildQuery(query as Record<string, string | number | undefined>);
  return apiFetch<ContentList>(`/content${qs}`, { cache: 'no-store' });
}

export async function fetchFeatured(): Promise<ContentItem[]> {
  return apiFetch<ContentItem[]>('/content/featured', { cache: 'no-store' });
}

export async function fetchContentBySlug(slug: string): Promise<ContentItemFull> {
  return apiFetch<ContentItemFull>(`/content/${slug}`, { cache: 'no-store' });
}

// ─── Auth ────────────────────────────────────────────────────────────────────

export interface AuthUser {
  id: string;
  email: string;
  displayName: string;
  role: 'PLAYER' | 'GAME_MASTER' | 'EDITOR' | 'ADMIN';
  status: 'ACTIVE' | 'BLOCKED' | 'DELETED';
  avatarUrl: string | null;
}

export interface AuthResult {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}

export async function apiLogin(email: string, password: string): Promise<AuthResult> {
  return apiFetch<AuthResult>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export async function apiRegister(
  email: string,
  password: string,
  displayName: string,
): Promise<AuthResult> {
  return apiFetch<AuthResult>('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, password, displayName }),
  });
}

export async function apiLogout(refreshToken: string): Promise<void> {
  await apiFetch<{ message: string }>('/auth/logout', {
    method: 'POST',
    body: JSON.stringify({ refreshToken }),
  });
}

/**
 * Authenticated fetch — attaches Bearer token from localStorage.
 * Client-side only (reads localStorage).
 */
export function apiFetchAuth<T>(path: string, options?: RequestInit): Promise<T> {
  const token =
    typeof window !== 'undefined'
      ? localStorage.getItem('inrium_access_token')
      : null;

  return apiFetch<T>(path, {
    ...options,
    headers: {
      ...options?.headers,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
}

/** Fetch current user from backend using stored access token. */
export async function apiGetMe(): Promise<AuthUser> {
  return apiFetchAuth<AuthUser>('/auth/me');
}

// ─── CMS (Admin only) ─────────────────────────────────────────────────────────

export type ContentStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
export type ContentType = 'NEWS' | 'ARTICLE' | 'GAME_SYSTEM' | 'KIT' | 'HELP_PAGE';

/** Content item as seen by admins — any status, includes body */
export interface ContentItemAdmin {
  id: string;
  slug: string;
  type: ContentType;
  status: ContentStatus;
  title: string;
  excerpt: string | null;
  content: string;
  coverImageUrl: string | null;
  isFeatured: boolean;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  author: ContentAuthor | null;
  category: ContentCategory | null;
  tags: Array<{ tag: { id: string; name: string; slug: string } }>;
}

export interface ContentListAdmin {
  items: ContentItemAdmin[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface AdminContentQuery {
  type?: ContentType;
  status?: ContentStatus;
  page?: number;
  limit?: number;
  search?: string;
}

export interface CreateContentPayload {
  title: string;
  slug?: string;
  type: ContentType;
  status?: ContentStatus;
  excerpt?: string;
  content: string;
  coverImageUrl?: string;
  isFeatured?: boolean;
  categoryId?: string;
}

export type UpdateContentPayload = Partial<CreateContentPayload>;

export async function apiGetAdminContentList(
  query: AdminContentQuery = {},
): Promise<ContentListAdmin> {
  const qs = buildQuery(query as Record<string, string | number | undefined>);
  return apiFetchAuth<ContentListAdmin>(`/content/admin/list${qs}`);
}

export async function apiGetContentByIdAdmin(id: string): Promise<ContentItemAdmin> {
  return apiFetchAuth<ContentItemAdmin>(`/content/admin/${id}`);
}

export async function apiCreateContent(
  payload: CreateContentPayload,
): Promise<ContentItemAdmin> {
  return apiFetchAuth<ContentItemAdmin>('/content', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function apiUpdateContent(
  id: string,
  payload: UpdateContentPayload,
): Promise<ContentItemAdmin> {
  return apiFetchAuth<ContentItemAdmin>(`/content/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function apiDeleteContent(id: string): Promise<void> {
  const token =
    typeof window !== 'undefined'
      ? localStorage.getItem('inrium_access_token')
      : null;
  const url = `${getBaseUrl()}/content/${id}`;
  const res = await fetch(url, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok && res.status !== 204) {
    const body = await res.json().catch(() => ({})) as ApiError;
    throw new Error((body as ApiError).message ?? `Delete failed: ${res.status}`);
  }
}
