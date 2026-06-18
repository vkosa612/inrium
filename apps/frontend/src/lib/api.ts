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

export interface PaginatedList {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface ContentList extends PaginatedList {
  items: ContentItem[];
}

export interface ContentQuery {
  type?: string;
  page?: number;
  limit?: number;
  category?: string;
  tag?: string;
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
  bio?: string | null;
  createdAt?: string;
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

export interface UpdateProfilePayload {
  displayName?: string;
  bio?: string;
  avatarUrl?: string;
}

export async function apiUpdateProfile(payload: UpdateProfilePayload): Promise<AuthUser> {
  return apiFetchAuth<AuthUser>('/users/me', {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function apiChangePassword(
  currentPassword: string,
  newPassword: string,
): Promise<{ message: string }> {
  return apiFetchAuth<{ message: string }>('/users/me/change-password', {
    method: 'POST',
    body: JSON.stringify({ currentPassword, newPassword }),
  });
}

export type BookmarkTargetType = 'CONTENT' | 'HELP' | 'SYSTEM' | 'KIT';

export interface BookmarkItem {
  id: string;
  targetType: BookmarkTargetType;
  targetId: string;
  createdAt: string;
  title: string | null;
  slug: string | null;
  url: string | null;
  excerpt: string | null;
  imageUrl: string | null;
  unavailable: boolean;
}

export interface BookmarkCheckResult {
  bookmarked: boolean;
  bookmarkId: string | null;
}

export async function apiGetBookmarks(): Promise<BookmarkItem[]> {
  return apiFetchAuth<BookmarkItem[]>('/bookmarks');
}

export async function apiAddBookmark(
  targetType: BookmarkTargetType,
  targetId: string,
): Promise<BookmarkItem> {
  return apiFetchAuth<BookmarkItem>('/bookmarks', {
    method: 'POST',
    body: JSON.stringify({ targetType, targetId }),
  });
}

export async function apiRemoveBookmark(bookmarkId: string): Promise<{ message: string }> {
  return apiFetchAuth<{ message: string }>(`/bookmarks/${bookmarkId}`, {
    method: 'DELETE',
  });
}

export async function apiCheckBookmark(
  targetType: BookmarkTargetType,
  targetId: string,
): Promise<BookmarkCheckResult> {
  const qs = `?targetType=${encodeURIComponent(targetType)}&targetId=${encodeURIComponent(targetId)}`;
  return apiFetchAuth<BookmarkCheckResult>(`/bookmarks/check${qs}`);
}

// ─── Uploads ──────────────────────────────────────────────────────────────────

export interface UploadImageResult {
  url: string;
  filename: string;
  mimeType: string;
  size: number;
}

/** Resolve relative upload paths for img src (same-origin /uploads/...). */
export function resolveMediaUrl(url: string | null | undefined): string | null {
  if (!url?.trim()) return null;
  const trimmed = url.trim();
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('data:')) {
    return trimmed;
  }
  return trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
}

/** Absolute URL for OpenGraph / metadata. */
export function resolveAbsoluteMediaUrl(url: string | null | undefined): string | undefined {
  const resolved = resolveMediaUrl(url);
  if (!resolved) return undefined;
  if (resolved.startsWith('http://') || resolved.startsWith('https://')) return resolved;
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
  return `${base.replace(/\/$/, '')}${resolved}`;
}

/** Upload cover image (ADMIN/EDITOR). Do not set Content-Type — browser sets multipart boundary. */
export async function apiUploadImage(file: File): Promise<UploadImageResult> {
  const token =
    typeof window !== 'undefined'
      ? localStorage.getItem('inrium_access_token')
      : null;

  const formData = new FormData();
  formData.append('file', file);

  const res = await fetch(`${getBaseUrl()}/uploads/image`, {
    method: 'POST',
    body: formData,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  const body = await res.json() as ApiResponse<UploadImageResult> | ApiError;

  if (res.status === 401) {
    throw new Error('Увійдіть в акаунт ADMIN/EDITOR для завантаження зображень');
  }
  if (res.status === 403) {
    throw new Error('Недостатньо прав для завантаження зображень');
  }
  if (res.status === 413) {
    throw new Error('Файл занадто великий (макс. 5 MB)');
  }
  if (res.status === 415) {
    throw new Error('Дозволені лише JPG, PNG або WebP');
  }
  if (!res.ok || !body.success) {
    const err = body as ApiError;
    throw new Error(err.message ?? `Upload failed (${res.status})`);
  }

  return (body as ApiResponse<UploadImageResult>).data;
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

// ─── Game Systems ─────────────────────────────────────────────────────────────

export interface GameSystem {
  id: string;
  slug: string;
  title: string;
  shortDescription: string | null;
  complexity: string | null;
  genre: string | null;
  tags: string[];
  imageUrl: string | null;
  status: ContentStatus;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface GameSystemFull extends GameSystem {
  description: string;
  kits: Array<{
    id: string;
    slug: string;
    title: string;
    shortDescription: string | null;
    category: string | null;
    priceText: string | null;
    imageUrl: string | null;
  }>;
}

export interface SystemList extends PaginatedList {
  items: GameSystem[];
}

export interface CreateSystemPayload {
  title: string;
  slug?: string;
  description: string;
  shortDescription?: string;
  complexity?: string;
  genre?: string;
  tags?: string[];
  imageUrl?: string;
  status?: ContentStatus;
}
export type UpdateSystemPayload = Partial<CreateSystemPayload>;

export async function apiGetSystems(query: { search?: string; genre?: string; complexity?: string; tag?: string; page?: number; limit?: number } = {}): Promise<SystemList> {
  const qs = buildQuery(query as Record<string, string | number | undefined>);
  return apiFetch<SystemList>(`/systems${qs}`, { cache: 'no-store' });
}

export async function apiGetSystemBySlug(slug: string): Promise<GameSystemFull> {
  return apiFetch<GameSystemFull>(`/systems/${slug}`, { cache: 'no-store' });
}

export async function apiGetAdminSystemsList(query: { status?: ContentStatus; search?: string; page?: number } = {}): Promise<SystemList> {
  const qs = buildQuery(query as Record<string, string | number | undefined>);
  return apiFetchAuth<SystemList>(`/systems/admin/list${qs}`);
}

export async function apiGetSystemByIdAdmin(id: string): Promise<GameSystemFull> {
  return apiFetchAuth<GameSystemFull>(`/systems/admin/${id}`);
}

export async function apiCreateSystem(payload: CreateSystemPayload): Promise<GameSystemFull> {
  return apiFetchAuth<GameSystemFull>('/systems', { method: 'POST', body: JSON.stringify(payload) });
}

export async function apiUpdateSystem(id: string, payload: UpdateSystemPayload): Promise<GameSystemFull> {
  return apiFetchAuth<GameSystemFull>(`/systems/${id}`, { method: 'PATCH', body: JSON.stringify(payload) });
}

export async function apiDeleteSystem(id: string): Promise<void> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('inrium_access_token') : null;
  const res = await fetch(`${getBaseUrl()}/systems/${id}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
  });
  if (!res.ok && res.status !== 204) {
    const body = await res.json().catch(() => ({})) as ApiError;
    throw new Error((body as ApiError).message ?? `Delete failed: ${res.status}`);
  }
}

// ─── Kits ─────────────────────────────────────────────────────────────────────

export interface Kit {
  id: string;
  slug: string;
  title: string;
  shortDescription: string | null;
  category: string | null;
  priceText: string | null;
  imageUrl: string | null;
  status: ContentStatus;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  system: { id: string; slug: string; title: string } | null;
}

export interface KitFull extends Kit {
  description: string;
}

export interface KitList extends PaginatedList {
  items: Kit[];
}

export interface CreateKitPayload {
  title: string;
  slug?: string;
  description: string;
  shortDescription?: string;
  category?: string;
  priceText?: string;
  imageUrl?: string;
  status?: ContentStatus;
  systemId?: string;
}
export type UpdateKitPayload = Partial<CreateKitPayload>;

export async function apiGetKits(query: { search?: string; systemId?: string; system?: string; category?: string; page?: number; limit?: number } = {}): Promise<KitList> {
  const qs = buildQuery(query as Record<string, string | number | undefined>);
  return apiFetch<KitList>(`/kits${qs}`, { cache: 'no-store' });
}

export async function apiGetKitBySlug(slug: string): Promise<KitFull> {
  return apiFetch<KitFull>(`/kits/${slug}`, { cache: 'no-store' });
}

export async function apiGetAdminKitsList(query: { status?: ContentStatus; search?: string; page?: number } = {}): Promise<KitList> {
  const qs = buildQuery(query as Record<string, string | number | undefined>);
  return apiFetchAuth<KitList>(`/kits/admin/list${qs}`);
}

export async function apiGetKitByIdAdmin(id: string): Promise<KitFull> {
  return apiFetchAuth<KitFull>(`/kits/admin/${id}`);
}

export async function apiCreateKit(payload: CreateKitPayload): Promise<KitFull> {
  return apiFetchAuth<KitFull>('/kits', { method: 'POST', body: JSON.stringify(payload) });
}

export async function apiUpdateKit(id: string, payload: UpdateKitPayload): Promise<KitFull> {
  return apiFetchAuth<KitFull>(`/kits/${id}`, { method: 'PATCH', body: JSON.stringify(payload) });
}

export async function apiDeleteKit(id: string): Promise<void> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('inrium_access_token') : null;
  const res = await fetch(`${getBaseUrl()}/kits/${id}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
  });
  if (!res.ok && res.status !== 204) {
    const body = await res.json().catch(() => ({})) as ApiError;
    throw new Error((body as ApiError).message ?? `Delete failed: ${res.status}`);
  }
}

// ─── Home ─────────────────────────────────────────────────────────────────────

export interface HomeStats {
  news: number;
  articles: number;
  systems: number;
  kits: number;
  help: number;
}

export interface HelpItem {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  publishedAt: string | null;
  createdAt: string;
  category: ContentCategory | null;
}

export interface HomeData {
  featured: ContentItem[];
  latestNews: ContentItem[];
  latestArticles: ContentItem[];
  systems: GameSystem[];
  kits: Kit[];
  helpItems: HelpItem[];
  stats: HomeStats;
}

export async function apiGetHome(): Promise<HomeData> {
  return apiFetch<HomeData>('/home', { cache: 'no-store' });
}

// ─── Search ───────────────────────────────────────────────────────────────────

export interface SearchResult {
  id: string;
  type: 'content' | 'help' | 'system' | 'kit';
  subtype: string | null;
  title: string;
  slug: string;
  excerpt: string | null;
  url: string;
  updatedAt: string;
}

export interface SearchResponse {
  results: SearchResult[];
  total: number;
  query: string;
}

export async function apiSearch(q: string): Promise<SearchResponse> {
  const qs = q.trim() ? `?q=${encodeURIComponent(q.trim())}` : '';
  return apiFetch<SearchResponse>(`/search${qs}`, { cache: 'no-store' });
}

// ─── Help ─────────────────────────────────────────────────────────────────────

export interface HelpList extends PaginatedList {
  items: ContentItem[];
}

export async function apiGetHelp(
  query: { category?: string; tag?: string; search?: string; page?: number; limit?: number } = {},
): Promise<HelpList> {
  const qs = buildQuery({ ...query, type: 'HELP_PAGE' } as Record<string, string | number | undefined>);
  return apiFetch<HelpList>(`/help${qs}`, { cache: 'no-store' });
}

export async function apiGetHelpBySlug(slug: string): Promise<ContentItemFull> {
  return apiFetch<ContentItemFull>(`/help/${slug}`, { cache: 'no-store' });
}

// ─── Sitemap ──────────────────────────────────────────────────────────────────

export interface SitemapData {
  content: Array<{ slug: string; updatedAt: string }>;
  help: Array<{ slug: string; updatedAt: string }>;
  systems: Array<{ slug: string; updatedAt: string }>;
  kits: Array<{ slug: string; updatedAt: string }>;
}

export async function apiGetSitemap(): Promise<SitemapData> {
  return apiFetch<SitemapData>('/sitemap', { next: { revalidate: 3600 } });
}

// ─── Games ────────────────────────────────────────────────────────────────────

export interface GameMaster {
  id: string;
  displayName: string;
  avatarUrl: string | null;
}

export interface GameListItem {
  id: string;
  slug: string;
  title: string;
  description: string;
  status: string;
  maxPlayers: number | null;
  startsAt: string | null;
  createdAt: string;
  updatedAt: string;
  master: GameMaster;
  gameSystem: { id: string; slug: string; title: string } | null;
  approvedCount: number;
}

export interface GameDetail extends GameListItem {
  applications: Array<{
    id: string;
    status: string;
    user: GameMaster;
  }>;
}

export interface GameList extends PaginatedList {
  items: GameListItem[];
}

export async function apiGetGames(
  query: { status?: string; gameSystemId?: string; search?: string; page?: number; limit?: number } = {},
): Promise<GameList> {
  const qs = buildQuery(query);
  return apiFetch<GameList>(`/games${qs}`, { cache: 'no-store' });
}

export async function apiGetGameBySlug(slug: string): Promise<GameDetail> {
  return apiFetch<GameDetail>(`/games/${slug}`, { cache: 'no-store' });
}

export async function apiApplyToGame(gameId: string, message?: string): Promise<GameApplication> {
  return apiFetchAuth<GameApplication>(`/games/${gameId}/apply`, {
    method: 'POST',
    body: JSON.stringify({ message }),
  });
}

export type GameStatus = 'DRAFT' | 'OPEN' | 'FULL' | 'IN_PROGRESS' | 'FINISHED' | 'CANCELLED';
export type ApplicationStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';

export interface GameApplication {
  id: string;
  status: ApplicationStatus;
  message: string | null;
  createdAt: string;
  updatedAt?: string;
  user?: GameMaster;
}

export interface MyGameItem extends GameListItem {
  applicationCount: number;
  pendingApplicationCount: number;
}

export interface MyGameApplication {
  id: string;
  status: ApplicationStatus;
  message: string | null;
  createdAt: string;
  updatedAt: string;
  game: {
    id: string;
    slug: string;
    title: string;
    status: GameStatus;
    startsAt: string | null;
    master: { id: string; displayName: string };
  };
}

export interface CreateGamePayload {
  title: string;
  slug?: string;
  description: string;
  status?: GameStatus;
  maxPlayers?: number;
  startsAt?: string;
  gameSystemId?: string;
}

export type UpdateGamePayload = Partial<CreateGamePayload>;

export async function apiGetMyGames(): Promise<MyGameItem[]> {
  return apiFetchAuth<MyGameItem[]>('/games/my/games');
}

export async function apiGetMyApplications(): Promise<MyGameApplication[]> {
  return apiFetchAuth<MyGameApplication[]>('/games/my/applications');
}

export async function apiGetGameById(id: string): Promise<GameListItem> {
  return apiFetchAuth<GameListItem>(`/games/by-id/${id}`);
}

export async function apiGetGameApplications(gameId: string): Promise<GameApplication[]> {
  return apiFetchAuth<GameApplication[]>(`/games/by-id/${gameId}/applications`);
}

export async function apiGetMyGameApplication(gameId: string): Promise<{ application: GameApplication | null }> {
  return apiFetchAuth<{ application: GameApplication | null }>(`/games/by-id/${gameId}/my-application`);
}

export async function apiCreateGame(payload: CreateGamePayload): Promise<GameListItem> {
  return apiFetchAuth<GameListItem>('/games', { method: 'POST', body: JSON.stringify(payload) });
}

export async function apiUpdateGame(id: string, payload: UpdateGamePayload): Promise<GameListItem> {
  return apiFetchAuth<GameListItem>(`/games/${id}`, { method: 'PATCH', body: JSON.stringify(payload) });
}

export async function apiDeleteGame(id: string): Promise<void> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('inrium_access_token') : null;
  const res = await fetch(`${getBaseUrl()}/games/${id}`, {
    method: 'DELETE',
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
  });
  if (!res.ok && res.status !== 204) {
    const body = await res.json().catch(() => ({})) as ApiError;
    throw new Error(body.message ?? `Delete failed: ${res.status}`);
  }
}

export async function apiCancelGameApplication(gameId: string, appId: string): Promise<GameApplication> {
  return apiFetchAuth<GameApplication>(`/games/${gameId}/applications/${appId}/cancel`, { method: 'PATCH' });
}

export async function apiApproveGameApplication(gameId: string, appId: string): Promise<GameApplication> {
  return apiFetchAuth<GameApplication>(`/games/${gameId}/applications/${appId}/approve`, { method: 'PATCH' });
}

export async function apiRejectGameApplication(gameId: string, appId: string): Promise<GameApplication> {
  return apiFetchAuth<GameApplication>(`/games/${gameId}/applications/${appId}/reject`, { method: 'PATCH' });
}

/** Alias for public game detail by slug */
export const apiGetGame = apiGetGameBySlug;

// ─── Public users ─────────────────────────────────────────────────────────────

export interface PublicUserProfile {
  id: string;
  displayName: string;
  role: string;
  avatarUrl: string | null;
  bio: string | null;
  createdAt: string;
}

export async function apiGetPublicUser(id: string): Promise<PublicUserProfile> {
  return apiFetch<PublicUserProfile>(`/users/${id}`, { cache: 'no-store' });
}

// ─── Communities ──────────────────────────────────────────────────────────────

export interface Community {
  id: string;
  name: string;
  slug: string;
  description: string;
  coverImageUrl: string | null;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CommunityList extends PaginatedList {
  items: Community[];
}

export async function apiGetCommunities(
  query: { search?: string; page?: number; limit?: number } = {},
): Promise<CommunityList> {
  const qs = buildQuery(query);
  return apiFetch<CommunityList>(`/communities${qs}`, { cache: 'no-store' });
}

export async function apiGetCommunityBySlug(slug: string): Promise<Community> {
  return apiFetch<Community>(`/communities/${slug}`, { cache: 'no-store' });
}
