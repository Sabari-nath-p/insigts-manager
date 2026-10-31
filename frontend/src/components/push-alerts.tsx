'use client';

import { useEffect, useState } from 'react';
import { announce, playAlertSound } from '@/lib/alerts/announce';
import { notificationsSupported, setSoundEnabled, setSystemAlerts, soundEnabled, systemAlertsEnabled } from '@/lib/alerts/prefs';

type SystemState = 'unsupported' | 'blocked' | 'off' | 'on';

const HELP: Record<'unsupported' | 'blocked', string> = {
  unsupported: 'This browser cannot show system pop-ups. On iPhone, add the site to your home screen first. Alerts inside the site still work.',
  blocked: 'Pop-ups are blocked for this site. Click the lock icon next to the address, allow Notifications, then reload.',
};

function readState(): SystemState {
  if (!notificationsSupported()) return 'unsupported';
  if (Notification.permission === 'denied') return 'blocked';
  return systemAlertsEnabled() ? 'on' : 'off';
}

function Switch({ label, checked, disabled, onClick }: { label: string; checked: boolean; disabled?: boolean; onClick: () => void }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={`relative h-5 w-9 shrink-0 rounded-full border border-border transition-colors disabled:opacity-50 ${checked ? 'bg-primary' : 'bg-black/10'}`}
    >
      <span className={`absolute left-0 top-0.5 h-3.5 w-3.5 rounded-full bg-white transition-transform ${checked ? 'translate-x-[18px]' : 'translate-x-0.5'}`} />
    </button>
  );
}

/**
 * Alert settings for this device, shown at the bottom of the notification menus.
 * Pop-ups inside the site always work; this switch adds system pop-ups for when the tab is in the background.
 */
export function PushAlerts() {
  const [system, setSystem] = useState<SystemState | null>(null);
  const [sound, setSound] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setSystem(readState());
    setSound(soundEnabled());
  }, []);

  async function toggleSystem() {
    if (system === 'on') {
      setSystemAlerts(false);
      setSystem('off');
      return;
    }
    setBusy(true);
    try {
      // Must run straight from the click, or the browser will not show its Allow box.
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        setSystemAlerts(true);
        setSystem('on');
        navigator.serviceWorker?.register('/sw.js').catch(() => undefined);
        void playAlertSound();
      } else {
        setSystem(permission === 'denied' ? 'blocked' : 'off');
      }
    } finally {
      setBusy(false);
    }
  }

  function toggleSound() {
    const next = !sound;
    setSoundEnabled(next);
    setSound(next);
    if (next) void playAlertSound();
  }

  if (system === null) return null;
  const canToggle = system === 'on' || system === 'off';

  return (
    <div className="flex flex-col gap-2 border-t border-border px-3 py-2.5 text-xs">
      <div className="flex items-center justify-between gap-3">
        <span className="text-text">Pop-up alerts when this tab is in the background</span>
        {canToggle && <Switch label="Pop-up alerts when this tab is in the background" checked={system === 'on'} disabled={busy} onClick={toggleSystem} />}
      </div>
      {!canToggle && <p className="text-muted">{HELP[system]}</p>}
      <div className="flex items-center justify-between gap-3">
        <span className="text-text">Alert sound</span>
        <Switch label="Alert sound" checked={sound} onClick={toggleSound} />
      </div>
      <button
        className="self-start text-primary hover:underline"
        onClick={() => announce([{ id: `test-${Date.now()}`, title: 'Test alert', body: 'This is how alerts look and sound.' }], () => undefined)}
      >
        Send a test alert
      </button>
    </div>
  );
}
