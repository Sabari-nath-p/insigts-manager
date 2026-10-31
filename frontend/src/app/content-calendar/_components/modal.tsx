'use client';

import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';

/** The site's standard dialog frame: eyebrow, thin display title, close button, scrolls when tall. */
export function Modal({
  open,
  onOpenChange,
  eyebrow,
  title,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eyebrow: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/30" />
        <Dialog.Content
          aria-describedby={undefined}
          className="fixed left-1/2 top-[6vh] z-50 flex max-h-[88vh] w-[min(94vw,520px)] -translate-x-1/2 flex-col gap-5 overflow-y-auto rounded-xl border border-border bg-surface p-5 outline-none sm:p-6"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[12px] uppercase tracking-[0.72px] text-muted">{eyebrow}</p>
              <Dialog.Title className="mt-1 text-[28px] leading-tight text-text" style={{ fontWeight: 330 }}>
                {title}
              </Dialog.Title>
            </div>
            <Dialog.Close aria-label="Close" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted hover:bg-black/[0.05] hover:text-text dark:hover:bg-white/[0.08]">
              <X size={16} />
            </Dialog.Close>
          </div>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

/** Small round-cornered chip button used for suggestions. */
export function Chip({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="rounded-full border border-border bg-surface px-3 py-1 text-[12px] font-medium text-text transition-colors hover:border-primary">
      {children}
    </button>
  );
}
