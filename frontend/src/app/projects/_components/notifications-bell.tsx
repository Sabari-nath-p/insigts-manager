'use client';

import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as Popover from '@radix-ui/react-popover';
import { Bell } from 'lucide-react';
import { pm, pollEvery } from '@/lib/pm/client';
import { relativeTime } from '@/lib/pm/format';
import type { PmNotification } from '@/lib/pm/types';
import { PushAlerts } from '@/components/push-alerts';

const TEXT: Record<string, string> = {
  'task.assigned': 'assigned you',
  'update.posted': 'posted an update on',
  'task.completed': 'completed',
  'task.due_soon': 'Due tomorrow:',
  'task.due_today': 'Due today:',
};

export function NotificationsBell() {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ['pm-notifications'],
    queryFn: () => pm<{ unread: number; items: PmNotification[] }>('/notifications'),
    refetchInterval: pollEvery(20_000),
  });
  const markAll = useMutation({
    mutationFn: () => pm('/notifications/read-all', { method: 'POST' }),
    onMutate: () => {
      qc.setQueryData<{ unread: number; items: PmNotification[] }>(['pm-notifications'], (cur) =>
        cur ? { unread: 0, items: cur.items.map((n) => ({ ...n, readAt: n.readAt ?? new Date().toISOString() })) } : cur,
      );
    },
  });
  const markOne = useMutation({ mutationFn: (id: string) => pm(`/notifications/${id}/read`, { method: 'POST' }), onSuccess: () => qc.invalidateQueries({ queryKey: ['pm-notifications'] }) });

  const unread = data?.unread ?? 0;
  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button aria-label={`Notifications, ${unread} unread`} className="relative flex h-8 w-8 items-center justify-center rounded-md text-muted hover:bg-black/[0.04] hover:text-text">
          <Bell size={16} />
          {unread > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-semibold tabular-nums text-white">
              {unread > 9 ? '9+' : unread}
            </span>
          )}
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content align="end" sideOffset={6} className="z-50 w-80 rounded-md border border-border bg-surface outline-none">
          <div className="flex items-center justify-between border-b border-border px-3 py-2">
            <span className="text-sm font-medium text-text">Notifications</span>
            <button className="text-xs text-primary hover:underline disabled:opacity-40" disabled={unread === 0} onClick={() => markAll.mutate()}>
              Mark all read
            </button>
          </div>
          <div className="max-h-96 overflow-y-auto thin-scrollbar">
            {(data?.items ?? []).length === 0 && <p className="px-3 py-6 text-center text-sm text-muted">Nothing yet. Assignments and updates will show up here.</p>}
            {(data?.items ?? []).map((n) => (
              <Link
                key={n.id}
                href={n.taskRef ? `/projects/${n.taskRef.split('-')[0]}?task=${n.taskRef}` : '/projects'}
                onClick={() => !n.readAt && markOne.mutate(n.id)}
                className="flex gap-2 border-b border-border px-3 py-2 last:border-0 hover:bg-black/[0.02]"
              >
                <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${n.readAt ? 'bg-transparent' : 'bg-primary'}`} aria-hidden />
                <span className="min-w-0 text-sm text-text">
                  {n.type === 'task.due_soon' || n.type === 'task.due_today' ? (
                    <>
                      {TEXT[n.type]} <span className="font-medium">{n.taskRef}</span> {n.taskTitle}
                    </>
                  ) : (
                    <>
                      <span className="font-medium">{n.actorName ?? 'Someone'}</span> {TEXT[n.type] ?? n.type} <span className="font-medium">{n.taskRef}</span> {n.taskTitle}
                    </>
                  )}
                  <span className="block text-xs text-muted">{relativeTime(n.createdAt)}</span>
                </span>
              </Link>
            ))}
          </div>
          <PushAlerts />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
