import { getToken, clearToken } from './token-store';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export class ApiError extends Error {
  constructor(
    public status: number,
    public statusText: string,
    public body: unknown,
  ) {
    super(`API ${status}: ${statusText}`);
    this.name = 'ApiError';
  }
}

interface RequestOptions {
  params?: Record<string, string | number | undefined>;
  headers?: Record<string, string>;
}

async function request<T>(
  method: string,
  endpoint: string,
  body?: unknown,
  options?: RequestOptions,
): Promise<T> {
  const url = new URL(`${API_BASE}${endpoint}`);
  if (options?.params) {
    for (const [key, value] of Object.entries(options.params)) {
      if (value !== undefined) {
        url.searchParams.set(key, String(value));
      }
    }
  }

  const headers: Record<string, string> = {
    ...(body !== undefined && { 'Content-Type': 'application/json' }),
    ...options?.headers,
  };

  const token = getToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(url.toString(), {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    if (res.status === 401) {
      clearToken();
    }

    let errorBody: unknown;
    try {
      errorBody = await res.json();
    } catch {
      errorBody = null;
    }
    throw new ApiError(res.status, res.statusText, errorBody);
  }

  return res.json() as Promise<T>;
}

export const api = {
  get: <T>(endpoint: string, options?: RequestOptions) =>
    request<T>('GET', endpoint, undefined, options),

  post: <T>(endpoint: string, body?: unknown, options?: RequestOptions) =>
    request<T>('POST', endpoint, body, options),

  put: <T>(endpoint: string, body?: unknown, options?: RequestOptions) =>
    request<T>('PUT', endpoint, body, options),
};
