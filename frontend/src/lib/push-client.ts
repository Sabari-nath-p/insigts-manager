'use client';

/** Browser side of Web Push: permission, service worker, subscription. */

export type PushState = 'unsupported' | 'unconfigured' | 'blocked' | 'off' | 'on';

function supported(): boolean {
  return typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

function keyToBytes(base64Url: string): Uint8Array {
  const padded = (base64Url + '='.repeat((4 - (base64Url.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(padded);
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

async function api<T>(path: string, method = 'GET', body?: unknown): Promise<T> {
  const res = await fetch(`/api/notifications${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Request failed (${res.status})`);
  return (await res.json()) as T;
}

async function currentSubscription(): Promise<PushSubscription | null> {
  const reg = await navigator.serviceWorker.getRegistration('/sw.js');
  return reg ? reg.pushManager.getSubscription() : null;
}

export async function getPushState(): Promise<PushState> {
  if (!supported()) return 'unsupported';
  const { publicKey } = await api<{ publicKey: string | null }>('/config');
  if (!publicKey) return 'unconfigured';
  if (Notification.permission === 'denied') return 'blocked';
  return (await currentSubscription()) && Notification.permission === 'granted' ? 'on' : 'off';
}

/** Asks for permission (must be called from a click), subscribes this device and registers it. */
export async function enablePush(): Promise<PushState> {
  if (!supported()) return 'unsupported';
  const { publicKey } = await api<{ publicKey: string | null }>('/config');
  if (!publicKey) return 'unconfigured';
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return permission === 'denied' ? 'blocked' : 'off';
  const reg = await navigator.serviceWorker.register('/sw.js');
  await navigator.serviceWorker.ready;
  const sub =
    (await reg.pushManager.getSubscription()) ??
    (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyToBytes(publicKey) as BufferSource }));
  await api('/subscribe', 'POST', sub.toJSON());
  return 'on';
}

export async function disablePush(): Promise<PushState> {
  const sub = supported() ? await currentSubscription() : null;
  if (sub) {
    await api('/unsubscribe', 'POST', { endpoint: sub.endpoint });
    await sub.unsubscribe();
  }
  return 'off';
}

export const sendTestPush = () => api<{ delivered: number }>('/test', 'POST');
