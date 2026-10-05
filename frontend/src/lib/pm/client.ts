'use client';

/** Browser-side fetch for the project-management API (via the /api/pm proxy). Throws Error(message) on failure. */
export async function pm<T>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  const res = await fetch(`/api/pm${path}`, {
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

export function qs(params: Record<string, string | undefined | null>): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v) sp.set(k, v);
  const s = sp.toString();
  return s ? `?${s}` : '';
}

/** react-query refetchInterval that pauses while the tab is hidden. Safe during server rendering. */
export function pollEvery(ms: number): () => number | false {
  return () => (typeof document !== 'undefined' && document.hidden ? false : ms);
}
