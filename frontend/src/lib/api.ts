/**
 * Returns the correct API base URL depending on where the code runs:
 * - In the browser, requests go through the public URL exposed to the host machine.
 * - On the server (SSR), requests use the internal Docker network address when available,
 *   falling back to the public URL for local (non-Docker) development.
 */
export function getApiBaseUrl(): string {
  if (typeof window !== 'undefined') {
    return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
  }
  return (
    process.env.INTERNAL_API_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    'http://localhost:3001/api'
  );
}

export interface ApiFetchOptions extends RequestInit {
  token?: string;
}

export async function apiFetch<T>(path: string, options: ApiFetchOptions = {}): Promise<T> {
  const { token, headers, ...rest } = options;
  const res = await fetch(`${getApiBaseUrl()}${path}`, {
    ...rest,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    cache: 'no-store',
  });

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    const message = body?.message || `Request failed with status ${res.status}`;
    throw new Error(Array.isArray(message) ? message.join(', ') : message);
  }

  return res.json() as Promise<T>;
}
