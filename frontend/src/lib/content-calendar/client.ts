'use client';

/** Browser-side fetch for the content-calendar API (via the /api/content-calendar proxy). Throws Error(message) on failure. */
export async function cc<T = unknown>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  const res = await fetch(`/api/content-calendar${path}`, {
    method: init.method ?? 'GET',
    headers: { 'Content-Type': 'application/json' },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
    // Writes survive a reload or navigation that happens right after the action.
    keepalive: init.method !== undefined && init.method !== 'GET',
  });
  const text = await res.text();
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }
  if (!res.ok) {
    const message = (data as { message?: string | string[] } | null)?.message;
    throw new Error(Array.isArray(message) ? message[0] : (message ?? `Request failed (${res.status})`));
  }
  return data as T;
}
