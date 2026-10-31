'use client';

/** Per-device alert settings, kept in this browser only. */

const SOUND_KEY = 'insights_alert_sound';
const SYSTEM_KEY = 'insights_alert_system';

function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* storage unavailable: the setting just does not stick */
  }
}

export const notificationsSupported = () => typeof window !== 'undefined' && 'Notification' in window;

/** The alert sound plays unless the person turned it off. */
export const soundEnabled = () => read(SOUND_KEY) !== 'off';
export const setSoundEnabled = (on: boolean) => write(SOUND_KEY, on ? 'on' : 'off');

/** System pop-ups (the corner box the operating system shows) need both the browser's permission and our own switch. */
export const systemAlertsEnabled = () => notificationsSupported() && Notification.permission === 'granted' && read(SYSTEM_KEY) === 'on';
export const setSystemAlerts = (on: boolean) => write(SYSTEM_KEY, on ? 'on' : 'off');
