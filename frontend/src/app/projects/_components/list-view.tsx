'use client';

import { useMemo, useState } from 'react';
import { ArrowDown, ArrowUp } from 'lucide-react';
import { cn } from '@/lib/cn';
import { Avatar } from '@/components/ui/avatar';
import { PRIORITY_COLOR, PRIORITY_LABEL, formatDue, isOverdue } from '@/lib/pm/format';
import type { BoardData, PmTask } from '@/lib/pm/types';

type SortKey = 'ref' | 'title' | 'status' | 'priority' | 'assignee' | 'due';
const PRIORITY_RANK = { urgent: 0, high: 1, medium: 2, low: 3 } as const;
const PAGE = 100;

export function ListView({ tasks, data, onOpen }: { tasks: PmTask[]; data: BoardData; onOpen: (t: PmTask) => void }) {
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: 'ref', dir: 1 });
  const [shown, setShown] = useState(PAGE);
  const columns = useMemo(() => new Map(data.columns.map((c) => [c.id, c])), [data.columns]);

  const sorted = useMemo(() => {
    const val = (t: PmTask): string | number => {
      switch (sort.key) {
        case 'ref':
          return t.number;
        case 'title':
          return t.title.toLowerCase();
        case 'status':
          return columns.get(t.columnId)?.position ?? 0;
        case 'priority':
          return PRIORITY_RANK[t.priority];
        case 'assignee':
          return (t.assigneeName ?? '￿').toLowerCase();
        case 'due':
          return t.dueDate ?? '9999';
      }
    };
    return [...tasks].sort((a, b) => (val(a) < val(b) ? -1 : val(a) > val(b) ? 1 : 0) * sort.dir);
  }, [tasks, sort, columns]);

  const head = (key: SortKey, label: string, className = '') => (
    <th scope="col" className={cn('px-3 py-2 text-left text-xs font-medium text-muted', className)} aria-sort={sort.key === key ? (sort.dir === 1 ? 'ascending' : 'descending') : 'none'}>
      <button className="flex items-center gap-1 hover:text-text" onClick={() => setSort((s) => ({ key, dir: s.key === key ? (s.dir === 1 ? -1 : 1) : 1 }))}>
        {label}
        {sort.key === key && (sort.dir === 1 ? <ArrowUp size={11} /> : <ArrowDown size={11} />)}
      </button>
    </th>
  );

  if (tasks.length === 0) {
    return <p className="px-4 py-6 text-sm text-muted">No tasks match. Press C to add one.</p>;
  }

  return (
    <div className="min-h-0 flex-1 overflow-auto px-4 pb-4 thin-scrollbar">
      <table className="w-full min-w-[640px] border-collapse rounded-lg border border-border bg-surface text-sm">
        <thead className="sticky top-0 border-b border-border bg-surface">
          <tr>
            {head('ref', 'Task', 'w-24')}
            {head('title', 'Title')}
            {head('status', 'Status', 'w-28')}
            {head('priority', 'Priority', 'w-28')}
            {head('assignee', 'Assignee', 'w-40')}
            {head('due', 'Due', 'w-24')}
          </tr>
        </thead>
        <tbody>
          {sorted.slice(0, shown).map((t) => {
            const col = columns.get(t.columnId);
            const done = col?.type === 'done';
            return (
              <tr key={t.id} tabIndex={0} onClick={() => onOpen(t)} onKeyDown={(e) => e.key === 'Enter' && onOpen(t)} className="cursor-pointer border-b border-border last:border-0 hover:bg-black/[0.02] focus-visible:bg-black/[0.03] focus-visible:outline-none">
                <td className="px-3 py-1.5 text-xs tabular-nums text-muted">{t.ref}</td>
                <td className={cn('px-3 py-1.5 text-text', done && 'text-muted line-through decoration-muted/60')}>{t.title}</td>
                <td className="px-3 py-1.5 text-muted">{col?.name}</td>
                <td className="px-3 py-1.5">
                  <span className="flex items-center gap-1.5 text-muted">
                    <span className="h-2 w-2 rounded-full" style={{ background: PRIORITY_COLOR[t.priority] }} aria-hidden />
                    {PRIORITY_LABEL[t.priority]}
                  </span>
                </td>
                <td className="px-3 py-1.5">
                  {t.assigneeName ? (
                    <span className="flex items-center gap-1.5 text-text">
                      <Avatar name={t.assigneeName} size="sm" />
                      <span className="truncate">{t.assigneeName}</span>
                    </span>
                  ) : (
                    <span className="text-muted">Unassigned</span>
                  )}
                </td>
                <td className={cn('px-3 py-1.5 tabular-nums', isOverdue(t.dueDate, done) ? 'font-medium text-danger' : 'text-muted')}>{t.dueDate ? formatDue(t.dueDate) : ''}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {sorted.length > shown && (
        <button className="mt-3 text-sm text-primary hover:underline" onClick={() => setShown((n) => n + PAGE)}>
          Show {Math.min(PAGE, sorted.length - shown)} more of {sorted.length - shown}
        </button>
      )}
    </div>
  );
}
