'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import * as Popover from '@radix-ui/react-popover';
import { Bell } from 'lucide-react';
import { PushAlerts } from './push-alerts';

interface AppNotification {
  id: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  readAt: string | null;
  createdAt: string;
}

function ago(iso: string): string {
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  return h < 24 ? `${h}h ago` : `${Math.floor(h / 24)}d ago`;
}

/** Bell for workspace alerts: someone started or paused work, the 10:00 login reminder. */
export function NotificationCenter() {
  const router = useRouter();
  const [data, setData] = useState<{ unread: number; items: AppNotification[] }>({ unread: 0, items: [] });

  const load = useCallback(async () => {
    if (document.hidden) return;
    try {
      const res = await fetch('/api/notifications', { cache: 'no-store' });
      if (res.ok) setData(await res.json());
    } catch {
      /* offline: keep what we have */
    }
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, 30_000);
    document.addEventListener('visibilitychange', load);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', load);
    };
  }, [load]);

  async function markAll() {
    setData((d) => ({ unread: 0, items: d.items.map((n) => ({ ...n, readAt: n.readAt ?? new Date().toISOString() })) }));
    await fetch('/api/notifications/read-all', { method: 'POST' }).catch(() => undefined);
  }

  async function open(n: AppNotification) {
    if (!n.readAt) {
      setData((d) => ({ unread: Math.max(0, d.unread - 1), items: d.items.map((x) => (x.id === n.id ? { ...x, readAt: new Date().toISOString() } : x)) }));
      fetch(`/api/notifications/${n.id}/read`, { method: 'POST' }).catch(() => undefined);
    }
    if (n.link) router.push(n.link);
  }

  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button
          type="button"
          aria-label={`Notifications, ${data.unread} unread`}
          className="relative flex h-8 w-8 items-center justify-center rounded-md text-muted transition-colors hover:bg-black/[0.04] dark:hover:bg-white/[0.06]"
        >
          <Bell size={17} />
          {data.unread > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-semibold tabular-nums text-white">
              {data.unread > 9 ? '9+' : data.unread}
            </span>
          )}
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content align="end" sideOffset={6} className="z-50 w-80 rounded-md border border-border bg-surface outline-none">
          <div className="flex items-center justify-between border-b border-border px-3 py-2">
            <span className="text-sm font-medium text-text">Notifications</span>
            <button className="text-xs text-primary hover:underline disabled:opacity-40" disabled={data.unread === 0} onClick={markAll}>
              Mark all read
            </button>
          </div>
          <div className="max-h-96 overflow-y-auto thin-scrollbar">
            {data.items.length === 0 && <p className="px-3 py-6 text-center text-sm text-muted">Nothing yet. You will see when teammates start work or take a break.</p>}
            {data.items.map((n) => (
              <button key={n.id} onClick={() => open(n)} className="flex w-full gap-2 border-b border-border px-3 py-2 text-left last:border-0 hover:bg-black/[0.02]">
                <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${n.readAt ? 'bg-transparent' : 'bg-primary'}`} aria-hidden />
                <span className="min-w-0 text-sm text-text">
                  {n.title}
                  {n.body && <span className="block text-xs text-muted">{n.body}</span>}
                  <span className="block text-xs text-muted">{ago(n.createdAt)}</span>
                </span>
              </button>
            ))}
          </div>
          <PushAlerts />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
