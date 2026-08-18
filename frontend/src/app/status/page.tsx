import { Users2 } from 'lucide-react';
import { requireSession } from '@/lib/session';
import { apiFetch } from '@/lib/api';
import { AppShell } from '@/components/app-shell';
import { PageHeader } from '@/components/ui/page-header';
import { StatusSelector } from './status-selector';
import { TeamStatusList, type TeamMember } from './team-status-list';

export default async function StatusPage() {
  const { token, user } = await requireSession();
  const team = await apiFetch<TeamMember[]>('/users/team/status', { token });
  const me = team.find((m) => m.id === user.userId);

  return (
    <AppShell user={user}>
      <PageHeader title="Team status" icon={Users2} tone="sky" subtitle="See where everyone is right now." />
      <StatusSelector current={me?.currentStatus ?? 'offline'} />
      <TeamStatusList team={team} />
    </AppShell>
  );
}
