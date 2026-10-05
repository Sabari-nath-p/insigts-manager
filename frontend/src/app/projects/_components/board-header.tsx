'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import * as Menu from '@radix-ui/react-dropdown-menu';
import { Columns3, List, MoreHorizontal, Search, X } from 'lucide-react';
import { cn } from '@/lib/cn';
import { pm } from '@/lib/pm/client';
import { hasFilters } from '@/lib/pm/board-logic';
import type { BoardData, BoardFilters, PmMe } from '@/lib/pm/types';
import { ConfirmDialog, PromptDialog } from './dialogs';
import { useToast } from './providers';

const ITEM = 'flex cursor-pointer items-center rounded-sm px-2 py-1.5 text-sm text-text outline-none data-[highlighted]:bg-black/[0.05]';
const SELECT = 'h-8 rounded-md border border-border bg-surface px-2 text-sm text-text outline-none focus:border-primary';

export function BoardHeader({
  data,
  me,
  filters,
  view,
  setParam,
  clearFilters,
  onRefetch,
}: {
  data: BoardData;
  me: PmMe;
  filters: BoardFilters;
  view: 'board' | 'list';
  setParam: (key: string, value: string | null) => void;
  clearFilters: () => void;
  onRefetch: () => void;
}) {
  const router = useRouter();
  const qc = useQueryClient();
  const { toast } = useToast();
  const { project } = data;
  const [renaming, setRenaming] = useState(false);
  const [addingColumn, setAddingColumn] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const isAdmin = me.role === 'admin';
  const canArchive = isAdmin || project.createdBy === me.userId;

  async function run(fn: () => Promise<unknown>, after?: () => void) {
    try {
      await fn();
      qc.invalidateQueries({ queryKey: ['projects'] });
      onRefetch();
      after?.();
    } catch (e) {
      toast((e as Error).message);
    }
  }

  return (
    <div className="shrink-0 px-4 pb-3 pt-4">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="h-3 w-3 rounded-full" style={{ background: project.color }} aria-hidden />
        <h1 className="text-lg font-semibold text-text">{project.name}</h1>
        <span className="rounded-sm border border-border px-1.5 text-xs tabular-nums text-muted">{project.key}</span>
        {project.status === 'archived' && <span className="rounded-sm bg-[var(--badge-gray-bg)] px-1.5 text-xs text-muted">Archived</span>}

        <Menu.Root>
          <Menu.Trigger asChild>
            <button aria-label="Project options" className="flex h-7 w-7 items-center justify-center rounded-sm text-muted hover:bg-black/[0.05] hover:text-text">
              <MoreHorizontal size={16} />
            </button>
          </Menu.Trigger>
          <Menu.Portal>
            <Menu.Content align="start" sideOffset={4} className="z-50 min-w-44 rounded-md border border-border bg-surface p-1">
              {isAdmin && (
                <Menu.Item className={ITEM} onSelect={() => setRenaming(true)}>
                  Rename project
                </Menu.Item>
              )}
              <Menu.Item className={ITEM} onSelect={() => setAddingColumn(true)}>
                Add column
              </Menu.Item>
              {canArchive && (
                <Menu.Item className={ITEM} onSelect={() => run(() => pm(`/projects/${project.key}/${project.status === 'active' ? 'archive' : 'restore'}`, { method: 'POST' }))}>
                  {project.status === 'active' ? 'Archive project' : 'Restore project'}
                </Menu.Item>
              )}
              {isAdmin && (
                <Menu.Item className={`${ITEM} text-danger`} onSelect={() => setDeleting(true)}>
                  Delete project
                </Menu.Item>
              )}
            </Menu.Content>
          </Menu.Portal>
        </Menu.Root>

        <div className="ml-auto flex rounded-md border border-border p-0.5" role="group" aria-label="View">
          {(['board', 'list'] as const).map((v) => (
            <button
              key={v}
              aria-pressed={view === v}
              onClick={() => setParam('view', v === 'board' ? null : v)}
              className={cn('flex items-center gap-1.5 rounded-sm px-2 py-1 text-xs', view === v ? 'bg-primary-tint font-medium text-primary-dark' : 'text-muted hover:text-text')}
            >
              {v === 'board' ? <Columns3 size={13} /> : <List size={13} />}
              {v === 'board' ? 'Board' : 'List'}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search size={13} className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-muted" />
          <input
            id="pm-search"
            defaultValue={filters.q ?? ''}
            onChange={(e) => setParam('q', e.target.value || null)}
            placeholder="Filter tasks"
            aria-label="Filter tasks by text"
            className="h-8 w-40 rounded-md border border-border bg-surface pl-7 pr-2 text-sm text-text outline-none placeholder:text-muted focus:border-primary sm:w-48"
          />
        </div>
        <select aria-label="Assignee" className={SELECT} value={filters.assignee ?? ''} onChange={(e) => setParam('assignee', e.target.value || null)}>
          <option value="">Anyone</option>
          <option value="me">Me</option>
          <option value="none">Unassigned</option>
          {data.members.map((m) => (
            <option key={m.id} value={m.id}>
              {m.fullName}
            </option>
          ))}
        </select>
        <select aria-label="Priority" className={SELECT} value={filters.priority ?? ''} onChange={(e) => setParam('priority', e.target.value || null)}>
          <option value="">Any priority</option>
          <option value="urgent">Urgent</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
        <select aria-label="Label" className={SELECT} value={filters.label ?? ''} onChange={(e) => setParam('label', e.target.value || null)}>
          <option value="">Any label</option>
          {data.labels.map((l) => (
            <option key={l.id} value={l.id}>
              {l.name}
            </option>
          ))}
        </select>
        <select aria-label="Due date" className={SELECT} value={filters.due ?? ''} onChange={(e) => setParam('due', e.target.value || null)}>
          <option value="">Any due date</option>
          <option value="overdue">Overdue</option>
          <option value="week">Due this week</option>
        </select>
        {hasFilters(filters) && (
          <button onClick={clearFilters} className="flex h-8 items-center gap-1 rounded-md px-2 text-sm text-muted hover:text-text">
            <X size={13} /> Clear
          </button>
        )}
      </div>

      <PromptDialog
        open={renaming}
        onOpenChange={setRenaming}
        title="Rename project"
        label="Project name"
        initial={project.name}
        onSubmit={(name) => run(() => pm(`/projects/${project.key}`, { method: 'PATCH', body: { name } }))}
      />
      <PromptDialog
        open={addingColumn}
        onOpenChange={setAddingColumn}
        title="Add column"
        label="Column name"
        submitLabel="Add"
        onSubmit={(name) => run(() => pm(`/projects/${project.key}/columns`, { method: 'POST', body: { name, type: 'doing' } }))}
      />
      <ConfirmDialog
        open={deleting}
        onOpenChange={setDeleting}
        title={`Delete ${project.name}?`}
        body="This removes the project and every task, update and activity entry in it. It cannot be undone."
        confirmLabel="Delete project"
        danger
        onConfirm={() => run(() => pm(`/projects/${project.key}`, { method: 'DELETE' }), () => router.push('/projects'))}
      />
    </div>
  );
}
