'use client';

import { useState } from 'react';
import * as Popover from '@radix-ui/react-popover';
import { Plus, X } from 'lucide-react';
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
  const ids = assignees.map((a) => a.id);
  const available = members.filter((m) => !ids.includes(m.id));
  const onlyOne = assignees.length === 1;

  const text = query.trim().toLowerCase();
  const matches = text ? available.filter((m) => m.fullName.toLowerCase().includes(text) || m.email.toLowerCase().includes(text)) : available;

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
          if (!next) setQuery('');
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
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  // Enter picks the first match, so typing a name and pressing Enter is enough.
                  if (e.key === 'Enter' && matches[0]) {
                    e.preventDefault();
                    choose(matches[0].id);
                  }
                }}
                placeholder="Search people"
                aria-label="Search people"
                className="h-8 w-full rounded-md border border-border bg-transparent px-2 text-sm text-text outline-none placeholder:text-muted focus:border-primary"
              />
            </div>
            <ul className="max-h-56 overflow-y-auto overscroll-contain thin-scrollbar">
              {matches.map((m) => (
                <li key={m.id}>
                  <button type="button" onClick={() => choose(m.id)} className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-text hover:bg-black/5">
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
