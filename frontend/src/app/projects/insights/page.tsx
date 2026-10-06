import { requireSession } from '@/lib/session';
import { apiFetch } from '@/lib/api';
import type { InsightsData, MyStats, PmProject } from '@/lib/pm/types';
import { InsightsView } from '../_components/insights-view';

type Search = { range?: string; from?: string; to?: string; project?: string; member?: string };

export default async function InsightsPage({ searchParams }: { searchParams: Promise<Search> }) {
  const { token } = await requireSession();
  const sp = await searchParams;
  const query = new URLSearchParams();
  for (const k of ['range', 'from', 'to', 'project', 'member'] as const) if (sp[k]) query.set(k, sp[k] as string);

  const [insights, mine, projects, members] = await Promise.all([
    apiFetch<InsightsData>(`/pm/insights?${query}`, { token }),
    apiFetch<MyStats>('/pm/insights/me', { token }),
    apiFetch<PmProject[]>('/pm/projects', { token }),
    apiFetch<Array<{ id: string; fullName: string }>>('/pm/members', { token }),
  ]);

  return <InsightsView data={insights} mine={mine} projects={projects} members={members} params={sp} />;
}
