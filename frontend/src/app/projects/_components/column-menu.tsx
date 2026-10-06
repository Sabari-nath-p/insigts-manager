'use client';

import { useState } from 'react';
import * as Menu from '@radix-ui/react-dropdown-menu';
import { MoreHorizontal } from 'lucide-react';
import { pm } from '@/lib/pm/client';
import type { PmColumn } from '@/lib/pm/types';
import { ConfirmDialog, PromptDialog } from './dialogs';
import { useToast } from './providers';

const ITEM = 'flex cursor-pointer items-center rounded-sm px-2 py-1.5 text-sm text-text outline-none data-[highlighted]:bg-black/[0.05] data-[disabled]:opacity-40';

export function ColumnMenu({
  column,
  index,
  columns,
  onChanged,
}: {
  column: PmColumn;
  index: number;
  columns: PmColumn[];
  onChanged: () => void;
}) {
  const { toast } = useToast();
  const [renaming, setRenaming] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function run(fn: () => Promise<unknown>) {
    try {
      await fn();
      onChanged();
    } catch (e) {
      toast((e as Error).message);
    }
  }

  // "After" the column two places to the left (or the very front) moves this one left, and so on.
  const moveLeft = () => run(() => pm(`/columns/${column.id}`, { method: 'PATCH', body: { afterColumnId: columns[index - 2]?.id ?? '' } }));
  const moveRight = () => run(() => pm(`/columns/${column.id}`, { method: 'PATCH', body: { afterColumnId: columns[index + 1]?.id } }));

  return (
    <>
      <Menu.Root>
        <Menu.Trigger asChild>
          <button aria-label={`${column.name} column options`} className="flex h-6 w-6 items-center justify-center rounded-sm text-muted hover:bg-black/[0.05] hover:text-text">
            <MoreHorizontal size={14} />
          </button>
        </Menu.Trigger>
        <Menu.Portal>
          <Menu.Content align="end" sideOffset={4} className="z-50 min-w-40 rounded-md border border-border bg-surface p-1">
            <Menu.Item className={ITEM} onSelect={() => setRenaming(true)}>
              Rename
            </Menu.Item>
            <Menu.Item className={ITEM} disabled={index === 0} onSelect={moveLeft}>
              Move left
            </Menu.Item>
            <Menu.Item className={ITEM} disabled={index === columns.length - 1} onSelect={moveRight}>
              Move right
            </Menu.Item>
            <Menu.Item className={`${ITEM} text-danger`} onSelect={() => setDeleting(true)}>
              Delete column
            </Menu.Item>
          </Menu.Content>
        </Menu.Portal>
      </Menu.Root>
      <PromptDialog
        open={renaming}
        onOpenChange={setRenaming}
        title="Rename column"
        label="Column name"
        initial={column.name}
        onSubmit={(name) => run(() => pm(`/columns/${column.id}`, { method: 'PATCH', body: { name } }))}
      />
      <ConfirmDialog
        open={deleting}
        onOpenChange={setDeleting}
        title={`Delete ${column.name}?`}
        body="Only empty columns can be deleted, and a project always keeps one Done column."
        confirmLabel="Delete"
        danger
        onConfirm={() => run(() => pm(`/columns/${column.id}`, { method: 'DELETE' }))}
      />
    </>
  );
}
