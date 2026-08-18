'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import * as Dialog from '@radix-ui/react-dialog';
import { Search } from 'lucide-react';
import { ALL_NAV_ITEMS } from '@/lib/nav';

export function CommandSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const router = useRouter();

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  useEffect(() => {
    if (!open) setQuery('');
  }, [open]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return ALL_NAV_ITEMS;
    return ALL_NAV_ITEMS.filter((item) => item.label.toLowerCase().includes(q));
  }, [query]);

  function go(href: string) {
    setOpen(false);
    router.push(href);
  }

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <button
          type="button"
          className="flex w-40 items-center gap-2 rounded-md border border-border px-2.5 py-1.5 text-sm text-muted transition-colors hover:border-primary sm:w-56"
        >
          <Search size={14} />
          <span className="flex-1 text-left">Search</span>
          <kbd className="hidden rounded border border-border px-1 text-[10px] sm:inline">Ctrl K</kbd>
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/30" />
        <Dialog.Content
          className="fixed left-1/2 top-24 z-50 w-[92vw] max-w-lg -translate-x-1/2 rounded-lg border border-border bg-surface shadow-2xl outline-none"
          onOpenAutoFocus={(e) => {
            e.preventDefault();
            document.getElementById('command-search-input')?.focus();
          }}
        >
          <Dialog.Title className="sr-only">Search</Dialog.Title>
          <div className="flex items-center gap-2 border-b border-border px-4 py-3">
            <Search size={16} className="text-muted" />
            <input
              id="command-search-input"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Go to a page…"
              className="flex-1 bg-transparent text-sm text-text outline-none placeholder:text-muted"
            />
          </div>
          <div className="max-h-72 overflow-y-auto p-1.5">
            {results.length === 0 && <p className="px-3 py-4 text-sm text-muted">No pages found.</p>}
            {results.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.href}
                  type="button"
                  onClick={() => go(item.href)}
                  className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-left text-sm text-text transition-colors hover:bg-black/[0.04] dark:hover:bg-white/[0.06]"
                >
                  <Icon size={15} className="text-muted" />
                  {item.label}
                </button>
              );
            })}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
