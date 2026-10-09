'use client';

/**
 * Browser side of Firebase Cloud Messaging: permission, service worker, token.
 * The Firebase SDK is loaded only when someone turns alerts on, so it never weighs down normal pages.
 */

import { type FirebaseWebConfig, localFirebaseConfig } from './firebase-config';

export type PushState = 'unsupported' | 'unconfigured' | 'blocked' | 'off' | 'on';

/** Remembers which FCM token this browser registered, so we can show the right state and remove it later. */
const TOKEN_KEY = 'insights_fcm_token';

function supported(): boolean {
  return typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
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

/**
 * The settings to use, or null when alerts cannot work yet. The server must be able to send (its secret
 * service account is loaded); the browser settings come from this website, or from the server as a fallback.
 */
async function readConfig(): Promise<FirebaseWebConfig | null> {
  const server = await api<{ firebase: FirebaseWebConfig | null; sending?: boolean }>('/config');
  // A server that reports "sending" says so outright; an older one only returns its web settings,
  // which it fills in only when it is fully set up to send.
  const serverCanSend = server.sending ?? server.firebase !== null;
  if (!serverCanSend) return null;
  return localFirebaseConfig() ?? server.firebase;
}

function storedToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

async function messagingFor(cfg: FirebaseWebConfig) {
  const [app, messaging] = await Promise.all([import('firebase/app'), import('firebase/messaging')]);
  if (!(await messaging.isSupported())) return null;
  const instance = app.getApps().length
    ? app.getApp()
    : app.initializeApp({ apiKey: cfg.apiKey, projectId: cfg.projectId, messagingSenderId: cfg.messagingSenderId, appId: cfg.appId });
  return { sdk: messaging, messaging: messaging.getMessaging(instance) };
}

export async function getPushState(): Promise<PushState> {
  if (!supported()) return 'unsupported';
  if (!(await readConfig())) return 'unconfigured';
  if (Notification.permission === 'denied') return 'blocked';
  return Notification.permission === 'granted' && storedToken() ? 'on' : 'off';
}

/** Asks for permission (must be called from a click), gets this browser's token and registers it. */
export async function enablePush(): Promise<PushState> {
  if (!supported()) return 'unsupported';
  const cfg = await readConfig();
  if (!cfg) return 'unconfigured';
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return permission === 'denied' ? 'blocked' : 'off';

  const fcm = await messagingFor(cfg);
  if (!fcm) return 'unsupported';
  const registration = await navigator.serviceWorker.register('/sw.js');
  await navigator.serviceWorker.ready;
  const token = await fcm.sdk.getToken(fcm.messaging, { vapidKey: cfg.vapidKey, serviceWorkerRegistration: registration });
  if (!token) throw new Error('Firebase did not return a token');
  await api('/subscribe', 'POST', { token });
  try {
    localStorage.setItem(TOKEN_KEY, token);
  } catch {
    /* storage unavailable: alerts still work, the switch just cannot remember its state */
  }
  return 'on';
}

export async function disablePush(): Promise<PushState> {
  const token = storedToken();
  if (token) {
    await api('/unsubscribe', 'POST', { token });
    try {
      const cfg = await readConfig();
      const fcm = cfg ? await messagingFor(cfg) : null;
      if (fcm) await fcm.sdk.deleteToken(fcm.messaging);
    } catch {
      /* the server already forgot this device; a stale token on the browser side is harmless */
    }
    try {
      localStorage.removeItem(TOKEN_KEY);
    } catch {
      /* ignore */
    }
  }
  return 'off';
}

export const sendTestPush = () => api<{ delivered: number }>('/test', 'POST');
