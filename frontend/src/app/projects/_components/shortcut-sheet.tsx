'use client';

import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';

const SHORTCUTS: Array<[string, string]> = [
  ['C', 'New task in this project'],
  ['/', 'Focus search'],
  ['Ctrl K', 'Command palette'],
  ['G then B', 'Go to board'],
  ['G then M', 'Go to My Work'],
  ['G then I', 'Go to Insights'],
  ['Esc', 'Close drawer or dialog'],
  ['?', 'Show this list'],
];

export function ShortcutSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/30" />
        <Dialog.Content className="fixed left-1/2 top-[18vh] z-50 w-[min(92vw,380px)] -translate-x-1/2 rounded-md border border-border bg-surface p-5 outline-none">
          <div className="mb-3 flex items-center justify-between">
            <Dialog.Title className="text-base font-semibold text-text">Keyboard shortcuts</Dialog.Title>
            <Dialog.Close aria-label="Close" className="text-muted hover:text-text">
              <X size={16} />
            </Dialog.Close>
          </div>
          <Dialog.Description className="sr-only">Shortcuts available in project management</Dialog.Description>
          <dl className="flex flex-col gap-2">
            {SHORTCUTS.map(([k, d]) => (
              <div key={k} className="flex items-center justify-between text-sm">
                <dt className="text-text">{d}</dt>
                <dd>
                  <kbd className="rounded-sm border border-border px-1.5 py-0.5 text-xs text-muted">{k}</kbd>
                </dd>
              </div>
            ))}
          </dl>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
