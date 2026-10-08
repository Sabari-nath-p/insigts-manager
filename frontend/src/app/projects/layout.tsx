import Link from 'next/link';
import { requireSession } from '@/lib/session';
import { apiFetch } from '@/lib/api';
import type { PmMe, PmProject } from '@/lib/pm/types';
import { PmProviders } from './_components/providers';
import { PmShell } from './_components/pm-shell';

export const metadata = { title: 'Projects | Insights' };

export default async function ProjectsLayout({ children }: { children: React.ReactNode }) {
  const { token } = await requireSession();

  let me: PmMe;
  let projects: PmProject[];
  try {
    [me, projects] = await Promise.all([apiFetch<PmMe>('/pm/me', { token }), apiFetch<PmProject[]>('/pm/projects', { token })]);
  } catch (err) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-2 bg-bg px-6 text-center">
        <h1 className="text-lg font-semibold text-text">Projects is not available to you</h1>
        <p className="max-w-sm text-sm text-muted">{(err as Error).message}. Ask an admin to restore your access.</p>
        <Link href="/dashboard" className="mt-2 text-sm text-primary hover:underline">
          Back to HRMS
        </Link>
      </div>
    );
  }

  return (
    <PmProviders>
      <PmShell me={me} initialProjects={projects}>
        {children}
      </PmShell>
    </PmProviders>
  );
}
