'use client';

import { gooeyToast } from 'goey-toast';
import { soundEnabled, systemAlertsEnabled } from './prefs';

export interface AlertItem {
  id: string;
  title: string;
  body?: string | null;
  link?: string | null;
}

const SOUND_URL = '/notification.mp3';
/** At most this many pop up at once; the rest are summed up in one line. */
const MAX_AT_ONCE = 3;

let audio: HTMLAudioElement | null = null;

/**
 * Plays the alert sound. Resolves true when it actually played. Browsers refuse sound until the person
 * has clicked or pressed a key on the site once, so a refusal is normal and simply resolves false.
 */
export async function playAlertSound(): Promise<boolean> {
  if (!soundEnabled()) return false;
  try {
    audio ??= new Audio(SOUND_URL);
    audio.currentTime = 0;
    await audio.play();
    return true;
  } catch {
    return false;
  }
}

/** A pop-up from the operating system. Silent when our own sound already played (or sound is off). */
async function showSystem(item: AlertItem, silent: boolean) {
  const options = { body: item.body ?? '', icon: '/logo-mark.png', tag: item.id, silent, data: { url: item.link ?? '/dashboard' } };
  try {
    await navigator.serviceWorker.register('/sw.js');
    const registration = await navigator.serviceWorker.ready;
    await registration.showNotification(item.title, options);
  } catch {
    try {
      new Notification(item.title, options);
    } catch {
      /* this browser cannot show one; the sound and the in-page toast still happened or will on return */
    }
  }
}

/**
 * Tells the person about new notifications: your sound once, then either a gooey toast in the corner
 * (when they are looking at the site) or a system pop-up (when the tab is hidden or another window is in front).
 */
export async function announce(items: AlertItem[], go: (link: string) => void) {
  if (items.length === 0) return;
  const played = await playAlertSound();
  const shown = items.slice(0, MAX_AT_ONCE);
  const extra = items.length - shown.length;
  const away = document.hidden || !document.hasFocus();

  if (away && systemAlertsEnabled()) {
    const silent = played || !soundEnabled();
    for (const item of shown) void showSystem(item, silent);
    if (extra > 0) void showSystem({ id: `more-${Date.now()}`, title: `${extra} more notifications` }, silent);
    return;
  }

  for (const item of shown) {
    const link = item.link;
    gooeyToast.info(item.title, {
      description: item.body ?? undefined,
      duration: 7000,
      action: link ? { label: 'Open', onClick: () => go(link) } : undefined,
    });
  }
  if (extra > 0) gooeyToast.info(`${extra} more notifications`, { duration: 7000 });
}
