'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronsLeft, ChevronsRight } from 'lucide-react';
import { NAV_SECTIONS, hasNavRole } from '@/lib/nav';
import { cn } from '@/lib/cn';
import { BrandMark } from './brand-mark';
import type { SessionUser } from '@/lib/session';

const COLLAPSE_KEY = 'insights_sidebar_collapsed';

function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function SidebarNav({ user, onNavigate }: { user: SessionUser; onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-1 flex-col gap-5 overflow-y-auto px-2.5 py-4 thin-scrollbar">
      {NAV_SECTIONS.filter((section) => hasNavRole(user.role, section.roles)).map((section) => (
        <div key={section.label}>
          <div className="mb-1 px-2.5 text-[11px] font-semibold uppercase tracking-wide text-muted">
            {section.label}
          </div>
          <div className="flex flex-col gap-0.5">
            {section.items
              .filter((item) => hasNavRole(user.role, item.roles))
              .map((item) => {
                const active = isActive(pathname, item.href);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onNavigate}
                    className={cn(
                      'flex items-center gap-2.5 rounded-full px-3 py-2 text-sm font-medium transition-colors',
                      active
                        ? 'bg-primary-tint text-primary-dark'
                        : 'text-text hover:bg-black/[0.04] dark:hover:bg-white/[0.06]',
                    )}
                  >
                    <Icon size={16} className="shrink-0" strokeWidth={2} />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
          </div>
        </div>
      ))}
    </nav>
  );
}

export function Sidebar({ user }: { user: SessionUser }) {
  const [collapsed, setCollapsed] = useState(false);
  const [ready, setReady] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setCollapsed(localStorage.getItem(COLLAPSE_KEY) === 'true');
    setReady(true);
  }, []);

  function toggle() {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem(COLLAPSE_KEY, String(next));
      return next;
    });
  }

  if (collapsed) {
    return (
      <aside
        className={cn(
          'hidden shrink-0 flex-col border-r border-border bg-sidebar md:flex',
          ready ? 'w-14' : 'w-14 opacity-0',
        )}
      >
        <div className="flex h-14 items-center justify-center border-b border-border">
          <BrandMark size={22} />
        </div>
        <nav className="flex flex-1 flex-col items-center gap-1 overflow-y-auto py-3">
          {NAV_SECTIONS.filter((section) => hasNavRole(user.role, section.roles)).flatMap((section) =>
            section.items
              .filter((item) => hasNavRole(user.role, item.roles))
              .map((item) => {
                const active = isActive(pathname, item.href);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    title={item.label}
                    className={cn(
                      'flex h-9 w-9 items-center justify-center rounded-md transition-colors',
                      active
                        ? 'bg-primary-tint text-primary-dark'
                        : 'text-muted hover:bg-black/[0.04] dark:hover:bg-white/[0.06]',
                    )}
                  >
                    <Icon size={17} strokeWidth={2} />
                  </Link>
                );
              }),
          )}
        </nav>
        <button
          type="button"
          onClick={toggle}
          title="Expand sidebar"
          className="flex h-12 items-center justify-center border-t border-border text-muted transition-colors hover:text-text"
        >
          <ChevronsRight size={16} />
        </button>
      </aside>
    );
  }

  return (
    <aside
      className={cn(
        'hidden w-60 shrink-0 flex-col border-r border-border bg-sidebar md:flex',
        !ready && 'opacity-0',
      )}
    >
      <div className="flex h-14 items-center gap-2 border-b border-border px-4">
        <BrandMark size={22} />
        <span className="text-sm font-semibold text-text">Insights HRMS</span>
      </div>
      <SidebarNav user={user} />
      <button
        type="button"
        onClick={toggle}
        className="flex items-center gap-2 border-t border-border px-4 py-3 text-xs font-medium text-muted transition-colors hover:text-text"
      >
        <ChevronsLeft size={15} />
        Collapse
      </button>
    </aside>
  );
}
