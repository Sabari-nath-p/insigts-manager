'use client';

import { usePathname } from 'next/navigation';
import { Bell, ChevronRight, Menu, Moon, Sun } from 'lucide-react';
import { useEffect, useState } from 'react';
import { findNavItem } from '@/lib/nav';
import { Avatar } from '@/components/ui/avatar';
import { Menu as DMenu, MenuTrigger, MenuContent, MenuItem, MenuLabel, MenuSeparator } from '@/components/ui/dropdown-menu';
import { SignOutButton } from '@/components/sign-out-button';
import { CommandSearch } from '@/components/command-search';
import type { SessionUser } from '@/lib/session';

function readCurrentTheme(): 'light' | 'dark' {
  const attr = document.documentElement.getAttribute('data-theme');
  if (attr === 'dark' || attr === 'light') return attr;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function Topbar({
  user,
  title,
  onOpenMobileNav,
}: {
  user: SessionUser;
  title?: string;
  onOpenMobileNav: () => void;
}) {
  const pathname = usePathname();
  const navItem = findNavItem(pathname);
  const crumb = title ?? navItem?.label ?? 'Insights';
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    setTheme(readCurrentTheme());
  }, []);

  function toggleTheme() {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
  }

  return (
    <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-border px-4 sm:px-6">
      <div className="flex min-w-0 items-center gap-2">
        <button
          type="button"
          onClick={onOpenMobileNav}
          className="flex h-8 w-8 items-center justify-center rounded-md text-muted hover:bg-black/[0.04] dark:hover:bg-white/[0.06] md:hidden"
          aria-label="Open navigation"
        >
          <Menu size={18} />
        </button>
        <div className="flex min-w-0 items-center gap-1.5 text-sm text-muted">
          <span className="hidden sm:inline">Insights HRMS</span>
          <ChevronRight size={14} className="hidden shrink-0 sm:inline" />
          <span className="truncate font-medium text-text">{crumb}</span>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        <div className="hidden sm:block">
          <CommandSearch />
        </div>
        <button
          type="button"
          className="flex h-8 w-8 items-center justify-center rounded-md text-muted transition-colors hover:bg-black/[0.04] dark:hover:bg-white/[0.06]"
          aria-label="Notifications"
        >
          <Bell size={17} />
        </button>

        <DMenu>
          <MenuTrigger asChild>
            <button type="button" className="flex items-center gap-2 rounded-md px-1.5 py-1 hover:bg-black/[0.04] dark:hover:bg-white/[0.06]">
              <Avatar name={user.email} size="sm" />
              <span className="hidden text-left leading-tight md:block">
                <span className="block text-xs font-medium text-text">{user.email}</span>
                <span className="block text-[11px] capitalize text-muted">{user.role.replace('_', ' ')}</span>
              </span>
            </button>
          </MenuTrigger>
          <MenuContent>
            <MenuLabel>{user.email}</MenuLabel>
            <MenuSeparator />
            <MenuItem onSelect={toggleTheme}>
              {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
              {theme === 'dark' ? 'Light mode' : 'Dark mode'}
            </MenuItem>
            <MenuSeparator />
            <div className="px-1 py-0.5">
              <SignOutButton className="w-full rounded px-2.5 py-1.5 text-left text-sm text-danger transition-colors hover:bg-danger-bg" />
            </div>
          </MenuContent>
        </DMenu>
      </div>
    </header>
  );
}
