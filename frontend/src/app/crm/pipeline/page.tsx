import { KanbanSquare } from 'lucide-react';
import { requireSession } from '@/lib/session';
import { apiFetch } from '@/lib/api';
import { AppShell } from '@/components/app-shell';
import { PageHeader } from '@/components/ui/page-header';
import { Metric, MetricStrip } from '@/components/ui/property-row';
import { formatCurrency } from '@/lib/crm-format';
import type { KanbanBoard, LeadSource, SalesTeamMember } from '../types';
import { KanbanBoardView } from './kanban-board';
import { NewLeadPanel } from '../new-lead-panel';

interface UserSummary {
  id: string;
  fullName: string;
}

export default async function CrmPipelinePage() {
  const { token, user } = await requireSession();
  const [board, sources, team, users] = await Promise.all([
    apiFetch<KanbanBoard>('/crm/leads/kanban', { token }),
    apiFetch<LeadSource[]>('/crm/sources', { token }),
    apiFetch<SalesTeamMember[]>('/crm/team', { token }),
    apiFetch<UserSummary[]>('/users/team/status', { token }),
  ]);

  const nameById = new Map(users.map((u) => [u.id, u.fullName]));

  return (
    <AppShell user={user}>
      <PageHeader
        title="Sales Pipeline"
        icon={KanbanSquare}
        tone="purple"
        subtitle="Drag a card between stages, or use its Move-to menu."
        actions={<NewLeadPanel sources={sources} team={team} users={users} />}
      />

      <MetricStrip className="mb-6">
        <Metric label="Total leads" value={board.summary.totalLeads} />
        <Metric label="Pipeline value" value={formatCurrency(board.summary.pipelineValue)} />
        <Metric label="Won revenue" value={formatCurrency(board.summary.wonRevenue)} />
      </MetricStrip>

      <KanbanBoardView board={board} nameById={nameById} />
    </AppShell>
  );
}
