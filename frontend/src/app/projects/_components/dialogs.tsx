'use client';

import { useEffect, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { Button } from '@/components/ui/button';

export function PromptDialog({
  open,
  onOpenChange,
  title,
  label,
  initial = '',
  submitLabel = 'Save',
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  title: string;
  label: string;
  initial?: string;
  submitLabel?: string;
  onSubmit: (value: string) => void | Promise<void>;
}) {
  const [value, setValue] = useState(initial);
  useEffect(() => {
    if (open) setValue(initial);
  }, [open, initial]);

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/30" />
        <Dialog.Content className="fixed left-1/2 top-[22vh] z-50 w-[min(92vw,380px)] -translate-x-1/2 rounded-lg border border-border bg-surface p-5 outline-none">
          <Dialog.Title className="mb-3 text-base font-semibold text-text">{title}</Dialog.Title>
          <Dialog.Description className="sr-only">{label}</Dialog.Description>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (!value.trim()) return;
              await onSubmit(value.trim());
              onOpenChange(false);
            }}
            className="flex flex-col gap-3"
          >
            <input autoFocus aria-label={label} value={value} maxLength={100} onChange={(e) => setValue(e.target.value)} className="rounded-md border border-border bg-transparent px-2.5 py-1.5 text-sm text-text outline-none focus:border-primary" />
            <div className="flex justify-end gap-2">
              <Button variant="secondary" size="sm" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={!value.trim()}>
                {submitLabel}
              </Button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  body,
  confirmLabel,
  danger,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  title: string;
  body: string;
  confirmLabel: string;
  danger?: boolean;
  onConfirm: () => void | Promise<void>;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/30" />
        <Dialog.Content className="fixed left-1/2 top-[22vh] z-50 w-[min(92vw,380px)] -translate-x-1/2 rounded-lg border border-border bg-surface p-5 outline-none">
          <Dialog.Title className="text-base font-semibold text-text">{title}</Dialog.Title>
          <Dialog.Description className="mt-2 text-sm text-muted">{body}</Dialog.Description>
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              variant={danger ? 'danger' : 'primary'}
              size="sm"
              onClick={async () => {
                await onConfirm();
                onOpenChange(false);
              }}
            >
              {confirmLabel}
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
