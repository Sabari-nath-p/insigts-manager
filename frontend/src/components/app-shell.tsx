'use client';

import { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { Sidebar, SidebarNav } from './sidebar';
import { Topbar } from './topbar';
import { BrandMark } from './brand-mark';
import { cn } from '@/lib/cn';
import type { SessionUser } from '@/lib/session';

export function AppShell({
  user,
  title,
  wide = false,
  children,
}: {
  user: SessionUser;
  title?: string;
  /** Uses the full width of the screen instead of the usual reading width. For pages built around a big grid. */
  wide?: boolean;
  children: React.ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-bg">
      <Sidebar user={user} />

      <Dialog.Root open={mobileOpen} onOpenChange={setMobileOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-40 bg-black/30 md:hidden" />
          <Dialog.Content className="fixed inset-y-0 left-0 z-50 flex w-72 flex-col bg-sidebar outline-none md:hidden">
            <Dialog.Title className="sr-only">Navigation</Dialog.Title>
            <div className="flex h-14 items-center justify-between border-b border-border px-4">
              <div className="flex items-center gap-2">
                <BrandMark size={22} />
                <span className="text-sm font-semibold text-text">Insights HRMS</span>
              </div>
              <Dialog.Close className="flex h-8 w-8 items-center justify-center rounded-md text-muted hover:bg-black/[0.04] dark:hover:bg-white/[0.06]">
                <X size={18} />
              </Dialog.Close>
            </div>
            <SidebarNav user={user} onNavigate={() => setMobileOpen(false)} />
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar user={user} title={title} onOpenMobileNav={() => setMobileOpen(true)} />
        <main className="flex-1 overflow-y-auto">
          <div className={cn('mx-auto w-full px-5 sm:px-8', wide ? 'max-w-[1800px] py-5' : 'max-w-4xl py-8')}>{children}</div>
        </main>
      </div>
    </div>
  );
}
