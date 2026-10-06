'use client';

import { useEffect, useState } from 'react';
import { disablePush, enablePush, getPushState, sendTestPush, type PushState } from '@/lib/push-client';

const HELP: Record<Exclude<PushState, 'off' | 'on'>, string> = {
  unsupported: 'This browser cannot show desktop alerts. On iPhone, add the site to your home screen first.',
  unconfigured: 'Desktop alerts are not set up on the server yet. Ask an admin.',
  blocked: 'Alerts are blocked for this site. Allow notifications in the browser address bar, then reload.',
};

/** Switch for desktop alerts on this device, shown at the bottom of the notification menus. */
export function PushAlerts() {
  const [state, setState] = useState<PushState | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');

  useEffect(() => {
    getPushState().then(setState).catch(() => setState('unconfigured'));
  }, []);

  async function toggle() {
    setBusy(true);
    setNote('');
    try {
      setState(state === 'on' ? await disablePush() : await enablePush());
    } catch {
      setNote('Something went wrong. Try again.');
    } finally {
      setBusy(false);
    }
  }

  async function test() {
    setNote('');
    try {
      const { delivered } = await sendTestPush();
      setNote(delivered > 0 ? 'Test sent. Check your notifications.' : 'No device received it. Turn alerts off and on again.');
    } catch {
      setNote('Could not send the test.');
    }
  }

  if (state === null) return null;
  const canToggle = state === 'on' || state === 'off';

  return (
    <div className="border-t border-border px-3 py-2.5 text-xs">
      <div className="flex items-center justify-between gap-3">
        <span className="text-text">Desktop alerts on this device</span>
        {canToggle && (
          <button
            role="switch"
            aria-checked={state === 'on'}
            aria-label="Desktop alerts on this device"
            disabled={busy}
            onClick={toggle}
            className={`relative h-5 w-9 shrink-0 rounded-full border border-border transition-colors disabled:opacity-50 ${state === 'on' ? 'bg-primary' : 'bg-black/10'}`}
          >
            <span className={`absolute top-0.5 h-3.5 w-3.5 rounded-full bg-white transition-transform ${state === 'on' ? 'translate-x-[18px]' : 'translate-x-0.5'}`} />
          </button>
        )}
      </div>
      {!canToggle && <p className="mt-1 text-muted">{HELP[state]}</p>}
      {state === 'on' && (
        <button className="mt-1.5 text-primary hover:underline" onClick={test}>
          Send a test alert
        </button>
      )}
      {note && <p className="mt-1 text-muted">{note}</p>}
    </div>
  );
}
