'use client';

import { useEffect, useRef, useState } from 'react';
import * as Popover from '@radix-ui/react-popover';
import { Plus, X } from 'lucide-react';
import { cn } from '@/lib/cn';
import { Avatar } from '@/components/ui/avatar';
import type { PmMember } from '@/lib/pm/types';

/**
 * Everyone on a task, as chips. People can be added with the "+" and removed with the "x", but the
 * last person has no "x": once a task has an owner it always keeps at least one.
 */
export function AssigneePicker({
  assignees,
  members,
  onChange,
}: {
  assignees: Array<{ id: string; name: string }>;
  members: PmMember[];
  onChange: (ids: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  // The highlighted row. Up and Down move it while the cursor stays in the search box; Enter picks it.
  const [active, setActive] = useState(0);
  const list = useRef<HTMLUListElement>(null);
  const ids = assignees.map((a) => a.id);
  const available = members.filter((m) => !ids.includes(m.id));
  const onlyOne = assignees.length === 1;

  const text = query.trim().toLowerCase();
  const matches = text ? available.filter((m) => m.fullName.toLowerCase().includes(text) || m.email.toLowerCase().includes(text)) : available;
  const current = Math.min(active, Math.max(matches.length - 1, 0));

  // Keep the highlighted row in view when the arrow keys move past the edge of a long list.
  useEffect(() => {
    list.current?.querySelector(`[data-index="${current}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [current, matches.length]);

  function choose(id: string) {
    onChange([...ids, id]);
    setOpen(false);
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Assignees">
      {assignees.map((a) => (
        <span key={a.id} className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface py-0.5 pl-0.5 pr-2.5 text-sm text-text">
          <Avatar name={a.name} size="sm" />
          <span className="max-w-[140px] truncate">{a.name}</span>
          {!onlyOne && (
            <button
              type="button"
              aria-label={`Remove ${a.name}`}
              onClick={() => onChange(ids.filter((id) => id !== a.id))}
              className="-mr-1 flex h-4 w-4 items-center justify-center rounded-full text-muted hover:bg-black/10 hover:text-text"
            >
              <X size={11} />
            </button>
          )}
        </span>
      ))}

      {/*
        modal: this list opens on top of the task drawer, which is itself a modal. Without its own modal layer the
        drawer swallows the mouse wheel, so a long list could not be scrolled.
      */}
      <Popover.Root
        modal
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) {
            setQuery('');
            setActive(0);
          }
        }}
      >
        <Popover.Trigger asChild>
          <button
            type="button"
            aria-label={assignees.length === 0 ? 'Assign someone' : 'Add another assignee'}
            disabled={available.length === 0}
            className="inline-flex h-7 items-center justify-center gap-1 rounded-full border border-dashed border-border px-2 text-xs text-muted hover:border-primary hover:text-text disabled:opacity-40"
          >
            <Plus size={13} />
            {assignees.length === 0 && <span className="pr-0.5">Assign</span>}
          </button>
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Content align="start" sideOffset={6} className="z-[70] w-64 rounded-lg border border-border bg-surface p-1 outline-none">
            <p className="px-2 pb-1 pt-1.5 text-[11px] font-medium uppercase tracking-wide text-muted">Add a person</p>
            <div className="px-1 pb-1">
              <input
                autoFocus
                type="search"
                role="combobox"
                aria-expanded="true"
                aria-controls="assignee-options"
                aria-activedescendant={matches[current] ? `assignee-option-${matches[current].id}` : undefined}
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setActive(0);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                    e.preventDefault();
                    if (matches.length === 0) return;
                    setActive((current + (e.key === 'ArrowDown' ? 1 : matches.length - 1)) % matches.length);
                  } else if (e.key === 'Home' && e.ctrlKey) {
                    setActive(0);
                  } else if (e.key === 'Enter' && matches[current]) {
                    e.preventDefault();
                    choose(matches[current].id);
                  }
                }}
                placeholder="Search people"
                aria-label="Search people"
                className="h-8 w-full rounded-md border border-border bg-transparent px-2 text-sm text-text outline-none placeholder:text-muted focus:border-primary"
              />
            </div>
            <ul id="assignee-options" role="listbox" ref={list} className="max-h-56 overflow-y-auto overscroll-contain thin-scrollbar">
              {matches.map((m, i) => (
                <li key={m.id} role="option" id={`assignee-option-${m.id}`} data-index={i} aria-selected={i === current}>
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => choose(m.id)}
                    onMouseMove={() => setActive(i)}
                    className={cn('flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-text', i === current ? 'bg-black/5 dark:bg-white/10' : '')}
                  >
                    <Avatar name={m.fullName} size="sm" />
                    <span className="min-w-0 truncate">{m.fullName}</span>
                  </button>
                </li>
              ))}
              {available.length === 0 && <li className="px-2 py-2 text-sm text-muted">Everyone is already on this task.</li>}
              {available.length > 0 && matches.length === 0 && <li className="px-2 py-2 text-sm text-muted">No one matches &ldquo;{query.trim()}&rdquo;.</li>}
            </ul>
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>
    </div>
  );
}
