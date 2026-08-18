'use client';

import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';

export function Panel({
  open,
  onOpenChange,
  title,
  description,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/20 transition-opacity duration-150 data-[state=closed]:opacity-0 data-[state=open]:opacity-100" />
        <Dialog.Content
          className="fixed inset-y-0 right-0 z-50 flex w-full flex-col border-l border-border bg-surface shadow-xl outline-none transition-transform duration-200 ease-out data-[state=closed]:translate-x-full data-[state=open]:translate-x-0 sm:max-w-md"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
            <div>
              <Dialog.Title className="text-base font-semibold text-text">{title}</Dialog.Title>
              {description && (
                <Dialog.Description className="mt-0.5 text-sm text-muted">{description}</Dialog.Description>
              )}
            </div>
            <Dialog.Close className="shrink-0 rounded-md p-1.5 text-muted transition-colors hover:bg-black/5 dark:hover:bg-white/10">
              <X size={18} />
            </Dialog.Close>
          </div>
          <div className="flex-1 overflow-y-auto px-5 py-5">{children}</div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
