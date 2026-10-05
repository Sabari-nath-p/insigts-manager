'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { usePathname, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import * as Dialog from '@radix-ui/react-dialog';
import { ArrowLeft, BarChart3, CheckSquare, Menu, Plus, Search, Users2, X } from 'lucide-react';
import { cn } from '@/lib/cn';
import { Avatar } from '@/components/ui/avatar';
import { pm, pollEvery } from '@/lib/pm/client';
import type { PmMe, PmProject } from '@/lib/pm/types';
import { NotificationsBell } from './notifications-bell';

// Opened on demand only, so they stay out of the initial bundle.
const CommandPalette = dynamic(() => import('./command-palette').then((m) => m.CommandPalette), { ssr: false });
const NewProjectDialog = dynamic(() => import('./new-project-dialog').then((m) => m.NewProjectDialog), { ssr: false });
const ShortcutSheet = dynamic(() => import('./shortcut-sheet').then((m) => m.ShortcutSheet), { ssr: false });

const LAST_PROJECT_KEY = 'pm:lastProject';

function isTyping(el: EventTarget | null): boolean {
  const t = el as HTMLElement | null;
  if (!t) return false;
  return t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable;
}

export function PmShell({ me, initialProjects, children }: { me: PmMe; initialProjects: PmProject[]; children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [newProjectOpen, setNewProjectOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const gPressed = useRef<number>(0);

  const { data: projects = initialProjects } = useQuery({
    queryKey: ['projects'],
    queryFn: () => pm<PmProject[]>('/projects'),
    initialData: initialProjects,
    refetchInterval: pollEvery(30_000),
  });
  const active = projects.filter((p) => p.status === 'active');

  // Remember the last board so "G then B" has somewhere to go.
  useEffect(() => {
    const m = pathname.match(/^\/projects\/([A-Z][A-Z0-9]+)$/);
    if (m) {
      try {
        localStorage.setItem(LAST_PROJECT_KEY, m[1]);
      } catch {
        /* storage unavailable */
      }
    }
  }, [pathname]);

  const goBoard = useCallback(() => {
    let key: string | null = null;
    try {
      key = localStorage.getItem(LAST_PROJECT_KEY);
    } catch {
      /* storage unavailable */
    }
    const target = active.find((p) => p.key === key) ?? active[0];
    router.push(target ? `/projects/${target.key}` : '/projects');
  }, [active, router]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteOpen((o) => !o);
        return;
      }
      if (e.metaKey || e.ctrlKey || e.altKey || isTyping(e.target)) return;
      const k = e.key.toLowerCase();
      if (gPressed.current && Date.now() - gPressed.current < 1200) {
        gPressed.current = 0;
        if (k === 'b') goBoard();
        else if (k === 'm') router.push('/projects/my-work');
        else if (k === 'i') router.push('/projects/insights');
        else return;
        e.preventDefault();
        return;
      }
      if (k === 'g') gPressed.current = Date.now();
      else if (k === '?') setSheetOpen(true);
      else if (k === '/') {
        const el = document.getElementById('pm-search') as HTMLInputElement | null;
        if (el) {
          e.preventDefault();
          el.focus();
        }
      } else if (k === 'c') {
        window.dispatchEvent(new CustomEvent('pm:new-task'));
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [goBoard, router]);

  const nav = (onNavigate?: () => void) => (
    <nav className="flex flex-1 flex-col gap-4 overflow-y-auto px-2.5 py-3 thin-scrollbar" aria-label="Projects">
      <div className="flex flex-col gap-0.5">
        <NavLink href="/projects/my-work" icon={CheckSquare} label="My Work" pathname={pathname} onNavigate={onNavigate} />
        <NavLink href="/projects/insights" icon={BarChart3} label="Insights" pathname={pathname} onNavigate={onNavigate} />
        <NavLink href="/projects/team" icon={Users2} label="Team" pathname={pathname} onNavigate={onNavigate} />
      </div>
      <div>
        <div className="mb-1 flex items-center justify-between px-2.5">
          <Link href="/projects" onClick={onNavigate} className="text-[11px] font-semibold uppercase tracking-wide text-muted hover:text-text">
            Projects
          </Link>
          <button
            aria-label="New project"
            className="flex h-5 w-5 items-center justify-center rounded-sm text-muted hover:bg-black/[0.05] hover:text-text dark:hover:bg-white/[0.08]"
            onClick={() => setNewProjectOpen(true)}
          >
            <Plus size={14} />
          </button>
        </div>
        <div className="flex flex-col gap-0.5">
          {active.map((p) => {
            const isActive = pathname === `/projects/${p.key}`;
            return (
              <Link
                key={p.id}
                href={`/projects/${p.key}`}
                onClick={onNavigate}
                className={cn(
                  'flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm',
                  isActive ? 'bg-primary-tint font-medium text-primary-dark' : 'text-text hover:bg-black/[0.04] dark:hover:bg-white/[0.06]',
                )}
              >
                <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: p.color }} aria-hidden />
                <span className="min-w-0 flex-1 truncate">{p.name}</span>
                <span className="text-xs tabular-nums text-muted">{p.openTasks ?? 0}</span>
              </Link>
            );
          })}
          {active.length === 0 && <p className="px-2.5 py-1 text-xs text-muted">No projects yet. Use + to add one.</p>}
        </div>
      </div>
    </nav>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-bg">
      <aside className="hidden w-60 shrink-0 flex-col border-r border-border bg-sidebar md:flex">
        <div className="flex h-14 items-center gap-2 border-b border-border px-4">
          <span className="text-sm font-semibold text-text">Projects</span>
        </div>
        {nav()}
        <div className="border-t border-border px-2.5 py-2">
          <Link href="/dashboard" className="flex items-center gap-2 rounded-md px-2.5 py-1.5 text-xs text-muted hover:bg-black/[0.04] hover:text-text dark:hover:bg-white/[0.06]">
            <ArrowLeft size={14} /> Back to Insights
          </Link>
        </div>
      </aside>

      <Dialog.Root open={mobileOpen} onOpenChange={setMobileOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-40 bg-black/30 md:hidden" />
          <Dialog.Content className="fixed inset-y-0 left-0 z-50 flex w-72 flex-col bg-sidebar outline-none md:hidden">
            <Dialog.Title className="sr-only">Navigation</Dialog.Title>
            <div className="flex h-14 items-center justify-between border-b border-border px-4">
              <span className="text-sm font-semibold text-text">Projects</span>
              <Dialog.Close className="flex h-8 w-8 items-center justify-center rounded-md text-muted hover:bg-black/[0.04]" aria-label="Close menu">
                <X size={18} />
              </Dialog.Close>
            </div>
            {nav(() => setMobileOpen(false))}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border bg-surface px-4">
          <button className="flex h-8 w-8 items-center justify-center rounded-md text-muted hover:bg-black/[0.04] md:hidden" aria-label="Open menu" onClick={() => setMobileOpen(true)}>
            <Menu size={18} />
          </button>
          <button
            onClick={() => setPaletteOpen(true)}
            className="flex h-8 w-full max-w-xs items-center gap-2 rounded-md border border-border px-2.5 text-sm text-muted hover:bg-black/[0.02]"
          >
            <Search size={14} />
            <span className="flex-1 text-left">Search</span>
            <kbd className="rounded-sm border border-border px-1 text-[10px]">Ctrl K</kbd>
          </button>
          <div className="ml-auto flex items-center gap-2">
            <NotificationsBell />
            <div className="flex items-center gap-2" title={`${me.name} (${me.role})`}>
              <Avatar name={me.name} size="sm" />
              <span className="hidden text-sm text-text sm:inline">{me.name}</span>
            </div>
          </div>
        </header>
        <main className="min-h-0 flex-1 overflow-hidden">{children}</main>
      </div>

      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} projects={active} onNewProject={() => setNewProjectOpen(true)} />
      <NewProjectDialog open={newProjectOpen} onOpenChange={setNewProjectOpen} />
      <ShortcutSheet open={sheetOpen} onOpenChange={setSheetOpen} />
    </div>
  );
}

function NavLink({
  href,
  icon: Icon,
  label,
  pathname,
  onNavigate,
}: {
  href: string;
  icon: typeof BarChart3;
  label: string;
  pathname: string;
  onNavigate?: () => void;
}) {
  const active = pathname === href;
  return (
    <Link
      href={href}
      onClick={onNavigate}
      className={cn(
        'flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm',
        active ? 'bg-primary-tint font-medium text-primary-dark' : 'text-text hover:bg-black/[0.04] dark:hover:bg-white/[0.06]',
      )}
    >
      <Icon size={16} className="shrink-0" />
      {label}
    </Link>
  );
}
