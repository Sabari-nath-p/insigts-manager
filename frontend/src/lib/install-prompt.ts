'use client';

/**
 * Chrome and Edge fire "beforeinstallprompt" once per page load, early. The top bar remounts on every page
 * change, so the event is caught here, once, and kept until the person installs or dismisses it.
 */

export interface InstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

let deferred: InstallPromptEvent | null = null;
let installed = false;
let started = false;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((fn) => fn());

export function startInstallCapture() {
  if (started || typeof window === 'undefined') return;
  started = true;
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault(); // keep the browser's mini bar away; our button asks instead
    deferred = e as InstallPromptEvent;
    notify();
  });
  window.addEventListener('appinstalled', () => {
    installed = true;
    deferred = null;
    notify();
  });
}

export const subscribeInstall = (fn: () => void) => {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
};

export const getInstallEvent = () => deferred;
export const wasInstalled = () => installed;

/** True when the site is already running as an installed app. */
export function runningAsApp(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
}

export async function askToInstall(): Promise<void> {
  const event = deferred;
  if (!event) return;
  await event.prompt();
  const { outcome } = await event.userChoice;
  // A browser only lets each event be used once.
  deferred = null;
  if (outcome === 'accepted') installed = true;
  notify();
}
