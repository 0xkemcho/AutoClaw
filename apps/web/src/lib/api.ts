const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export async function fetchWithAuth(
  path: string,
  token: string,
  options?: RequestInit,
) {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...options?.headers,
    },
  });

  if (!res.ok) {
    throw new Error(`API error: ${res.status}`);
  }

  return res.json();
}

/**
 * Fetch from API using localStorage auth token.
 * Throws if no token or on non-ok response.
 */
export async function fetchApi<T = unknown>(
  path: string,
  options?: Omit<RequestInit, 'body'> & { body?: unknown },
): Promise<T> {
  const token = localStorage.getItem('auth_token');
  if (!token) throw new Error('Not authenticated');

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...options?.headers,
    },
    body: options?.body ? JSON.stringify(options.body) : undefined,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => `Status ${res.status}`);
    throw new Error(text);
  }

  return res.json();
}
