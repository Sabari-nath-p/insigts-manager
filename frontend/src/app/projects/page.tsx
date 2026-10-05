import Link from 'next/link';
import { requireSession } from '@/lib/session';
import { apiFetch } from '@/lib/api';
import type { PmProject } from '@/lib/pm/types';

export default async function ProjectsIndex() {
  const { token } = await requireSession();
  const projects = await apiFetch<PmProject[]>('/pm/projects', { token });
  const active = projects.filter((p) => p.status === 'active');
  const archived = projects.filter((p) => p.status === 'archived');

  return (
    <div className="h-full overflow-y-auto px-5 py-6 sm:px-8">
      <div className="mx-auto max-w-3xl">
        <h1 className="text-xl font-semibold text-text">Projects</h1>
        {active.length === 0 ? (
          <p className="mt-4 text-sm text-muted">No projects yet. Use the + next to Projects in the sidebar to create one.</p>
        ) : (
          <ul className="mt-4 divide-y divide-border rounded-md border border-border bg-surface">
            {active.map((p) => (
              <li key={p.id}>
                <Link href={`/projects/${p.key}`} className="flex items-center gap-3 px-4 py-3 hover:bg-black/[0.02]">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: p.color }} aria-hidden />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-text">{p.name}</span>
                    {p.description && <span className="block truncate text-xs text-muted">{p.description}</span>}
                  </span>
                  <span className="text-xs tabular-nums text-muted">{p.key}</span>
                  <span className="w-16 text-right text-xs tabular-nums text-muted">{p.openTasks ?? 0} open</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
        {archived.length > 0 && (
          <>
            <h2 className="mt-8 text-sm font-semibold text-muted">Archived</h2>
            <ul className="mt-2 divide-y divide-border rounded-md border border-border bg-surface">
              {archived.map((p) => (
                <li key={p.id}>
                  <Link href={`/projects/${p.key}`} className="flex items-center gap-3 px-4 py-2.5 text-sm text-muted hover:bg-black/[0.02]">
                    <span className="min-w-0 flex-1 truncate">{p.name}</span>
                    <span className="text-xs tabular-nums">{p.key}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}
