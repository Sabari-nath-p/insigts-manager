'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { GooeyToaster } from 'goey-toast';
import 'goey-toast/styles.css';
import { announce, type AlertItem } from '@/lib/alerts/announce';
import { systemAlertsEnabled } from '@/lib/alerts/prefs';
import { alertBody, alertTitle } from '@/lib/alerts/wording';
import { claimUnseen } from '@/lib/alerts/seen';
import { PM_NOTIFICATION_TEXT } from '@/lib/pm/format';
import type { PmNotification } from '@/lib/pm/types';

const POLL_MS = 5_000;
/** Only notifications from the last few minutes pop up, so opening the site after a day away does not flood the screen. */
const FRESH_MS = 10 * 60_000;

interface WorkspaceNotification {
  id: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  readAt: string | null;
  createdAt: string;
}

/** Unread, recent and not shown before. */
function fresh<T extends { id: string; readAt: string | null; createdAt: string }>(source: string, items: T[]): T[] {
  const now = Date.now();
  const recent = items.filter((n) => !n.readAt && now - new Date(n.createdAt).getTime() < FRESH_MS);
  const claimed = new Set(claimUnseen(source, recent.map((n) => n.id)));
  return recent.filter((n) => claimed.has(n.id));
}

function pmAlert(n: PmNotification): AlertItem {
  const text = PM_NOTIFICATION_TEXT[n.type] ?? n.type;
  const link = n.taskRef ? `/projects/${n.taskRef.split('-')[0]}?task=${n.taskRef}` : '/projects';
  const dueType = n.type === 'task.due_soon' || n.type === 'task.due_today';
  return {
    id: n.id,
    title: dueType ? `${text} ${n.taskRef ?? ''}`.trim() : `${n.actorName ?? 'Someone'} ${text} ${n.taskRef ?? ''}`.trim(),
    body: n.taskTitle,
    link,
  };
}

function useDarkTheme(): boolean {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const read = () => {
      const chosen = document.documentElement.getAttribute('data-theme');
      setDark(chosen ? chosen === 'dark' : media.matches);
    };
    read();
    media.addEventListener('change', read);
    const observer = new MutationObserver(read);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => {
      media.removeEventListener('change', read);
      observer.disconnect();
    };
  }, []);
  return dark;
}

/**
 * Lives once in the root layout. Every 5 seconds (and whenever the tab comes back) it asks for new
 * workspace and Projects notifications and pops up the new ones: a gooey toast in the top right, your sound,
 * and a system pop-up when the tab is hidden. Nothing here needs the server to push anything.
 */
export function AlertsHost() {
  const router = useRouter();
  const pathname = usePathname();
  const dark = useDarkTheme();
  const go = useRef((link: string) => router.push(link));
  go.current = (link) => router.push(link);

  const signedOut = pathname.startsWith('/login');
  useEffect(() => {
    if (signedOut) return;
    let running = false;
    let projectsAllowed = true;
    let cancelled = false;

    async function check() {
      if (running) return;
      // Nobody is looking and background pop-ups are off: leave the alerts unshown, so they pop up the moment the tab is back in front.
      if ((document.hidden || !document.hasFocus()) && !systemAlertsEnabled()) return;
      running = true;
      const found: AlertItem[] = [];
      try {
        const res = await fetch('/api/notifications', { cache: 'no-store' });
        if (res.ok) {
          const data = (await res.json()) as { items?: WorkspaceNotification[] };
          for (const n of fresh('workspace', data.items ?? [])) found.push({ id: n.id, title: alertTitle(n.type, n.title), body: alertBody(n.type, n.body), link: n.link });
        }
      } catch {
        /* offline: try again next time */
      }
      if (projectsAllowed) {
        try {
          const res = await fetch('/api/pm/notifications', { cache: 'no-store' });
          // People without Projects access get 401/403; stop asking for the rest of this visit.
          if (res.status === 401 || res.status === 403) projectsAllowed = false;
          else if (res.ok) {
            const data = (await res.json()) as { items?: PmNotification[] };
            for (const n of fresh('projects', data.items ?? [])) found.push(pmAlert(n));
          }
        } catch {
          /* offline */
        }
      }
      running = false;
      if (!cancelled) await announce(found, (link) => go.current(link));
    }

    check();
    const timer = setInterval(check, POLL_MS);
    const onVisible = () => !document.hidden && check();
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onVisible);
    return () => {
      cancelled = true;
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onVisible);
    };
  }, [signedOut]);

  return <GooeyToaster position="top-right" offset="68px" theme={dark ? 'dark' : 'light'} />;
}
