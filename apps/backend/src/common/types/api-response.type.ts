export interface ApiSuccessResponse<T = unknown> {
  success: true;
  data: T;
  timestamp: string;
}

export interface ApiErrorResponse {
  success: false;
  statusCode: number;
  message: string | string[];
  error: string;
  /** Машинозчитуваний код (CSRF_INVALID, CAPTCHA_REQUIRED, …), якщо є. */
  code?: string;
  path: string;
  requestId?: string;
  timestamp: string;
}

export interface PaginationMeta {
  page: number;
  take: number;
  totalItems: number;
  totalPages: number;
}

export interface PaginatedData<T> {
  items: T[];
  pagination: PaginationMeta;
}
