'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import * as Dialog from '@radix-ui/react-dialog';
import { BarChart3, CheckSquare, FolderKanban, Plus, Search, Users2 } from 'lucide-react';
import { pm, qs } from '@/lib/pm/client';
import type { PmProject } from '@/lib/pm/types';

interface Item {
  id: string;
  label: string;
  hint?: string;
  icon: typeof Search;
  run: () => void;
}

export function CommandPalette({
  open,
  onOpenChange,
  projects,
  onNewProject,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  projects: PmProject[];
  onNewProject: () => void;
}) {
  const router = useRouter();
  const [q, setQ] = useState('');
  const [cursor, setCursor] = useState(0);

  useEffect(() => {
    if (open) {
      setQ('');
      setCursor(0);
    }
  }, [open]);

  const { data: tasks = [] } = useQuery({
    queryKey: ['pm-search', q],
    queryFn: () => pm<Array<{ id: string; ref: string; projectKey: string; title: string }>>(`/search${qs({ q })}`),
    enabled: open && q.trim().length > 1,
    staleTime: 10_000,
  });

  const items = useMemo<Item[]>(() => {
    const go = (href: string) => () => {
      onOpenChange(false);
      router.push(href);
    };
    const text = q.trim().toLowerCase();
    const base: Item[] = [
      { id: 'mine', label: 'Assigned to me', icon: CheckSquare, run: go('/projects/my-work') },
      { id: 'insights', label: 'Insights', icon: BarChart3, run: go('/projects/insights') },
      { id: 'team', label: 'Team', icon: Users2, run: go('/projects/team') },
      {
        id: 'new-project',
        label: 'New project',
        icon: Plus,
        run: () => {
          onOpenChange(false);
          onNewProject();
        },
      },
    ].filter((i) => !text || i.label.toLowerCase().includes(text));
    const proj: Item[] = projects
      .filter((p) => !text || p.name.toLowerCase().includes(text) || p.key.toLowerCase().includes(text))
      .map((p) => ({ id: `p-${p.id}`, label: p.name, hint: p.key, icon: FolderKanban, run: go(`/projects/${p.key}`) }));
    const task: Item[] = tasks.map((t) => ({ id: `t-${t.id}`, label: t.title, hint: t.ref, icon: Search, run: go(`/projects/${t.projectKey}?task=${t.ref}`) }));
    return [...task, ...proj, ...base];
  }, [q, projects, tasks, router, onOpenChange, onNewProject]);

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setCursor((c) => Math.min(c + 1, items.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setCursor((c) => Math.max(c - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      items[cursor]?.run();
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/30" />
        <Dialog.Content className="fixed left-1/2 top-[15vh] z-50 w-[min(92vw,520px)] -translate-x-1/2 rounded-md border border-border bg-surface outline-none" onKeyDown={onKeyDown}>
          <Dialog.Title className="sr-only">Search</Dialog.Title>
          <Dialog.Description className="sr-only">Search tasks and projects, or jump somewhere</Dialog.Description>
          <input
            autoFocus
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setCursor(0);
            }}
            placeholder="Search tasks and projects"
            className="w-full border-b border-border bg-transparent px-4 py-3 text-sm text-text outline-none placeholder:text-muted"
          />
          <div className="max-h-80 overflow-y-auto p-1.5 thin-scrollbar" role="listbox">
            {items.length === 0 && <p className="px-3 py-6 text-center text-sm text-muted">No matches. Try a task title or a project name.</p>}
            {items.map((item, i) => (
              <button
                key={item.id}
                role="option"
                aria-selected={i === cursor}
                onMouseEnter={() => setCursor(i)}
                onClick={item.run}
                className={`flex w-full items-center gap-2.5 rounded-sm px-2.5 py-2 text-left text-sm text-text ${i === cursor ? 'bg-primary-tint' : ''}`}
              >
                <item.icon size={14} className="shrink-0 text-muted" />
                <span className="min-w-0 flex-1 truncate">{item.label}</span>
                {item.hint && <span className="text-xs tabular-nums text-muted">{item.hint}</span>}
              </button>
            ))}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
