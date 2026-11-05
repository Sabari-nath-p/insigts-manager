'use client';

import { useState } from 'react';
import * as Menu from '@radix-ui/react-dropdown-menu';
import * as Popover from '@radix-ui/react-popover';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { PRIORITY_COLOR, PRIORITY_LABEL } from '@/lib/pm/format';
import type { PmColumn, PmMember, Priority } from '@/lib/pm/types';

const ITEM = 'flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-text outline-none data-[highlighted]:bg-black/[0.05]';
const CONTENT = 'z-[60] rounded-lg border border-border bg-surface p-1 outline-none';
const PRIORITIES: Priority[] = ['urgent', 'high', 'medium', 'low'];

/**
 * Appears at the bottom while cards are ticked. Every action here is applied to all ticked cards at once.
 * Assigning adds people to the cards; it never takes anyone off.
 */
export function SelectionBar({
  count,
  visibleCount,
  members,
  columns,
  onSelectAll,
  onClear,
  onDone,
  onAssign,
  onDue,
  onPriority,
  onMove,
}: {
  count: number;
  visibleCount: number;
  members: PmMember[];
  columns: PmColumn[];
  onSelectAll: () => void;
  onClear: () => void;
  onDone: () => void;
  onAssign: (ids: string[]) => Promise<void> | void;
  onDue: (date: string | null) => Promise<void> | void;
  onPriority: (priority: Priority) => Promise<void> | void;
  onMove: (columnId: string) => Promise<void> | void;
}) {
  const [busy, setBusy] = useState(false);
  const run = async (fn: () => Promise<void> | void) => {
    setBusy(true);
    try {
      await fn();
    } finally {
      setBusy(false);
    }
  };
  const none = count === 0;

  return (
    <div
      role="toolbar"
      aria-label="Actions for the selected tasks"
      className="fixed bottom-24 left-1/2 z-40 flex max-w-[94vw] -translate-x-1/2 flex-wrap items-center justify-center gap-2 rounded-xl border border-border bg-surface px-3 py-2.5"
      style={{ boxShadow: '0 8px 24px rgba(0,0,0,0.12)' }}
    >
      <span className="px-1 text-sm font-medium tabular-nums text-text">{count} selected</span>
      <button type="button" className="text-xs text-primary hover:underline" onClick={count < visibleCount ? onSelectAll : onClear}>
        {count < visibleCount ? `Select all ${visibleCount}` : 'Clear'}
      </button>
      <span className="mx-1 hidden h-5 w-px bg-border sm:block" aria-hidden />

      <AssignMany members={members} disabled={none || busy} onApply={(ids) => run(() => onAssign(ids))} />
      <DueMany disabled={none || busy} onApply={(date) => run(() => onDue(date))} />

      <Menu.Root>
        <Menu.Trigger asChild>
          <Button variant="secondary" size="sm" disabled={none || busy}>
            Priority
          </Button>
        </Menu.Trigger>
        <Menu.Portal>
          <Menu.Content side="top" align="center" sideOffset={8} className={`${CONTENT} min-w-36`}>
            {PRIORITIES.map((p) => (
              <Menu.Item key={p} className={ITEM} onSelect={() => run(() => onPriority(p))}>
                <span className="h-2 w-2 rounded-full" style={{ background: PRIORITY_COLOR[p] }} aria-hidden />
                {PRIORITY_LABEL[p]}
              </Menu.Item>
            ))}
          </Menu.Content>
        </Menu.Portal>
      </Menu.Root>

      <Menu.Root>
        <Menu.Trigger asChild>
          <Button variant="secondary" size="sm" disabled={none || busy}>
            Move to
          </Button>
        </Menu.Trigger>
        <Menu.Portal>
          <Menu.Content side="top" align="center" sideOffset={8} className={`${CONTENT} min-w-40`}>
            {columns.map((c) => (
              <Menu.Item key={c.id} className={ITEM} onSelect={() => run(() => onMove(c.id))}>
                {c.name}
              </Menu.Item>
            ))}
          </Menu.Content>
        </Menu.Portal>
      </Menu.Root>

      <Button size="sm" onClick={onDone}>
        Done
      </Button>
    </div>
  );
}

function AssignMany({ members, disabled, onApply }: { members: PmMember[]; disabled: boolean; onApply: (ids: string[]) => Promise<void> | void }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [chosen, setChosen] = useState<Set<string>>(new Set());

  const text = query.trim().toLowerCase();
  const shown = text ? members.filter((m) => m.fullName.toLowerCase().includes(text) || m.email.toLowerCase().includes(text)) : members;

  return (
    <Popover.Root
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) {
          setQuery('');
          setChosen(new Set());
        }
      }}
    >
      <Popover.Trigger asChild>
        <Button variant="secondary" size="sm" disabled={disabled}>
          Assign
        </Button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content side="top" align="center" sideOffset={8} className={`${CONTENT} w-64`}>
          <p className="px-2 pb-1 pt-1.5 text-[11px] font-medium uppercase tracking-wide text-muted">Add to every selected task</p>
          <div className="px-1 pb-1">
            <input
              autoFocus
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search people"
              aria-label="Search people"
              className="h-8 w-full rounded-md border border-border bg-transparent px-2 text-sm text-text outline-none placeholder:text-muted focus:border-primary"
            />
          </div>
          <ul className="max-h-52 overflow-y-auto overscroll-contain thin-scrollbar">
            {shown.map((m) => (
              <li key={m.id}>
                <label className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm text-text hover:bg-black/5">
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-[color:var(--color-primary)]"
                    checked={chosen.has(m.id)}
                    onChange={() =>
                      setChosen((prev) => {
                        const next = new Set(prev);
                        if (next.has(m.id)) next.delete(m.id);
                        else next.add(m.id);
                        return next;
                      })
                    }
                  />
                  <Avatar name={m.fullName} size="sm" />
                  <span className="min-w-0 truncate">{m.fullName}</span>
                </label>
              </li>
            ))}
            {shown.length === 0 && <li className="px-2 py-2 text-sm text-muted">No one matches.</li>}
          </ul>
          <div className="flex justify-end px-1 pb-1 pt-1.5">
            <Button
              size="sm"
              disabled={chosen.size === 0}
              onClick={async () => {
                await onApply([...chosen]);
                setOpen(false);
              }}
            >
              Assign {chosen.size > 0 ? chosen.size : ''}
            </Button>
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

function DueMany({ disabled, onApply }: { disabled: boolean; onApply: (date: string | null) => Promise<void> | void }) {
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState('');
  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <Button variant="secondary" size="sm" disabled={disabled}>
          Due date
        </Button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content side="top" align="center" sideOffset={8} className={`${CONTENT} w-60 p-3`}>
          <p className="pb-2 text-[11px] font-medium uppercase tracking-wide text-muted">Due date for every selected task</p>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            aria-label="Due date"
            className="h-8 w-full rounded-md border border-border bg-surface px-2 text-sm text-text outline-none focus:border-primary"
          />
          <div className="mt-3 flex justify-between gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={async () => {
                await onApply(null);
                setOpen(false);
              }}
            >
              Clear date
            </Button>
            <Button
              size="sm"
              disabled={!date}
              onClick={async () => {
                await onApply(date);
                setOpen(false);
              }}
            >
              Set date
            </Button>
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
