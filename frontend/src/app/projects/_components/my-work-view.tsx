'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { MessageSquarePlus } from 'lucide-react';
import { cn } from '@/lib/cn';
import { Button } from '@/components/ui/button';
import { PRIORITY_COLOR, PRIORITY_LABEL, formatDue } from '@/lib/pm/format';
import { pm, pollEvery } from '@/lib/pm/client';
import type { MyWorkData, PmTask } from '@/lib/pm/types';
import { useToast } from './providers';

const GROUPS: Array<{ key: keyof MyWorkData['groups']; label: string }> = [
  { key: 'overdue', label: 'Overdue' },
  { key: 'today', label: 'Today' },
  { key: 'week', label: 'This week' },
  { key: 'later', label: 'Later' },
  { key: 'none', label: 'No date' },
];

export function MyWorkView({ initial }: { initial: MyWorkData }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data = initial } = useQuery({
    queryKey: ['my-work'],
    queryFn: () => pm<MyWorkData>('/my-work'),
    initialData: initial,
    refetchInterval: pollEvery(10_000),
  });
  const [updating, setUpdating] = useState<string | null>(null);
  const [body, setBody] = useState('');
  const total = GROUPS.reduce((n, g) => n + data.groups[g.key].length, 0);

  async function changeStatus(task: PmTask, columnId: string) {
    const prev = data;
    const col = data.columns.find((c) => c.id === columnId);
    // A task moved into Done leaves My Work, so drop it immediately.
    qc.setQueryData<MyWorkData>(['my-work'], (d) => {
      if (!d) return d;
      const g = { ...d.groups };
      for (const k of Object.keys(g) as Array<keyof typeof g>) {
        g[k] = g[k].map((t) => (t.id === task.id ? { ...t, columnId } : t)).filter((t) => !(t.id === task.id && col?.type === 'done'));
      }
      return { ...d, groups: g };
    });
    try {
      await pm(`/tasks/${task.id}/move`, { method: 'POST', body: { columnId } });
      qc.invalidateQueries({ queryKey: ['projects'] });
    } catch (e) {
      qc.setQueryData(['my-work'], prev);
      toast((e as Error).message);
    }
  }

  async function postUpdate(task: PmTask) {
    const text = body.trim();
    if (!text) return;
    setBody('');
    setUpdating(null);
    qc.setQueryData<MyWorkData>(['my-work'], (d) =>
      d ? { ...d, groups: Object.fromEntries(Object.entries(d.groups).map(([k, list]) => [k, list.map((t) => (t.id === task.id ? { ...t, updateCount: t.updateCount + 1 } : t))])) as MyWorkData['groups'] } : d,
    );
    try {
      await pm(`/tasks/${task.id}/updates`, { method: 'POST', body: { body: text } });
      toast('Update posted');
    } catch (e) {
      qc.invalidateQueries({ queryKey: ['my-work'] });
      toast((e as Error).message);
    }
  }

  return (
    <div className="h-full overflow-y-auto px-4 py-6 sm:px-8">
      <div className="mx-auto max-w-3xl">
        <h1 className="font-display text-[32px] tracking-tight text-text">My Work</h1>
        {total === 0 ? (
          <p className="mt-4 text-sm text-muted">Nothing assigned to you. Tasks assigned to you will show up here.</p>
        ) : (
          GROUPS.map(({ key, label }) => {
            const tasks = data.groups[key];
            if (tasks.length === 0) return null;
            return (
              <section key={key} className="mt-6">
                <h2 className={cn('mb-1.5 text-sm font-medium', key === 'overdue' ? 'text-danger' : 'text-text')}>
                  {label} <span className="font-normal tabular-nums text-muted">{tasks.length}</span>
                </h2>
                <ul className="divide-y divide-border rounded-lg border border-border bg-surface">
                  {tasks.map((t) => (
                    <li key={t.id} className="px-3 py-2">
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                        <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: PRIORITY_COLOR[t.priority] }} title={`${PRIORITY_LABEL[t.priority]} priority`} role="img" aria-label={`${PRIORITY_LABEL[t.priority]} priority`} />
                        <Link href={`/projects/${t.projectKey}?task=${t.ref}`} className="min-w-0 flex-1 truncate text-sm text-text hover:underline">
                          <span className="mr-2 text-xs tabular-nums text-muted">{t.ref}</span>
                          {t.title}
                        </Link>
                        {t.dueDate && <span className={cn('text-xs tabular-nums', key === 'overdue' ? 'font-medium text-danger' : 'text-muted')}>{formatDue(t.dueDate)}</span>}
                        <select
                          aria-label={`Status of ${t.ref}`}
                          value={t.columnId}
                          onChange={(e) => changeStatus(t, e.target.value)}
                          className="h-7 rounded-md border border-border bg-surface px-1.5 text-xs text-text outline-none focus:border-primary"
                        >
                          {data.columns
                            .filter((c) => c.projectId === t.projectId)
                            .map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.name}
                              </option>
                            ))}
                        </select>
                        <button aria-label={`Post an update on ${t.ref}`} className="flex h-7 w-7 items-center justify-center rounded-sm text-muted hover:bg-black/[0.05] hover:text-text" onClick={() => { setUpdating(updating === t.id ? null : t.id); setBody(''); }}>
                          <MessageSquarePlus size={14} />
                        </button>
                      </div>
                      {updating === t.id && (
                        <div className="mt-2 flex gap-2">
                          <input
                            autoFocus
                            value={body}
                            onChange={(e) => setBody(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') postUpdate(t);
                              if (e.key === 'Escape') setUpdating(null);
                            }}
                            maxLength={5000}
                            aria-label="Work update"
                            placeholder="What changed?"
                            className="h-8 flex-1 rounded-md border border-border bg-transparent px-2 text-sm text-text outline-none placeholder:text-muted focus:border-primary"
                          />
                          <Button size="sm" disabled={!body.trim()} onClick={() => postUpdate(t)}>
                            Post
                          </Button>
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              </section>
            );
          })
        )}
      </div>
    </div>
  );
}
